/**
 * Scheduling Service
 * Task 4.3, Subtask 1: Viewing Scheduler
 * As per plan lines 988-993
 * 
 * Handles:
 * - Agent availability management
 * - Available slot calculation
 * - Viewing booking
 * - Conflict detection
 */

import { createServiceLogger } from '../../utils/logger';
import { prisma } from '../../config/prisma-client';
import {
  AgentAvailability,
  AvailableTimeSlot,
  BookViewingRequest,
  RescheduleViewingRequest,
  ViewingWithDetails,
  ViewingStatus
} from '../../types/schedule';

const logger = createServiceLogger('SchedulingService');

// Forward declarations (to avoid circular dependency)
let reminderServiceInstance: any = null;
let confirmationServiceInstance: any = null;

export class SchedulingService {
  private readonly DEFAULT_VIEWING_DURATION = 60; // minutes
  private readonly DEFAULT_BUFFER = 30; // minutes
  private readonly DEFAULT_TIMEZONE = 'Africa/Cairo';

  /**
   * Set reminder service instance
   * Called by reminder service to avoid circular dependency
   */
  setReminderService(reminderService: any): void {
    reminderServiceInstance = reminderService;
  }

  /**
   * Set confirmation service instance
   * Called by confirmation service to avoid circular dependency
   */
  setConfirmationService(confirmationService: any): void {
    confirmationServiceInstance = confirmationService;
  }

  /**
   * Set agent availability settings
   * Task 4.3, Subtask 1: As per plan line 989
   */
  async setAgentAvailability(
    agentId: string,
    availability: AgentAvailability
  ): Promise<void> {
    logger.info('Setting agent availability', { agentId });

    // Validate availability data
    this.validateAvailability(availability);

    // Update agent settings
    await prisma.agent.update({
      where: { id: agentId },
      data: {
        settings: {
          availability,
        } as any,
      },
    });

    logger.info('Agent availability updated', { agentId });
  }

