/**
 * Scheduling Integration Service
 * Task 4.3 Fix #3: Integrate scheduling with AI conversation flow
 * As per plan lines 990-991: "AI suggests available slots", "Customer selects time"
 */

import { createServiceLogger } from '../../utils/logger';
import { schedulingService } from './scheduling.service';
import { arabicFormatterService } from '../language';
import { ConversationSession } from '../session/types';
import { dateTimeParser } from '../../utils/date-time-parser';
import { AvailableTimeSlot, ViewingWithDetails } from '../../types/schedule';
import { messageBuilderService } from './message-builder.service';

const logger = createServiceLogger('SchedulingIntegration');

/**
 * Scheduling Integration Service
 * Bridges AI conversation flow with scheduling system
 */
export class SchedulingIntegrationService {
  /**
   * Generate available slots message for customer
   * Task 4.3 Fix #3: As per plan line 990 "AI suggests available slots"
   */
  async generateAvailableSlotsMessage(
    agentId: string,
    propertyId?: string,
    language: 'ar' | 'en' | 'mixed' = 'mixed'
  ): Promise<string> {
    logger.info('Generating available slots message', { agentId, propertyId });

    try {
      // Get slots for next 7 days
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);

      const slots = await schedulingService.getAvailableSlots(
        agentId,
        startDate,
        endDate,
        propertyId
      );

      if (slots.length === 0) {
        return this.buildNoSlotsMessage(language);
      }

      // Group slots by date
      const slotsByDate = this.groupSlotsByDate(slots);

      // Build message
      return this.buildSlotsMessage(slotsByDate, language);
    } catch (error) {
      logger.error('Failed to generate slots message', {
        error: error instanceof Error ? error.message : 'Unknown error',
        agentId,
      });
      return this.buildErrorMessage(language);
    }
  }

  /**
   * Parse scheduling request from customer message
   * Task 4.3 Fix #2: Natural language date/time parsing
   */
  parseSchedulingRequest(message: string): {
    hasDatePreference: boolean;
    preferredDate?: Date;
    confidence: number;
    parsedText?: string;
  } {
    logger.debug('Parsing scheduling request', { message });
    
    const parseResult = dateTimeParser.parseDateTime(message);
    
    return {
      hasDatePreference: parseResult.success,
      preferredDate: parseResult.date,
      confidence: parseResult.confidence,
      parsedText: parseResult.parsedText,
    };
  }

  /**
   * Validate and find matching slot for customer's time preference
   * Task 4.3 Fix #5: Slot selection validation
   */
  async validateAndFindSlot(
    agentId: string,
    customerPreference: string,
    propertyId?: string
  ): Promise<{ success: boolean; slot?: Date; message: string }> {
    logger.info('Validating customer time preference', {
      agentId,
      customerPreference,
      propertyId,
    });

    try {
      // Parse customer's preference
      const parseResult = dateTimeParser.parseDateTime(customerPreference);

      if (!parseResult.success || !parseResult.date) {
        return {
          success: false,
          message: 'لم أتمكن من فهم الوقت المطلوب. هل يمكنك توضيحه؟\nI couldn\'t understand the time. Could you clarify?',
        };
      }

      // Get available slots around the preferred time
      const startDate = new Date(parseResult.date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(parseResult.date);
      endDate.setHours(23, 59, 59, 999);

      const availableSlots = await schedulingService.getAvailableSlots(
        agentId,
        startDate,
        endDate,
        propertyId
      );

      if (availableSlots.length === 0) {
        return {
          success: false,
          message: 'عذراً، لا توجد مواعيد متاحة في هذا اليوم. هل يمكنك اختيار يوم آخر؟\nSorry, no available slots on that day. Can you choose another day?',
        };
      }

      // Find closest slot to customer's preference
      const slotDates = availableSlots.map(s => s.startTime);
      const closestSlot = dateTimeParser.findClosestSlot(parseResult, slotDates);

      if (closestSlot) {
        return {
          success: true,
          slot: closestSlot,
          message: 'تم إيجاد موعد متاح!\nFound an available slot!',
        };
      } else {
        return {
          success: false,
          message: 'لم أجد موعداً متاحاً قريباً من الوقت المطلوب. هل يمكنك اختيار من المواعيد المتاحة؟\nNo slot available close to that time. Can you choose from available slots?',
        };
      }
    } catch (error) {
      logger.error('Failed to validate slot', {
        error: error instanceof Error ? error.message : 'Unknown error',
        agentId,
      });
      return {
        success: false,
        message: 'حدث خطأ في التحقق من المواعيد\nError checking availability',
      };
    }
  }

  /**
   * Create booking from conversation
   * Task 4.3 Fix #3: Handle booking creation during conversation
   */
  async createBookingFromConversation(
    session: ConversationSession,
    propertyId: string,
    scheduledTime: Date,
    customerName?: string
  ): Promise<{ success: boolean; viewingId?: string; error?: string }> {
    logger.info('Creating booking from conversation', {
      sessionId: session.id,
      propertyId,
      scheduledTime,
    });

    try {
      // Find conversation in database
      const { prisma } = await import('../../config/prisma-client');
      
      const conversation = await prisma.conversation.findFirst({
        where: {
          customerPhone: session.customerId,
          agentId: session.agentId,
          status: { not: 'closed' },
        },
        orderBy: { lastActivityAt: 'desc' },
      });

      if (!conversation) {
        throw new Error('No active conversation found');
      }

      // Create viewing booking
      const viewing = await schedulingService.bookViewing(session.agentId, {
        conversationId: conversation.id,
        propertyId,
        scheduledTime,
        customerPhone: session.customerId,
        customerName: customerName || session.context.extractedInfo.customerName,
        notes: 'Booked via WhatsApp conversation',
      });

      logger.info('Booking created successfully', {
        viewingId: viewing.id,
        sessionId: session.id,
      });

      return {
        success: true,
        viewingId: viewing.id,
      };
    } catch (error) {
      logger.error('Failed to create booking', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId: session.id,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create booking',
      };
    }
  }

  /**
   * Generate booking confirmation message for customer
   * Task 4.3 Final Fix: Use shared messageBuilderService (eliminate duplication)
   */
  async generateBookingConfirmationMessage(
    viewingId: string,
    language: 'ar' | 'en' | 'mixed' = 'mixed'
  ): Promise<string> {
    logger.info('Generating booking confirmation message', { viewingId, language });

    // Fetch the viewing details
    const { prisma } = await import('../../config/prisma-client');
    const viewing = await prisma.scheduledViewing.findUnique({
      where: { id: viewingId },
      include: {
        property: true,
        agent: true,
      },
    });

    if (!viewing || !viewing.property || !viewing.agent) {
      logger.warn('Viewing not found or incomplete', { viewingId });
      return 'تم الحجز بنجاح!\nBooking confirmed!';
    }

    // Use shared message builder service (eliminates 50+ lines of duplication)
    return messageBuilderService.buildCustomerConfirmation(viewing as ViewingWithDetails);
  }

  // ===== Private Helper Methods =====

  /**
   * Detect date/time mentions in message
   */
  private detectDateMention(message: string): boolean {
    const datePatterns = [
      /tomorrow|غدا|بكرة/i,
      /today|اليوم|النهاردة/i,
      /monday|tuesday|wednesday|thursday|friday|saturday|sunday/i,
      /الاثنين|الثلاثاء|الأربعاء|الخميس|الجمعة|السبت|الأحد/i,
      /\d{1,2}[/-]\d{1,2}/,
      /morning|afternoon|evening|صباح|ظهر|مساء/i,
    ];

    return datePatterns.some((pattern) => pattern.test(message));
  }

  /**
   * Group slots by date
   */
  private groupSlotsByDate(slots: Array<{ startTime: Date; endTime: Date }>): Map<string, Date[]> {
    const grouped = new Map<string, Date[]>();

    for (const slot of slots) {
      const dateKey = slot.startTime.toLocaleDateString('en-US');
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(slot.startTime);
    }

    return grouped;
  }

  /**
   * Build available slots message
   */
  private buildSlotsMessage(
    slotsByDate: Map<string, Date[]>,
    language: 'ar' | 'en' | 'mixed'
  ): string {
    const lines: string[] = [];

    if (language === 'ar') {
      lines.push('📅 المواعيد المتاحة للمعاينة:');
      lines.push('');
    } else if (language === 'en') {
      lines.push('📅 Available viewing slots:');
      lines.push('');
    } else {
      lines.push('📅 المواعيد المتاحة | Available Slots:');
      lines.push('');
    }

    let dayCount = 0;
    for (const [dateKey, times] of slotsByDate) {
      if (dayCount >= 3) break; // Show max 3 days

      const date = times[0];
      const formattedDate = arabicFormatterService.formatDate(date, language === 'ar' ? 'ar' : 'en', 'full');
      
      lines.push(`\n*${formattedDate}*`);

      // Show first 4 time slots for each day
      const displayTimes = times.slice(0, 4);
      for (const time of displayTimes) {
        const timeStr = time.toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
        lines.push(`• ${timeStr}`);
      }

      if (times.length > 4) {
        const more = times.length - 4;
        if (language === 'ar') {
          lines.push(`... و ${more} موعد آخر`);
        } else {
          lines.push(`... and ${more} more`);
        }
      }

      dayCount++;
    }

    lines.push('');
    if (language === 'ar') {
      lines.push('يرجى اختيار الموعد المناسب لك، أو أخبرني بموعد آخر تفضله.');
    } else if (language === 'en') {
      lines.push('Please select a suitable time, or let me know your preferred date/time.');
    } else {
      lines.push('يرجى اختيار الموعد المناسب | Please select a time.');
    }

    return lines.join('\n');
  }

  /**
   * Build no slots available message
   */
  private buildNoSlotsMessage(language: 'ar' | 'en' | 'mixed'): string {
    if (language === 'ar') {
      return 'عذراً، لا توجد مواعيد متاحة حالياً. يرجى التواصل مع الوكيل مباشرة لتحديد موعد مناسب.';
    } else if (language === 'en') {
      return 'Sorry, no viewing slots are currently available. Please contact the agent directly to schedule a viewing.';
    } else {
      return 'عذراً، لا توجد مواعيد متاحة حالياً. | Sorry, no slots available currently.\nيرجى التواصل مع الوكيل. | Please contact the agent.';
    }
  }

  /**
   * Build error message
   */
  private buildErrorMessage(language: 'ar' | 'en' | 'mixed'): string {
    if (language === 'ar') {
      return 'عذراً، حدث خطأ أثناء جلب المواعيد المتاحة. يرجى التواصل مع الوكيل مباشرة.';
    } else if (language === 'en') {
      return 'Sorry, there was an error retrieving available slots. Please contact the agent directly.';
    } else {
      return 'عذراً، حدث خطأ. | Sorry, an error occurred.\nيرجى التواصل مع الوكيل. | Please contact the agent.';
    }
  }
}

// Singleton instance
export const schedulingIntegrationService = new SchedulingIntegrationService();
