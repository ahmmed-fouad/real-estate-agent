/**
 * Language Detection Service
 * Task 4.2, Subtask 1: Auto-detect customer language
 * As per plan lines 961-964
 * 
 * Supports:
 * - Arabic (ar)
 * - English (en)
 * - Arabizi (mixed Arabic-English)
 */

import { createServiceLogger } from '../../utils/logger';

const logger = createServiceLogger('LanguageDetection');

export type DetectedLanguage = 'ar' | 'en' | 'mixed';

export interface LanguageDetectionResult {
  language: DetectedLanguage;
  confidence: number; // 0-1
  hasArabic: boolean;
  hasEnglish: boolean;
  isArabizi: boolean; // Mixed Arabic-English
}

/**
 * Language Detection Service
 * Detects customer language from message content
 */
export class LanguageDetectionService {
  // Arabic Unicode ranges
  private readonly ARABIC_RANGE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  
  // English alphabet
  private readonly ENGLISH_RANGE = /[a-zA-Z]/;
  
  // Common Arabic words
  private readonly COMMON_ARABIC_WORDS = [
    'السلام', 'مرحبا', 'أهلا', 'شكرا', 'من', 'في', 'على', 'إلى',
    'هذا', 'هل', 'ما', 'كيف', 'متى', 'أين', 'لماذا', 'كم',
    'شقة', 'فيلا', 'عقار', 'سعر', 'موقع', 'غرفة', 'حمام', 'مطبخ',
  ];
  
  // Common English words
  private readonly COMMON_ENGLISH_WORDS = [
    'hello', 'hi', 'thanks', 'the', 'is', 'are', 'in', 'at', 'on',
    'what', 'how', 'when', 'where', 'why', 'who', 'which',
    'apartment', 'villa', 'property', 'price', 'location', 'bedroom', 'bathroom',
  ];
  
  // Arabizi patterns (Arabic words written in English letters + numbers)
  private readonly ARABIZI_PATTERNS = [
    /\b(ana|enta|enti|2na|3ayz|3ayza|keda|bs|3shan|7aga|msh|mesh)\b/i,
    /[2378]/,  // Numbers commonly used in Arabizi (2=ء, 3=ع, 7=ح, 8=غ)
  ];

  /**
   * Detect language from message text
   * Task 4.2, Subtask 1: As per plan line 962
   * 
   * @param text - Message text to analyze
   * @returns Language detection result
   */
  detectLanguage(text: string): LanguageDetectionResult {
    if (!text || text.trim().length === 0) {
      logger.warn('Empty text provided for language detection');
      return {
        language: 'en',
        confidence: 0.5,
        hasArabic: false,
        hasEnglish: false,
        isArabizi: false,
      };
    }

    logger.debug('Detecting language', {
      textLength: text.length,
      preview: text.substring(0, 50),
    });

    // Count characters
    const arabicMatches = text.match(new RegExp(this.ARABIC_RANGE, 'g')) || [];
    const englishMatches = text.match(new RegExp(this.ENGLISH_RANGE, 'g')) || [];
    
    const arabicCharCount = arabicMatches.length;
    const englishCharCount = englishMatches.length;
    const totalChars = arabicCharCount + englishCharCount;

    if (totalChars === 0) {
      // No letters, likely just numbers/emojis
      return {
        language: 'en',
        confidence: 0.3,
        hasArabic: false,
        hasEnglish: false,
        isArabizi: false,
      };
    }

    const arabicRatio = arabicCharCount / totalChars;
    const englishRatio = englishCharCount / totalChars;

    // Check for Arabizi (English letters + numbers like 2, 3, 7, 8)
    const hasArabiziPattern = this.ARABIZI_PATTERNS.some(pattern => pattern.test(text));
    
    // Check for common words
    const textLower = text.toLowerCase();
    const hasArabicWords = this.COMMON_ARABIC_WORDS.some(word => text.includes(word));
    const hasEnglishWords = this.COMMON_ENGLISH_WORDS.some(word => textLower.includes(word));

    const hasArabic = arabicCharCount > 0 || hasArabicWords;
    const hasEnglish = englishCharCount > 0 || hasEnglishWords;
    const isArabizi = hasArabiziPattern && !hasArabic && hasEnglish;

    // Determine primary language
    let language: DetectedLanguage;
    let confidence: number;

    if (isArabizi) {
      // Arabizi detected
      language = 'mixed';
      confidence = 0.7;
      logger.debug('Arabizi detected', { text: text.substring(0, 50) });
    } else if (arabicRatio > 0.7) {
      // Predominantly Arabic
      language = 'ar';
      confidence = Math.min(0.95, arabicRatio + (hasArabicWords ? 0.1 : 0));
    } else if (englishRatio > 0.7) {
      // Predominantly English
      language = 'en';
      confidence = Math.min(0.95, englishRatio + (hasEnglishWords ? 0.1 : 0));
    } else if (arabicRatio > 0.4 && englishRatio > 0.4) {
      // Mixed Arabic and English (code-switching)
      language = 'mixed';
      confidence = 0.8;
    } else if (arabicRatio > englishRatio) {
      // More Arabic than English
      language = 'ar';
      confidence = arabicRatio;
    } else {
      // More English than Arabic (or equal)
      language = 'en';
      confidence = englishRatio;
    }

    const result: LanguageDetectionResult = {
      language,
      confidence,
      hasArabic,
      hasEnglish,
      isArabizi,
    };

    logger.debug('Language detected', {
      ...result,
      arabicRatio: arabicRatio.toFixed(2),
      englishRatio: englishRatio.toFixed(2),
      textPreview: text.substring(0, 50),
    });

    return result;
  }