  /**
   * Get agent availability settings
   */
  async getAgentAvailability(agentId: string): Promise<AgentAvailability | null> {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { settings: true },
    });

    if (!agent || !agent.settings) {
      return null;
    }

    const settings = agent.settings as any;
    return settings.availability || null;
  }

  /**
   * Get available time slots for agent
   * Task 4.3, Subtask 1: As per plan line 990
   * 
   * @param agentId - Agent ID
   * @param startDate - Start date for slot search
   * @param endDate - End date for slot search
   * @param propertyId - Optional property ID (to check property-specific bookings)
   * @returns Array of available time slots
   */
  async getAvailableSlots(
    agentId: string,
    startDate: Date,
    endDate: Date,
    propertyId?: string
  ): Promise<AvailableTimeSlot[]> {
    logger.info('Getting available slots', {
      agentId,
      startDate,
      endDate,
      propertyId,
    });

    // Get agent availability settings
    const availability = await this.getAgentAvailability(agentId);
    if (!availability || !availability.slots || availability.slots.length === 0) {
      logger.warn('No availability configured for agent', { agentId });
      return [];
    }

    // Get existing bookings in date range
    const existingBookings = await prisma.scheduledViewing.findMany({
      where: {
        agentId,
        scheduledTime: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: ['scheduled', 'confirmed'],
        },
      },
      select: {
        scheduledTime: true,
        propertyId: true,
      },
    });

    // Generate all potential slots based on availability
    const potentialSlots = this.generatePotentialSlots(
      availability,
      startDate,
      endDate
    );

    // Filter out slots that conflict with existing bookings
    const availableSlots = potentialSlots.filter((slot) => {
      return !this.hasConflict(slot, existingBookings, availability);
    });

    logger.info('Available slots calculated', {
      agentId,
      totalSlots: potentialSlots.length,
      availableSlots: availableSlots.length,
    });

    return availableSlots.map((slot) => ({
      startTime: slot.startTime,
      endTime: slot.endTime,
      propertyId,
    }));
  }

  /**
   * Book a viewing
   * Task 4.3, Subtask 1: As per plan line 991-992
   * 
   * @param agentId - Agent ID
   * @param request - Booking request
   * @returns Created viewing with details
   */
  async bookViewing(
    agentId: string,
    request: BookViewingRequest
  ): Promise<ViewingWithDetails> {
    logger.info('Booking viewing', {
      agentId,
      propertyId: request.propertyId,
      scheduledTime: request.scheduledTime,
    });

    // Validate the requested time slot is available
    const isAvailable = await this.isSlotAvailable(
      agentId,
      request.scheduledTime,
      request.propertyId
    );

    if (!isAvailable) {
      throw new Error('Requested time slot is not available');
    }

    // Verify property exists and belongs to agent
    const property = await prisma.property.findFirst({
      where: {
        id: request.propertyId,
        agentId,
      },
    });

    if (!property) {
      throw new Error('Property not found or does not belong to agent');
    }

    // Verify conversation exists
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: request.conversationId,
        agentId,
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found or does not belong to agent');
    }

    // Create the viewing
    const viewing = await prisma.scheduledViewing.create({
      data: {
        agentId,
        conversationId: request.conversationId,
        propertyId: request.propertyId,
        customerPhone: request.customerPhone,
        customerName: request.customerName,
        scheduledTime: request.scheduledTime,
        durationMinutes: request.durationMinutes || this.DEFAULT_VIEWING_DURATION,
        status: 'scheduled',
        notes: request.notes,
      },
      include: {
        property: {
          select: {
            id: true,
            projectName: true,
            propertyType: true,
            city: true,
            district: true,
            address: true,
          },
        },
        agent: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            whatsappNumber: true,
          },
        },
      },
    });

    logger.info('Viewing booked successfully', {
      viewingId: viewing.id,
      agentId,
      propertyId: request.propertyId,
    });

    // Schedule reminders for the viewing (Task 4.3, Subtask 3)
    if (reminderServiceInstance) {
      try {
        await reminderServiceInstance.scheduleReminders(viewing.id, request.scheduledTime);
        logger.info('Reminders scheduled for viewing', { viewingId: viewing.id });
      } catch (error) {
        logger.error('Failed to schedule reminders', {
          error: error instanceof Error ? error.message : 'Unknown error',
          viewingId: viewing.id,
        });
        // Don't fail the booking if reminder scheduling fails
      }
    }

    const viewingDetails = this.mapToViewingWithDetails(viewing);

    // Send confirmation messages (Task 4.3 Fix #2: As per plan line 993)
    if (confirmationServiceInstance) {
      try {
        await confirmationServiceInstance.sendBookingConfirmations(viewingDetails);
        logger.info('Booking confirmations sent', { viewingId: viewing.id });
      } catch (error) {
        logger.error('Failed to send booking confirmations', {
          error: error instanceof Error ? error.message : 'Unknown error',
          viewingId: viewing.id,
        });
        // Don't fail the booking if confirmation sending fails
      }
    }

    return viewingDetails;
  }

  /**
   * Reschedule a viewing
   * Task 4.3, Subtask 3: As per plan line 1003
   */
  async rescheduleViewing(
    viewingId: string,
    agentId: string,
    request: RescheduleViewingRequest
  ): Promise<ViewingWithDetails> {
    logger.info('Rescheduling viewing', {
      viewingId,
      agentId,
      newScheduledTime: request.newScheduledTime,
    });

    // Get existing viewing
    const existing = await prisma.scheduledViewing.findFirst({
      where: {
        id: viewingId,
        agentId,
      },
    });

    if (!existing) {
      throw new Error('Viewing not found or does not belong to agent');
    }

    if (existing.status === 'cancelled' || existing.status === 'completed') {
      throw new Error(`Cannot reschedule a ${existing.status} viewing`);
    }

    // Check if new slot is available (excluding current viewing)
    const isAvailable = await this.isSlotAvailable(
      agentId,
      request.newScheduledTime,
      existing.propertyId,
      viewingId
    );

    if (!isAvailable) {
      throw new Error('Requested time slot is not available');
    }

    // Update the viewing
    const updated = await prisma.scheduledViewing.update({
      where: { id: viewingId },
      data: {
        scheduledTime: request.newScheduledTime,
        status: 'scheduled', // Reset to scheduled status
        reminderSent: false, // Reset reminder flag
        notes: request.notes || existing.notes,
      },
      include: {
        property: {
          select: {
            id: true,
            projectName: true,
            propertyType: true,
            city: true,
            district: true,
            address: true,
          },
        },
        agent: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            whatsappNumber: true,
          },
        },
      },
    });

    logger.info('Viewing rescheduled successfully', {
      viewingId,
      oldTime: existing.scheduledTime,
      newTime: request.newScheduledTime,
    });

    // Reschedule reminders (Task 4.3, Subtask 3)
    if (reminderServiceInstance) {
      try {
        await reminderServiceInstance.rescheduleReminders(viewingId, request.newScheduledTime);
        logger.info('Reminders rescheduled for viewing', { viewingId });
      } catch (error) {
        logger.error('Failed to reschedule reminders', {
          error: error instanceof Error ? error.message : 'Unknown error',
          viewingId,
        });
        // Don't fail the reschedule if reminder rescheduling fails
      }
    }

    const viewingDetails = this.mapToViewingWithDetails(updated);

    // Send reschedule confirmation (Task 4.3 Fix #2)
    if (confirmationServiceInstance) {
      try {
        await confirmationServiceInstance.sendRescheduleConfirmation(viewingDetails, existing.scheduledTime);
        logger.info('Reschedule confirmations sent', { viewingId });
      } catch (error) {
        logger.error('Failed to send reschedule confirmations', {
          error: error instanceof Error ? error.message : 'Unknown error',
          viewingId,
        });
      }
    }

    return viewingDetails;
  }

  /**
   * Cancel a viewing
   * Task 4.3, Subtask 3: As per plan line 1003
   */
  async cancelViewing(
    viewingId: string,
    agentId: string,
    reason?: string
  ): Promise<ViewingWithDetails> {
    logger.info('Cancelling viewing', { viewingId, agentId });

    const viewing = await prisma.scheduledViewing.findFirst({
      where: {
        id: viewingId,
        agentId,
      },
    });

    if (!viewing) {
      throw new Error('Viewing not found or does not belong to agent');
    }

    if (viewing.status === 'cancelled') {
      throw new Error('Viewing is already cancelled');
    }

    if (viewing.status === 'completed') {
      throw new Error('Cannot cancel a completed viewing');
    }

    // Update viewing status
    const updated = await prisma.scheduledViewing.update({
      where: { id: viewingId },
      data: {
        status: 'cancelled',
        notes: reason ? `${viewing.notes || ''}\nCancellation reason: ${reason}` : viewing.notes,
      },
      include: {
        property: {
          select: {
            id: true,
            projectName: true,
            propertyType: true,
            city: true,
            district: true,
            address: true,
          },
        },
        agent: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            whatsappNumber: true,
          },
        },
      },
    });

    logger.info('Viewing cancelled successfully', { viewingId });

    // Cancel scheduled reminders (Task 4.3, Subtask 3)
    if (reminderServiceInstance) {
      try {
        await reminderServiceInstance.cancelReminders(viewingId);
        logger.info('Reminders cancelled for viewing', { viewingId });
      } catch (error) {
        logger.error('Failed to cancel reminders', {
          error: error instanceof Error ? error.message : 'Unknown error',
          viewingId,
        });
        // Don't fail the cancellation if reminder cancellation fails
      }
    }

    const viewingDetails = this.mapToViewingWithDetails(updated);

    // Send cancellation notice (Task 4.3 Fix #2)
    if (confirmationServiceInstance) {
      try {
        await confirmationServiceInstance.sendCancellationNotice(viewingDetails, reason);
        logger.info('Cancellation notices sent', { viewingId });
      } catch (error) {
        logger.error('Failed to send cancellation notices', {
          error: error instanceof Error ? error.message : 'Unknown error',
          viewingId,
        });
      }
    }

    return viewingDetails;
  }

  /**
   * Get viewing by ID
   */
  async getViewingById(
    viewingId: string,
    agentId: string
  ): Promise<ViewingWithDetails | null> {
    const viewing = await prisma.scheduledViewing.findFirst({
      where: {
        id: viewingId,
        agentId,
      },
      include: {
        property: {
          select: {
            id: true,
            projectName: true,
            propertyType: true,
            city: true,
            district: true,
            address: true,
          },
        },
        agent: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            whatsappNumber: true,
          },
        },
      },
    });

    if (!viewing) {
      return null;
    }

    return this.mapToViewingWithDetails(viewing);
  }

  /**
   * Get all viewings for agent (with filters)
   */
  async getAgentViewings(
    agentId: string,
    filters?: {
      status?: ViewingStatus;
      startDate?: Date;
      endDate?: Date;
      propertyId?: string;
    }
  ): Promise<ViewingWithDetails[]> {
    const where: any = { agentId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.propertyId) {
      where.propertyId = filters.propertyId;
    }

    if (filters?.startDate || filters?.endDate) {
      where.scheduledTime = {
        ...(filters.startDate && { gte: filters.startDate }),
        ...(filters.endDate && { lte: filters.endDate }),
      };
    }

    const viewings = await prisma.scheduledViewing.findMany({
      where,
      include: {
        property: {
          select: {
            id: true,
            projectName: true,
            propertyType: true,
            city: true,
            district: true,
            address: true,
          },
        },
        agent: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            whatsappNumber: true,
          },
        },
      },
      orderBy: {
        scheduledTime: 'asc',
      },
    });

    return viewings.map((v) => this.mapToViewingWithDetails(v));
  }

  // ===== Private Helper Methods =====

  /**
   * Validate availability data
   */
  private validateAvailability(availability: AgentAvailability): void {
    if (!availability.timezone) {
      throw new Error('Timezone is required');
    }

    if (!availability.slots || availability.slots.length === 0) {
      throw new Error('At least one availability slot is required');
    }

    // Validate each slot
    for (const slot of availability.slots) {
      if (slot.dayOfWeek < 0 || slot.dayOfWeek > 6) {
        throw new Error('Invalid dayOfWeek (must be 0-6)');
      }

      if (!this.isValidTime(slot.startTime) || !this.isValidTime(slot.endTime)) {
        throw new Error('Invalid time format (must be HH:mm)');
      }

      if (slot.startTime >= slot.endTime) {
        throw new Error('Start time must be before end time');
      }
    }
  }

  /**
   * Validate time format (HH:mm)
   */
  private isValidTime(time: string): boolean {
    const regex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
    return regex.test(time);
  }

  /**
   * Generate potential slots based on availability settings
   */
  private generatePotentialSlots(
    availability: AgentAvailability,
    startDate: Date,
    endDate: Date
  ): AvailableTimeSlot[] {
    const slots: AvailableTimeSlot[] = [];
    const viewingDuration = availability.viewingDuration || this.DEFAULT_VIEWING_DURATION;
    const buffer = availability.bufferMinutes || this.DEFAULT_BUFFER;

    // Iterate through each day in the range
    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();

      // Find availability slots for this day of week
      const daySlots = availability.slots.filter((s) => s.dayOfWeek === dayOfWeek);

      for (const daySlot of daySlots) {
        // Parse start and end times
        const [startHour, startMinute] = daySlot.startTime.split(':').map(Number);
        const [endHour, endMinute] = daySlot.endTime.split(':').map(Number);

        // Create datetime for slot start
        let slotTime = new Date(currentDate);
        slotTime.setHours(startHour, startMinute, 0, 0);

        // Create datetime for slot end
        const slotEndTime = new Date(currentDate);
        slotEndTime.setHours(endHour, endMinute, 0, 0);

        // Generate time slots within this availability window
        while (slotTime.getTime() + viewingDuration * 60000 <= slotEndTime.getTime()) {
          // Skip past slots
          if (slotTime > new Date()) {
            const endTime = new Date(slotTime.getTime() + viewingDuration * 60000);
            slots.push({
              startTime: new Date(slotTime),
              endTime,
            });
          }

          // Move to next slot (viewing duration + buffer)
          slotTime = new Date(slotTime.getTime() + (viewingDuration + buffer) * 60000);
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return slots;
  }

  /**
   * Check if a slot conflicts with existing bookings
   */
  private hasConflict(
    slot: AvailableTimeSlot,
    existingBookings: { scheduledTime: Date; propertyId: string }[],
    availability: AgentAvailability
  ): boolean {
    const viewingDuration = availability.viewingDuration || this.DEFAULT_VIEWING_DURATION;
    const buffer = availability.bufferMinutes || this.DEFAULT_BUFFER;

    for (const booking of existingBookings) {
      const bookingStart = booking.scheduledTime.getTime();
      const bookingEnd = bookingStart + viewingDuration * 60000;
      const bookingWithBuffer = bookingEnd + buffer * 60000;

      const slotStart = slot.startTime.getTime();
      const slotEnd = slot.endTime.getTime();

      // Check for overlap
      if (
        (slotStart >= bookingStart && slotStart < bookingWithBuffer) ||
        (slotEnd > bookingStart && slotEnd <= bookingWithBuffer) ||
        (slotStart <= bookingStart && slotEnd >= bookingEnd)
      ) {
        return true; // Conflict found
      }
    }

    return false; // No conflict
  }

  /**
   * Check if a specific time slot is available
   */
  private async isSlotAvailable(
    agentId: string,
    scheduledTime: Date,
    propertyId: string,
    excludeViewingId?: string
  ): Promise<boolean> {
    // Get agent availability
    const availability = await this.getAgentAvailability(agentId);
    if (!availability) {
      return false;
    }

    const viewingDuration = availability.viewingDuration || this.DEFAULT_VIEWING_DURATION;
    const buffer = availability.bufferMinutes || this.DEFAULT_BUFFER;

    // Check if time falls within agent's availability
    const dayOfWeek = scheduledTime.getDay();
    const timeString = `${scheduledTime.getHours().toString().padStart(2, '0')}:${scheduledTime.getMinutes().toString().padStart(2, '0')}`;

    const hasAvailability = availability.slots.some((slot) => {
      return slot.dayOfWeek === dayOfWeek && timeString >= slot.startTime && timeString < slot.endTime;
    });

    if (!hasAvailability) {
      return false;
    }

    // Check for conflicts with existing bookings
    const endTime = new Date(scheduledTime.getTime() + (viewingDuration + buffer) * 60000);

    const where: any = {
      agentId,
      status: {
        in: ['scheduled', 'confirmed'],
      },
      scheduledTime: {
        gte: new Date(scheduledTime.getTime() - (viewingDuration + buffer) * 60000),
        lte: endTime,
      },
    };

    if (excludeViewingId) {
      where.id = { not: excludeViewingId };
    }

    const conflictingBookings = await prisma.scheduledViewing.count({ where });

    return conflictingBookings === 0;
  }

  /**
   * Map database viewing to ViewingWithDetails
   */
  private mapToViewingWithDetails(viewing: any): ViewingWithDetails {
    return {
      id: viewing.id,
      conversationId: viewing.conversationId,
      propertyId: viewing.propertyId,
      agentId: viewing.agentId,
      customerPhone: viewing.customerPhone,
      customerName: viewing.customerName,
      scheduledTime: viewing.scheduledTime,
      durationMinutes: viewing.durationMinutes || this.DEFAULT_VIEWING_DURATION,
      status: viewing.status,
      notes: viewing.notes,
      reminderSent: viewing.reminderSent,
      createdAt: viewing.createdAt,
      updatedAt: viewing.updatedAt,
      property: viewing.property,
      agent: viewing.agent,
    };
  }
}

// Singleton instance
export const schedulingService = new SchedulingService();
