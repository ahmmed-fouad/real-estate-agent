/**
 * Date/Time Parser Utility
 * Task 4.3 Fix #2: Natural language date/time parsing
 * Parses customer messages like "tomorrow at 3pm", "next Tuesday", etc.
 */

import { createServiceLogger } from './logger';

const logger = createServiceLogger('DateTimeParser');

export interface ParsedDateTime {
  success: boolean;
  date?: Date;
  confidence: number;
  originalText: string;
  parsedText?: string;
}

/**
 * Date/Time Parser Service
 * Extracts dates and times from natural language
 */
export class DateTimeParser {
  /**
   * Parse a message for date/time information
   */
  parseDateTime(message: string, referenceDate: Date = new Date()): ParsedDateTime {
    const lowerMessage = message.toLowerCase().trim();
    
    logger.debug('Parsing date/time from message', {
      message,
      messageLength: message.length,
    });

    // Try different parsing strategies
    let result = this.parseRelativeDates(lowerMessage, referenceDate);
    if (result.success) return result;

    result = this.parseSpecificDates(lowerMessage, referenceDate);
    if (result.success) return result;

    result = this.parseTimeOnly(lowerMessage, referenceDate);
    if (result.success) return result;

    result = this.parseArabicDates(lowerMessage, referenceDate);
    if (result.success) return result;

    // No date/time found
    return {
      success: false,
      confidence: 0,
      originalText: message,
    };
  }

  /**
   * Parse relative dates: "tomorrow", "today", "next week", etc.
   */
  private parseRelativeDates(message: string, referenceDate: Date): ParsedDateTime {
    const now = new Date(referenceDate);
    
    // Tomorrow
    if (message.includes('tomorrow') || message.includes('بكرة') || message.includes('غدا') || message.includes('غداً')) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const time = this.extractTime(message);
      if (time) {
        tomorrow.setHours(time.hours, time.minutes, 0, 0);
      } else {
        tomorrow.setHours(10, 0, 0, 0); // Default to 10 AM
      }
      
      return {
        success: true,
        date: tomorrow,
        confidence: 0.9,
        originalText: message,
        parsedText: 'tomorrow',
      };
    }

    // Today
    if (message.includes('today') || message.includes('اليوم') || message.includes('النهاردة')) {
      const today = new Date(now);
      const time = this.extractTime(message);
      if (time) {
        today.setHours(time.hours, time.minutes, 0, 0);
      } else {
        today.setHours(14, 0, 0, 0); // Default to 2 PM
      }
      
      return {
        success: true,
        date: today,
        confidence: 0.9,
        originalText: message,
        parsedText: 'today',
      };
    }

    // Day after tomorrow
    if (message.includes('day after tomorrow') || message.includes('بعد بكرة') || message.includes('بعد غد')) {
      const dayAfter = new Date(now);
      dayAfter.setDate(dayAfter.getDate() + 2);
      const time = this.extractTime(message);
      if (time) {
        dayAfter.setHours(time.hours, time.minutes, 0, 0);
      } else {
        dayAfter.setHours(10, 0, 0, 0);
      }
      
      return {
        success: true,
        date: dayAfter,
        confidence: 0.85,
        originalText: message,
        parsedText: 'day after tomorrow',
      };
    }

    // Next week
    if (message.includes('next week') || message.includes('الاسبوع الجاي') || message.includes('الأسبوع القادم')) {
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      const time = this.extractTime(message);
      if (time) {
        nextWeek.setHours(time.hours, time.minutes, 0, 0);
      }
      
      return {
        success: true,
        date: nextWeek,
        confidence: 0.7,
        originalText: message,
        parsedText: 'next week',
      };
    }

