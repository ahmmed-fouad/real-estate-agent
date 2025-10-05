/**
 * Viewing Message Builder Service
 * Task 4.3 Fix #3 & #4: Extract duplicate message building logic and standardize formatting
 * Shared utilities for building bilingual viewing messages
 */

import { createServiceLogger } from '../../utils/logger';
import { arabicFormatterService } from '../language';
import { ViewingWithDetails } from '../../types/schedule';

const logger = createServiceLogger('MessageBuilder');

/**
 * Message Builder Service
 * Centralized message building for viewing confirmations and reminders
 */
export class MessageBuilderService {
  /**
   * Format date consistently (Task 4.3 Fix #4)
   */
  formatDate(date: Date): string {
    return arabicFormatterService.formatDate(date, 'ar', 'long');
  }

  /**
   * Format time consistently (Task 4.3 Fix #4)
   * Uses Arabic locale for ALL messages (confirmations and reminders)
   */
  formatTime(date: Date): string {
    return date.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  /**
   * Format location string (Task 4.3 Fix #3 - extracted common logic)
   */
  formatLocation(property: any): string {
    if (property.address) {
      return `${property.address}, ${property.district}, ${property.city}`;
    }
    return `${property.district}, ${property.city}`;
  }

  /**
   * Build property header (Task 4.3 Fix #3 - extracted common pattern)
   */
  buildPropertyHeader(property: any): string {
    const location = this.formatLocation(property);
    
    return `📍 ${property.projectName}
🏠 ${property.propertyType}
📌 ${location}`;
  }

  /**
   * Build customer confirmation message
   * Task 4.3 Fix #3 & #4: Uses shared formatting utilities
   */
  buildCustomerConfirmation(viewing: ViewingWithDetails): string {
    if (!viewing.property || !viewing.agent) {
      throw new Error('Viewing missing property or agent data');
    }

    const formattedDate = this.formatDate(viewing.scheduledTime);
    const formattedTime = this.formatTime(viewing.scheduledTime);
    const propertyHeader = this.buildPropertyHeader(viewing.property);

    return `✅ تم تأكيد الحجز | Booking Confirmed

مرحباً ${viewing.customerName || ''}! 👋
Hello ${viewing.customerName || ''}! 👋

تم حجز معاينة عقارك بنجاح:
Your property viewing has been successfully booked:

${propertyHeader}

📅 ${formattedDate}
🕐 ${formattedTime}
⏱️ Duration | المدة: ${viewing.durationMinutes} minutes | دقيقة

الوكيل: ${viewing.agent.fullName}
Agent: ${viewing.agent.fullName}
📞 ${viewing.agent.phoneNumber || viewing.agent.whatsappNumber}

${viewing.notes ? `📝 ملاحظات | Notes: ${viewing.notes}\n` : ''}
سنرسل لك تذكيراً قبل الموعد بـ 24 ساعة وساعتين.
We'll send you reminders 24 hours and 2 hours before the viewing.

إذا كنت بحاجة لإعادة الجدولة، يرجى إخبارنا.
If you need to reschedule, please let us know.

نتطلع لرؤيتك! 🏡
Looking forward to seeing you! 🏡`;
  }

  /**
   * Build agent notification message
   * Task 4.3 Fix #3 & #4: Uses shared formatting utilities
   */
  buildAgentNotification(viewing: ViewingWithDetails): string {
    if (!viewing.property || !viewing.agent) {
      throw new Error('Viewing missing property or agent data');
    }

    const formattedDate = this.formatDate(viewing.scheduledTime);
    const formattedTime = this.formatTime(viewing.scheduledTime);

    return `🔔 حجز معاينة جديد | New Viewing Booked

تم حجز معاينة جديدة:
A new viewing has been booked:

العقار | Property: ${viewing.property.projectName}
العميل | Customer: ${viewing.customerName || 'غير محدد | Not specified'}
الهاتف | Phone: ${viewing.customerPhone}

📅 ${formattedDate}
🕐 ${formattedTime}
⏱️ المدة | Duration: ${viewing.durationMinutes} دقيقة | minutes

${viewing.notes ? `📝 ملاحظات | Notes: ${viewing.notes}\n` : ''}
يرجى التأكد من جاهزيتك للموعد.
Please ensure you're ready for the appointment.`;
  }

  /**
   * Build 24h reminder message
   * Task 4.3 Fix #3 & #4: Uses shared formatting utilities
   */
  build24hReminder(viewing: any, scheduledTime: Date): string {
    const formattedDate = this.formatDate(scheduledTime);
    const formattedTime = this.formatTime(scheduledTime);
    const propertyHeader = this.buildPropertyHeader(viewing.property);

    return `⏰ تذكير بالمعاينة | Viewing Reminder

مرحباً ${viewing.customerName || ''}! 👋
Hello ${viewing.customerName || ''}! 👋

تذكير بمعاينة العقار غداً:
Reminder: Your property viewing is tomorrow:

${propertyHeader}

📅 ${formattedDate}
🕐 ${formattedTime}

الوكيل: ${viewing.agent.fullName}
Agent: ${viewing.agent.fullName}
📞 ${viewing.agent.phoneNumber || viewing.agent.whatsappNumber}

${viewing.notes ? `📝 ملاحظات | Notes: ${viewing.notes}\n` : ''}
سنرسل لك تذكيراً آخر قبل الموعد بساعتين.
We'll send another reminder 2 hours before the viewing.

إذا احتجت لإعادة الجدولة أو الإلغاء، يرجى إخبارنا.
If you need to reschedule or cancel, please let us know.

نتطلع لرؤيتك! 🏡
Looking forward to seeing you! 🏡`;
  }

  /**
   * Build 2h reminder message
   * Task 4.3 Fix #3 & #4: Uses shared formatting utilities
   */
  build2hReminder(viewing: any, scheduledTime: Date): string {
    const formattedTime = this.formatTime(scheduledTime);
    const location = this.formatLocation(viewing.property);

    return `⏰ تذكير عاجل | Urgent Reminder

مرحباً ${viewing.customerName || ''}! 👋
Hello ${viewing.customerName || ''}! 👋

معاينتك للعقار بعد ساعتين!
Your property viewing is in 2 hours!

🕐 ${formattedTime}
📍 ${viewing.property.projectName}
📌 ${location}

الوكيل: ${viewing.agent.fullName}
Agent: ${viewing.agent.fullName}
📞 ${viewing.agent.phoneNumber || viewing.agent.whatsappNumber}

نتمنى لك معاينة ممتعة! 🏡
Have a great viewing! 🏡`;
  }

  /**
   * Build reschedule confirmation message
   * Task 4.3 Fix #3 & #4: Uses shared formatting utilities
   */
  buildRescheduleConfirmation(viewing: ViewingWithDetails, oldTime: Date): string {
    if (!viewing.property || !viewing.agent) {
      throw new Error('Viewing missing property or agent data');
    }

    const oldFormattedDate = this.formatDate(oldTime);
    const oldFormattedTime = this.formatTime(oldTime);
    const newFormattedDate = this.formatDate(viewing.scheduledTime);
    const newFormattedTime = this.formatTime(viewing.scheduledTime);

    return `🔄 تم تغيير موعد المعاينة | Viewing Rescheduled

تم تغيير موعد معاينة العقار بنجاح:
Your property viewing has been rescheduled:

📍 ${viewing.property.projectName}

الموعد السابق | Previous:
📅 ${oldFormattedDate}
🕐 ${oldFormattedTime}

الموعد الجديد | New:
📅 ${newFormattedDate}
🕐 ${newFormattedTime}

الوكيل: ${viewing.agent.fullName}
Agent: ${viewing.agent.fullName}
📞 ${viewing.agent.phoneNumber || viewing.agent.whatsappNumber}

نتطلع لرؤيتك! 🏡
Looking forward to seeing you! 🏡`;
  }

  /**
   * Build cancellation notice
   * Task 4.3 Fix #3 & #4: Uses shared formatting utilities
   */
  buildCancellationNotice(viewing: ViewingWithDetails): string {
    if (!viewing.property) {
      throw new Error('Viewing missing property data');
    }

    const formattedDate = this.formatDate(viewing.scheduledTime);
    const formattedTime = this.formatTime(viewing.scheduledTime);

    return `❌ تم إلغاء المعاينة | Viewing Cancelled

تم إلغاء معاينة العقار:
Property viewing has been cancelled:

📍 ${viewing.property.projectName}
📅 ${formattedDate}
🕐 ${formattedTime}

إذا كنت ترغب في حجز موعد آخر، يرجى إخبارنا.
If you'd like to schedule another viewing, please let us know.

شكراً لك! 🏡
Thank you! 🏡`;
  }
}

// Export singleton instance
export const messageBuilderService = new MessageBuilderService();
