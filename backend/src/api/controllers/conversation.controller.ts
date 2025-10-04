/**
 * Conversation Management Controller
 * Handles conversation operations and exports
 * As per plan Task 3.1, Subtask 5: Conversation Management APIs (lines 730-737)
 * 
 * Endpoints:
 * - GET /api/conversations (line 732)
 * - GET /api/conversations/:id (line 733)
 * - POST /api/conversations/:id/takeover (line 734)
 * - POST /api/conversations/:id/close (line 735)
 * - GET /api/conversations/:id/export (line 736)
 */

import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { createServiceLogger } from '../../utils/logger';
import { AuthenticatedRequest } from '../../types/auth';
import { prisma } from '../../config/prisma-client';
import { sessionManager } from '../../services/session/session-manager.service';
import { ConversationState } from '../../services/session/types';
import { ErrorResponse, paginate } from '../../utils';
import {
  ListConversationsQuery,
  GetConversationParams,
  TakeoverConversationParams,
  CloseConversationParams,
  CloseConversationBody,
  ExportConversationParams,
  ExportConversationQuery,
} from '../validators/conversation.validators';

const logger = createServiceLogger('ConversationController');

/**
 * List conversations with pagination and filters
 * GET /api/conversations
 * As per plan line 732
 */
export const listConversations = async (
  req: AuthenticatedRequest<{}, {}, {}, ListConversationsQuery>,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;
    const {
      page,
      limit,
      status,
      leadQuality,
      search,
      sortBy,
      sortOrder,
    } = req.query;

    logger.info('Conversation list request', { agentId, page, limit });

    // Build filters
    const where: Prisma.ConversationWhereInput = {
      agentId,
      ...(status && status !== 'all' && { status }),
      ...(leadQuality && leadQuality !== 'all' && { leadQuality }),
      ...(search && {
        OR: [
          { customerName: { contains: search, mode: 'insensitive' } },
          { customerPhone: { contains: search } },
        ],
      }),
    };

    // Use pagination helper
    const result = await paginate(
      prisma.conversation,
      {
        where,
        include: {
          _count: {
            select: {
              messages: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
      },
      { page, limit }
    );

    logger.info('Conversations retrieved', {
      agentId,
      count: result.data.length,
      total: result.meta.total,
    });

    res.status(200).json({
      success: true,
      data: {
        conversations: result.data,
        pagination: result.meta,
      },
    });
  } catch (error) {
    return ErrorResponse.send(res, error, 'Failed to retrieve conversations', 500, { agentId: req.user.id });
  }
};

/**
 * Get conversation details with messages
 * GET /api/conversations/:id
 * As per plan line 733
 */
export const getConversation = async (
  req: AuthenticatedRequest<GetConversationParams>,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;
    const { id } = req.params;

    logger.info('Conversation retrieval', { agentId, conversationId: id });

    // Get conversation from database
    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        agentId, // Ensure agent can only access their own conversations
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        scheduledViewings: {
          orderBy: { scheduledTime: 'desc' },
        },
      },
    });

    if (!conversation) {
      logger.warn('Conversation not found', { agentId, conversationId: id });
      return ErrorResponse.notFound(res, 'The conversation does not exist or you do not have access to it');
    }

    // Try to get active session from Redis if conversation is active
    let activeSession = null;
    if (conversation.status === 'active' || conversation.status === 'waiting_agent') {
      try {
        activeSession = await sessionManager.getSession(conversation.customerPhone);
      } catch (sessionError) {
        logger.warn('Could not retrieve active session', {
          conversationId: id,
          error: sessionError instanceof Error ? sessionError.message : 'Unknown error',
        });
      }
    }

    logger.info('Conversation retrieved', { agentId, conversationId: id });

    res.status(200).json({
      success: true,
      data: {
        conversation,
        activeSession: activeSession ? {
          state: activeSession.state,
          lastActivity: activeSession.context.lastActivity,
          currentIntent: activeSession.context.currentIntent,
          extractedInfo: activeSession.context.extractedInfo,
          messageCount: activeSession.context.messageHistory.length,
        } : null,
      },
    });
  } catch (error) {
    return ErrorResponse.send(res, error, 'Failed to retrieve conversation', 500, {
      agentId: req.user.id,
      conversationId: req.params.id,
    });
  }
};

/**
 * Agent takes over conversation from AI
 * POST /api/conversations/:id/takeover
 * As per plan line 734
 */
export const takeoverConversation = async (
  req: AuthenticatedRequest<TakeoverConversationParams>,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;
    const { id } = req.params;

    logger.info('Conversation takeover attempt', { agentId, conversationId: id });

    // Get conversation
    const conversation = await prisma.conversation.findFirst({
      where: { id, agentId },
    });

    if (!conversation) {
      return ErrorResponse.notFound(res, 'Conversation not found');
    }

    // Update conversation status to WAITING_AGENT
    const updatedConversation = await prisma.conversation.update({
      where: { id },
      data: {
        status: 'waiting_agent',
        lastActivityAt: new Date(),
      },
    });

    // Try to update Redis session if exists
    try {
      const session = await sessionManager.getSession(conversation.customerPhone);
      if (session) {
        await sessionManager.updateState(session, ConversationState.WAITING_AGENT);
        logger.info('Session state updated to WAITING_AGENT', {
          conversationId: id,
          sessionId: session.id,
        });
      }
    } catch (sessionError) {
      logger.warn('Could not update session state', {
        conversationId: id,
        error: sessionError instanceof Error ? sessionError.message : 'Unknown error',
      });
    }

    // TODO: Send notification to WhatsApp customer (Phase 4)
    // "An agent will take over this conversation shortly"

    logger.info('Conversation takeover successful', { agentId, conversationId: id });

    res.status(200).json({
      success: true,
      message: 'Conversation taken over successfully',
      data: { conversation: updatedConversation },
    });
  } catch (error) {
    return ErrorResponse.send(res, error, 'Failed to takeover conversation', 500, {
      agentId: req.user.id,
      conversationId: req.params.id,
    });
  }
};

