/**
 * Language Service Types
 * Task 4.2: Multi-Language Support
 */

/**
 * Supported languages
 */
export type Language = 'ar' | 'en' | 'mixed';

/**
 * Language preference stored in session
 */
export interface LanguagePreference {
  primary: Language;
  confidence: number;
  lastDetected: Date;
  messagesSampled: number;
}
