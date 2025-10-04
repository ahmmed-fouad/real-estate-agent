/**
 * Agent Service
 * Eliminates duplication of agent database queries
 * 
 * Issue Fix: 7 identical agent lookup queries across controllers
 * Solution: Centralized service for all agent database operations
 */

import { Agent, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma-client';
import { createServiceLogger } from '../../utils/logger';

const logger = createServiceLogger('AgentService');

/**
 * Agent service for database operations
 * Single source of truth for agent queries
 */
export class AgentService {
  /**
   * Find agent by email
   * 
   * @param email - Agent email address
   * @param includePassword - Whether to include password hash (default: false)
   * @returns Agent or null if not found
   */
  static async findByEmail(
    email: string,
    includePassword: boolean = false
  ): Promise<Agent | null> {
    try {
      const agent = await prisma.agent.findUnique({
        where: { email },
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
          ...(includePassword && { passwordHash: true }),
        },
      });

      return agent as Agent | null;
    } catch (error) {
      logger.error('Error finding agent by email', {
        email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find agent by ID
   * 
   * @param id - Agent UUID
   * @returns Agent or null if not found
   */
  static async findById(id: string): Promise<Agent | null> {
    try {
      const agent = await prisma.agent.findUnique({
        where: { id },
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
        },
      });

      return agent as Agent | null;
    } catch (error) {
      logger.error('Error finding agent by ID', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Create new agent
   * 
   * @param data - Agent creation data
   * @returns Created agent
   */
  static async create(
    data: Prisma.AgentCreateInput
  ): Promise<Agent> {
    try {
      const agent = await prisma.agent.create({
        data,
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
        },
      });

      logger.info('Agent created', { agentId: agent.id, email: agent.email });

      return agent as Agent;
    } catch (error) {
      logger.error('Error creating agent', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Update agent
   * 
   * @param id - Agent UUID
   * @param data - Update data
   * @returns Updated agent
   */
  static async update(
    id: string,
    data: Prisma.AgentUpdateInput
  ): Promise<Agent> {
    try {
      const agent = await prisma.agent.update({
        where: { id },
        data,
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
        },
      });

      logger.info('Agent updated', { agentId: agent.id });

      return agent as Agent;
    } catch (error) {
      logger.error('Error updating agent', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Check if email already exists
   * Useful for registration validation
   * 
   * @param email - Email to check
   * @returns True if email exists
   */
  static async emailExists(email: string): Promise<boolean> {
    try {
      const count = await prisma.agent.count({
        where: { email },
      });

      return count > 0;
    } catch (error) {
      logger.error('Error checking email existence', {
        email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get agent statistics
   * 
   * @param agentId - Agent UUID
   * @returns Statistics object
   */
  static async getStatistics(agentId: string): Promise<{
    totalProperties: number;
    totalConversations: number;
    activeConversations: number;
    totalLeads: number;
  }> {
    try {
      const [
        totalProperties,
        totalConversations,
        activeConversations,
        totalLeads,
      ] = await Promise.all([
        prisma.property.count({ where: { agentId } }),
        prisma.conversation.count({ where: { agentId } }),
        prisma.conversation.count({
          where: { agentId, status: 'active' },
        }),
        prisma.conversation.count({
          where: { agentId, leadQuality: { not: null } },
        }),
      ]);

      return {
        totalProperties,
        totalConversations,
        activeConversations,
        totalLeads,
      };
    } catch (error) {
      logger.error('Error getting agent statistics', {
        agentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}