/**
 * Close conversation
 * POST /api/conversations/:id/close
 * As per plan line 735
 */
export const closeConversation = async (
  req: AuthenticatedRequest<CloseConversationParams, {}, CloseConversationBody>,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;
    const { id } = req.params;
    const { reason } = req.body;

    logger.info('Conversation close attempt', { agentId, conversationId: id, reason });

    // Get conversation
    const conversation = await prisma.conversation.findFirst({
      where: { id, agentId },
    });

    if (!conversation) {
      return ErrorResponse.notFound(res, 'Conversation not found');
    }

    // Update conversation status
    const metadata = (conversation.metadata as Record<string, any>) || {};
    const updatedConversation = await prisma.conversation.update({
      where: { id },
      data: {
        status: 'closed',
        closedAt: new Date(),
        lastActivityAt: new Date(),
        metadata: {
          ...metadata,
          ...(reason && { closeReason: reason }),
          closedBy: 'agent',
        },
      },
    });

    // Try to close Redis session if exists
    try {
      const session = await sessionManager.getSession(conversation.customerPhone);
      if (session) {
        await sessionManager.closeSession(session.id, reason);
        logger.info('Session closed', {
          conversationId: id,
          sessionId: session.id,
        });
      }
    } catch (sessionError) {
      logger.warn('Could not close session', {
        conversationId: id,
        error: sessionError instanceof Error ? sessionError.message : 'Unknown error',
      });
    }

    logger.info('Conversation closed successfully', { agentId, conversationId: id });

    res.status(200).json({
      success: true,
      message: 'Conversation closed successfully',
      data: { conversation: updatedConversation },
    });
  } catch (error) {
    return ErrorResponse.send(res, error, 'Failed to close conversation', 500, {
      agentId: req.user.id,
      conversationId: req.params.id,
    });
  }
};

/**
 * Export conversation transcript
 * GET /api/conversations/:id/export
 * As per plan line 736
 */
export const exportConversation = async (
  req: AuthenticatedRequest<ExportConversationParams, {}, {}, ExportConversationQuery>,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;
    const { id } = req.params;
    const { format } = req.query;

    logger.info('Conversation export request', { agentId, conversationId: id, format });

    // Get conversation with messages
    const conversation = await prisma.conversation.findFirst({
      where: { id, agentId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      return ErrorResponse.notFound(res, 'Conversation not found');
    }

    // Format based on requested format
    if (format === 'json') {
      res.status(200).json({
        success: true,
        data: {
          conversation: {
            id: conversation.id,
            customerName: conversation.customerName,
            customerPhone: conversation.customerPhone,
            status: conversation.status,
            leadScore: conversation.leadScore,
            leadQuality: conversation.leadQuality,
            startedAt: conversation.startedAt,
            closedAt: conversation.closedAt,
            messages: conversation.messages,
          },
        },
      });
    } else if (format === 'text') {
      // Plain text format
      const lines = [
        `Conversation Export`,
        `==================`,
        `Customer: ${conversation.customerName || 'Unknown'} (${conversation.customerPhone})`,
        `Started: ${conversation.startedAt.toISOString()}`,
        `Status: ${conversation.status}`,
        `Lead Quality: ${conversation.leadQuality || 'N/A'}`,
        ``,
        `Messages:`,
        `=========`,
        ``,
      ];

      for (const message of conversation.messages) {
        const timestamp = message.createdAt.toISOString();
        const role = message.role.toUpperCase();
        lines.push(`[${timestamp}] ${role}:`);
        lines.push(message.content);
        lines.push('');
      }

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="conversation-${id}.txt"`
      );
      res.status(200).send(lines.join('\n'));
    } else if (format === 'csv') {
      // CSV format
      const lines = [
        'Timestamp,Role,Message Type,Content',
      ];

      for (const message of conversation.messages) {
        const timestamp = message.createdAt.toISOString();
        const role = message.role;
        const type = message.messageType;
        const content = message.content.replace(/"/g, '""'); // Escape quotes
        lines.push(`"${timestamp}","${role}","${type}","${content}"`);
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="conversation-${id}.csv"`
      );
      res.status(200).send(lines.join('\n'));
    }

    logger.info('Conversation exported successfully', {
      agentId,
      conversationId: id,
      format,
    });
  } catch (error) {
    return ErrorResponse.send(res, error, 'Failed to export conversation', 500, {
      agentId: req.user.id,
      conversationId: req.params.id,
    });
  }
};