  /**
   * Detect language from conversation history
   * Analyzes multiple messages to determine user's preferred language
   * 
   * @param messages - Array of recent message texts
   * @returns Detected language with aggregated confidence
   */
  detectLanguageFromHistory(messages: string[]): LanguageDetectionResult {
    if (!messages || messages.length === 0) {
      return this.detectLanguage('');
    }

    logger.debug('Detecting language from history', {
      messageCount: messages.length,
    });

    // Detect language for each message
    const detections = messages.map(msg => this.detectLanguage(msg));

    // Aggregate results
    const arabicCount = detections.filter(d => d.language === 'ar').length;
    const englishCount = detections.filter(d => d.language === 'en').length;
    const mixedCount = detections.filter(d => d.language === 'mixed').length;

    const avgConfidence = detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length;
    
    const hasArabic = detections.some(d => d.hasArabic);
    const hasEnglish = detections.some(d => d.hasEnglish);
    const isArabizi = detections.some(d => d.isArabizi);

    // Determine overall language
    let language: DetectedLanguage;
    if (arabicCount > englishCount && arabicCount > mixedCount) {
      language = 'ar';
    } else if (englishCount > arabicCount && englishCount > mixedCount) {
      language = 'en';
    } else {
      language = 'mixed';
    }

    const result: LanguageDetectionResult = {
      language,
      confidence: Math.min(0.95, avgConfidence),
      hasArabic,
      hasEnglish,
      isArabizi,
    };

    logger.info('Language detected from history', {
      ...result,
      messageCount: messages.length,
      arabicCount,
      englishCount,
      mixedCount,
    });

    return result;
  }

  /**
   * Convert detected language to prompt language format
   * Maps DetectedLanguage to the format expected by PromptVariables
   * 
   * @param detected - Detected language result
   * @returns Language code for prompt ('ar' | 'en' | 'auto')
   */
  toPromptLanguage(detected: DetectedLanguage): 'ar' | 'en' | 'auto' {
    switch (detected) {
      case 'ar':
        return 'ar';
      case 'en':
        return 'en';
      case 'mixed':
        return 'auto'; // Let LLM decide based on context
      default:
        return 'auto';
    }
  }

  /**
   * Check if text contains Arabic characters
   * Utility method for other services to use
   * FIX: Added to avoid regex duplication across services
   * 
   * @param text - Text to check
   * @returns True if text contains Arabic characters
   */
  hasArabicChars(text: string): boolean {
    if (!text) return false;
    return this.ARABIC_RANGE.test(text);
  }
}

// Singleton instance
export const languageDetectionService = new LanguageDetectionService();
