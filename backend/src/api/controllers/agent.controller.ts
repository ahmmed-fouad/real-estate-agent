/**
 * Agent Management Controller
 * Handles agent profile and settings operations
 * As per plan Task 3.1, Subtask 2: Agent Management APIs (lines 705-711)
 * 
 * Endpoints:
 * - GET /api/agents/profile (line 707)
 * - PUT /api/agents/profile (line 708)
 * - GET /api/agents/stats (line 709)
 * - PUT /api/agents/settings (line 710)
 */

import { Response } from 'express';
import { createServiceLogger } from '../../utils/logger';
import { AuthenticatedRequest } from '../../types/auth';
import { prisma } from '../../config/prisma-client';
import { UpdateProfileData, UpdateSettingsData } from '../validators/agent.validators';
import { ErrorResponse } from '../../utils';
import { AgentService } from '../../services/agent/agent.service';

const logger = createServiceLogger('AgentController');

/**
 * Get agent profile
 * GET /api/agents/profile
 * As per plan line 707
 */
export const getProfile = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        companyName: true,
        whatsappNumber: true,
        status: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            properties: true,
            conversations: true,
          },
        },
      },
    });

    if (!agent) {
      return ErrorResponse.notFound(res, 'Agent not found');
    }

    logger.info('Profile retrieved', { agentId });

    res.status(200).json({
      success: true,
      data: { agent },
    });
  } catch (error) {
    return ErrorResponse.send(res, error, 'Failed to retrieve profile', 500, { agentId: req.user.id });
  }
};

/**
 * Update agent profile
 * PUT /api/agents/profile
 * As per plan line 708
 */
export const updateProfile = async (
  req: AuthenticatedRequest<{}, {}, UpdateProfileData>,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;
    const updateData = req.body;

    logger.info('Profile update attempt', { agentId, fields: Object.keys(updateData) });

    // Update agent using AgentService
    const agent = await AgentService.update(agentId, updateData);

    logger.info('Profile updated successfully', { agentId });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { agent },
    });
  } catch (error) {
    return ErrorResponse.send(res, error, 'Failed to update profile', 500, { agentId: req.user.id });
  }
};

/**
 * Get agent statistics
 * GET /api/agents/stats
 * As per plan line 709
 */
export const getStats = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;

    logger.info('Stats retrieval', { agentId });

    // Get stats using AgentService
    const stats = await AgentService.getStatistics(agentId);

    logger.info('Stats retrieved successfully', { agentId });

    res.status(200).json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    return ErrorResponse.send(res, error, 'Failed to retrieve statistics', 500, { agentId: req.user.id });
  }
};

/**
 * Update agent settings
 * PUT /api/agents/settings
 * As per plan line 710
 */
export const updateSettings = async (
  req: AuthenticatedRequest<{}, {}, UpdateSettingsData>,
  res: Response
): Promise<void> => {
  try {
    const agentId = req.user.id;
    const { settings } = req.body;

    logger.info('Settings update attempt', { agentId });

    // Get current agent
    const agent = await AgentService.findById(agentId);

    if (!agent) {
      return ErrorResponse.notFound(res, 'Agent not found');
    }

    // Merge settings
    const currentSettings = (agent.settings as Record<string, any>) || {};
    const updatedSettings = {
      ...currentSettings,
      ...settings,
    };

    // Update agent settings
    const updatedAgent = await AgentService.update(agentId, { settings: updatedSettings });

    logger.info('Settings updated successfully', { agentId });

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: { settings: updatedAgent.settings },
    });
  } catch (error) {
    return ErrorResponse.send(res, error, 'Failed to update settings', 500, { agentId: req.user.id });
  }
};