    return { success: false, confidence: 0, originalText: message };
  }

  /**
   * Parse specific day names: "Monday", "Tuesday", etc.
   */
  private parseSpecificDates(message: string, referenceDate: Date): ParsedDateTime {
    const now = new Date(referenceDate);
    const dayNames = [
      { en: ['sunday', 'sun'], ar: ['الحد', 'الأحد'], day: 0 },
      { en: ['monday', 'mon'], ar: ['الاتنين', 'الإثنين'], day: 1 },
      { en: ['tuesday', 'tue', 'tues'], ar: ['التلات', 'الثلاثاء'], day: 2 },
      { en: ['wednesday', 'wed'], ar: ['الاربع', 'الأربعاء'], day: 3 },
      { en: ['thursday', 'thu', 'thurs'], ar: ['الخميس'], day: 4 },
      { en: ['friday', 'fri'], ar: ['الجمعة'], day: 5 },
      { en: ['saturday', 'sat'], ar: ['السبت'], day: 6 },
    ];

    for (const dayInfo of dayNames) {
      const matchesEn = dayInfo.en.some(name => message.includes(name));
      const matchesAr = dayInfo.ar.some(name => message.includes(name));
      
      if (matchesEn || matchesAr) {
        // Find next occurrence of this day
        const targetDay = dayInfo.day;
        const currentDay = now.getDay();
        let daysToAdd = targetDay - currentDay;
        if (daysToAdd <= 0) daysToAdd += 7; // Next week

        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + daysToAdd);
        
        const time = this.extractTime(message);
        if (time) {
          targetDate.setHours(time.hours, time.minutes, 0, 0);
        } else {
          targetDate.setHours(10, 0, 0, 0);
        }
        
        return {
          success: true,
          date: targetDate,
          confidence: 0.85,
          originalText: message,
          parsedText: dayInfo.en[0],
        };
      }
    }

    return { success: false, confidence: 0, originalText: message };
  }

  /**
   * Parse time-only expressions (assume today or tomorrow)
   */
  private parseTimeOnly(message: string, referenceDate: Date): ParsedDateTime {
    const time = this.extractTime(message);
    if (!time) return { success: false, confidence: 0, originalText: message };

    const now = new Date(referenceDate);
    let targetDate = new Date(now);
    
    // If time has passed today, assume tomorrow
    if (time.hours < now.getHours() || (time.hours === now.getHours() && time.minutes <= now.getMinutes())) {
      targetDate.setDate(targetDate.getDate() + 1);
    }
    
    targetDate.setHours(time.hours, time.minutes, 0, 0);
    
    return {
      success: true,
      date: targetDate,
      confidence: 0.7,
      originalText: message,
      parsedText: `${time.hours}:${time.minutes}`,
    };
  }

  /**
   * Parse Arabic date expressions
   */
  private parseArabicDates(message: string, referenceDate: Date): ParsedDateTime {
    // Handle "بعد كام يوم" (in X days)
    const daysMatch = message.match(/بعد\s*(\d+)\s*يوم/);
    if (daysMatch) {
      const days = parseInt(daysMatch[1], 10);
      const targetDate = new Date(referenceDate);
      targetDate.setDate(targetDate.getDate() + days);
      
      const time = this.extractTime(message);
      if (time) {
        targetDate.setHours(time.hours, time.minutes, 0, 0);
      }
      
      return {
        success: true,
        date: targetDate,
        confidence: 0.85,
        originalText: message,
        parsedText: `in ${days} days`,
      };
    }

    return { success: false, confidence: 0, originalText: message };
  }

  /**
   * Extract time from message (supports 12h and 24h formats)
   */
  private extractTime(message: string): { hours: number; minutes: number } | null {
    // 12-hour format with AM/PM
    let match = message.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|ص|م)/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2] ? parseInt(match[2], 10) : 0;
      const period = match[3].toLowerCase();
      
      if ((period === 'pm' || period === 'م') && hours < 12) hours += 12;
      if ((period === 'am' || period === 'ص') && hours === 12) hours = 0;
      
      if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
        return { hours, minutes };
      }
    }

    // 24-hour format
    match = message.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      
      if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
        return { hours, minutes };
      }
    }

    // Hour only (e.g., "3" or "15")
    match = message.match(/\b(\d{1,2})\s*(o'?clock)?\b/);
    if (match) {
      let hours = parseInt(match[1], 10);
      
      // Assume PM for single-digit afternoon hours (2-9)
      if (hours >= 2 && hours <= 9 && !message.includes('am') && !message.includes('ص')) {
        hours += 12;
      }
      
      if (hours >= 0 && hours < 24) {
        return { hours, minutes: 0 };
      }
    }

    return null;
  }

  /**
   * Check if message contains any date/time reference
   */
  hasDateTimeReference(message: string): boolean {
    const result = this.parseDateTime(message);
    return result.success && result.confidence > 0.5;
  }

  /**
   * Find closest matching slot from available slots
   */
  findClosestSlot(parsedDateTime: ParsedDateTime, availableSlots: Date[]): Date | null {
    if (!parsedDateTime.success || !parsedDateTime.date) return null;

    const targetTime = parsedDateTime.date.getTime();
    let closestSlot: Date | null = null;
    let minDifference = Infinity;

    for (const slot of availableSlots) {
      const slotTime = slot.getTime();
      const difference = Math.abs(slotTime - targetTime);
      
      // Only consider slots within 2 hours of the requested time
      if (difference < 2 * 60 * 60 * 1000 && difference < minDifference) {
        minDifference = difference;
        closestSlot = slot;
      }
    }

    return closestSlot;
  }
}

// Export singleton instance
export const dateTimeParser = new DateTimeParser();
