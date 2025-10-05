/**
 * Arabic Formatter Service
 * Task 4.2, Subtask 3: Arabic-Specific Handling
 * As per plan lines 971-975
 * 
 * Provides utilities for:
 * - Date formatting (bilingual)
 * - RTL text handling
 * - Localized common phrases
 * 
 * NOTE: Number formatting is handled by PriceFormatter utility to avoid duplication
 */

import { createServiceLogger } from '../../utils/logger';

const logger = createServiceLogger('ArabicFormatter');

/**
 * Arabic Formatter Service
 * Handles Arabic-specific text formatting
 * 
 * FIX: Removed number formatting duplication - use PriceFormatter instead
 */
export class ArabicFormatterService {

  /**
   * Format date for display based on language
   * Task 4.2, Subtask 3: As per plan line 974
   * 
   * @param date - Date to format
   * @param language - Target language ('ar' | 'en' | 'mixed')
   * @param format - Format style ('short' | 'long' | 'full')
   * @returns Formatted date string
   */
  formatDate(
    date: Date,
    language: 'ar' | 'en' | 'mixed' = 'en',
    format: 'short' | 'long' | 'full' = 'long'
  ): string {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      logger.warn('Invalid date for formatting', { date });
      return '';
    }

    const options: Intl.DateTimeFormatOptions = {
      short: { day: 'numeric', month: 'numeric', year: 'numeric' },
      long: { day: 'numeric', month: 'long', year: 'numeric' },
      full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
    }[format];

    if (language === 'ar') {
      return date.toLocaleDateString('ar-EG', options);
    } else if (language === 'mixed') {
      const englishDate = date.toLocaleDateString('en-US', options);
      const arabicDate = date.toLocaleDateString('ar-EG', options);
      return `${englishDate} (${arabicDate})`;
    }

    return date.toLocaleDateString('en-US', options);
  }

  /**
   * Format relative time (e.g., "2 days ago")
   * 
   * @param date - Date to format
   * @param language - Target language ('ar' | 'en' | 'mixed')
   * @returns Relative time string
   */
  formatRelativeTime(date: Date, language: 'ar' | 'en' | 'mixed' = 'en'): string {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return '';
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    // FIX: Use toLocaleString for Arabic numbers instead of manual mapping
    const formatNumber = (n: number, lang: 'ar' | 'en') => {
      return lang === 'ar' ? n.toLocaleString('ar-EG') : n.toString();
    };

    const translations = {
      ar: {
        justNow: 'الآن',
        secondsAgo: (n: number) => `منذ ${formatNumber(n, 'ar')} ثانية`,
        minutesAgo: (n: number) => `منذ ${formatNumber(n, 'ar')} دقيقة`,
        hoursAgo: (n: number) => `منذ ${formatNumber(n, 'ar')} ساعة`,
        daysAgo: (n: number) => `منذ ${formatNumber(n, 'ar')} يوم`,
      },
      en: {
        justNow: 'just now',
        secondsAgo: (n: number) => `${n} seconds ago`,
        minutesAgo: (n: number) => `${n} minutes ago`,
        hoursAgo: (n: number) => `${n} hours ago`,
        daysAgo: (n: number) => `${n} days ago`,
      },
    };

    const lang = language === 'mixed' ? 'en' : language;
    const t = translations[lang];

    if (diffSeconds < 10) {
      return t.justNow;
    } else if (diffSeconds < 60) {
      return t.secondsAgo(diffSeconds);
    } else if (diffMinutes < 60) {
      return t.minutesAgo(diffMinutes);
    } else if (diffHours < 24) {
      return t.hoursAgo(diffHours);
    } else if (diffDays < 30) {
      return t.daysAgo(diffDays);
    }

    // For older dates, use full date format
    return this.formatDate(date, language, 'long');
  }

  /**
   * Add RTL markers to text if needed
   * Task 4.2, Subtask 3: As per plan line 975
   * 
   * @param text - Text to process
   * @param hasArabic - Whether text contains Arabic characters
   * @returns Text with RTL markers if needed
   */
  addRTLMarkers(text: string, hasArabic: boolean = true): string {
    if (!text || !hasArabic) return text;

    // Add RTL marker at the beginning
    const RTL_MARK = '\u200F'; // Right-to-Left Mark
    return RTL_MARK + text;
  }

  /**
   * Detect if text contains Arabic characters
   * 
   * @param text - Text to check
   * @returns True if text contains Arabic
   */
  hasArabicChars(text: string): boolean {
    const ARABIC_RANGE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    return ARABIC_RANGE.test(text);
  }

  /**
   * Format text with proper directionality
   * Automatically adds RTL markers if text contains Arabic
   * 
   * @param text - Text to format
   * @param language - Language hint ('ar' | 'en' | 'mixed')
   * @returns Formatted text with proper directionality
   */
  formatTextDirection(text: string, language: 'ar' | 'en' | 'mixed' = 'en'): string {
    if (!text) return text;

    const hasArabic = this.hasArabicChars(text);
    
    if (language === 'ar' || (language === 'mixed' && hasArabic)) {
      return this.addRTLMarkers(text, hasArabic);
    }

    return text;
  }

  /**
   * Get localized common phrases
   * 
   * @param key - Phrase key
   * @param language - Target language
   * @returns Localized phrase
   */
  getLocalizedPhrase(key: string, language: 'ar' | 'en' | 'mixed' = 'en'): string {
    const phrases: { [key: string]: { ar: string; en: string } } = {
      yes: { ar: 'نعم', en: 'Yes' },
      no: { ar: 'لا', en: 'No' },
      thanks: { ar: 'شكراً', en: 'Thank you' },
      welcome: { ar: 'أهلاً', en: 'Welcome' },
      hello: { ar: 'مرحباً', en: 'Hello' },
      goodbye: { ar: 'وداعاً', en: 'Goodbye' },
      loading: { ar: 'جاري التحميل', en: 'Loading' },
      error: { ar: 'خطأ', en: 'Error' },
      success: { ar: 'نجح', en: 'Success' },
      price: { ar: 'السعر', en: 'Price' },
      location: { ar: 'الموقع', en: 'Location' },
      bedrooms: { ar: 'غرف نوم', en: 'Bedrooms' },
      bathrooms: { ar: 'حمامات', en: 'Bathrooms' },
      area: { ar: 'المساحة', en: 'Area' },
    };

    const phrase = phrases[key];
    if (!phrase) {
      logger.warn('Unknown phrase key', { key });
      return key;
    }

    if (language === 'ar') {
      return phrase.ar;
    } else if (language === 'mixed') {
      return `${phrase.en} (${phrase.ar})`;
    }

    return phrase.en;
  }
}

// Singleton instance
export const arabicFormatterService = new ArabicFormatterService();
