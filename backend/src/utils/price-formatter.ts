/**
 * Price Formatter Utility
 * Centralized price formatting logic for consistent display across the application
 * Eliminates duplication and ensures consistent formatting
 */

import { createServiceLogger } from './logger';

const logger = createServiceLogger('PriceFormatter');

/**
 * Centralized price formatting utility
 * Provides consistent price formatting for different contexts
 */
export class PriceFormatter {
  /**
   * Format price for user-facing display (bilingual)
   * Used in WhatsApp messages and customer-facing content
   * 
   * @param amount - The price amount to format
   * @param currency - Currency code (default: 'EGP')
   * @returns Formatted price in both English and Arabic
   * @example formatForDisplay(3000000) → "3,000,000 EGP (٣،٠٠٠،٠٠٠ جنيه)"
   */
  static formatForDisplay(amount: number, currency: string = 'EGP'): string {
    if (isNaN(amount) || amount === null || amount === undefined) {
      logger.warn('Invalid amount for display formatting', { amount });
      return `0 ${currency}`;
    }

    const formatted = amount.toLocaleString('en-US', {
      maximumFractionDigits: 0,
    });

    const arabic = amount.toLocaleString('ar-EG', {
      maximumFractionDigits: 0,
    });

    return `${formatted} ${currency} (${arabic} جنيه)`;
  }

  /**
   * Format price for LLM context (clean English)
   * Used in system prompts and RAG context
   * 
   * @param amount - The price amount to format
   * @param currency - Currency code (default: 'EGP')
   * @returns Clean formatted price for LLM
   * @example formatForContext(3000000) → "3,000,000 EGP"
   */
  static formatForContext(amount: number, currency: string = 'EGP'): string {
    if (isNaN(amount) || amount === null || amount === undefined) {
      logger.warn('Invalid amount for context formatting', { amount });
      return `0 ${currency}`;
    }

    return `${amount.toLocaleString('en-US', {
      maximumFractionDigits: 0,
    })} ${currency}`;
  }

  /**
   * Format price for logging and debugging
   * Simple format for logs and internal use
   * 
   * @param amount - The price amount to format
   * @param currency - Currency code (default: 'EGP')
   * @returns Simple formatted price
   * @example formatForLog(3000000) → "3,000,000 EGP"
   */
  static formatForLog(amount: number, currency: string = 'EGP'): string {
    if (isNaN(amount) || amount === null || amount === undefined) {
      return `0 ${currency}`;
    }

    return `${amount.toLocaleString('en-US')} ${currency}`;
  }

  /**
   * Format Arabic number with proper separators
   * Helper method for Arabic price display
   * 
   * @param amount - The number to format
   * @returns Arabic-formatted number
   * @example formatArabicNumber(3000000) → "٣،٠٠٠،٠٠٠"
   */
  static formatArabicNumber(amount: number): string {
    if (isNaN(amount) || amount === null || amount === undefined) {
      return '٠';
    }

    return amount.toLocaleString('ar-EG', {
      maximumFractionDigits: 0,
    });
  }

  /**
   * Format text by replacing all price occurrences
   * Used in response post-processing to format prices in LLM-generated text
   * 
   * @param text - Text containing prices to format
   * @returns Text with all prices formatted (bilingual)
   * @example "Price is 3000000 EGP" → "Price is 3,000,000 EGP (٣،٠٠٠،٠٠٠ جنيه)"
   */
  static formatTextPrices(text: string): string {
    if (!text) {
      return text;
    }

    // Match numbers that look like prices (large numbers, possibly with EGP, جنيه, etc.)
    // Pattern: numbers with 4+ digits, optionally followed by currency indicators
    const pricePattern = /(\d{4,}(?:,\d{3})*(?:\.\d{2})?)\s*(EGP|جنيه|جنيهاً|pounds?|LE)?/gi;

    return text.replace(pricePattern, (match, number, currency) => {
      // Remove existing commas and parse
      const cleanNumber = number.replace(/,/g, '');
      const numValue = parseFloat(cleanNumber);

      if (isNaN(numValue)) {
        return match; // Return original if not a valid number
      }

      // Format with thousand separators (bilingual)
      const formatted = numValue.toLocaleString('en-US', {
        maximumFractionDigits: 0,
      });

      const arabic = PriceFormatter.formatArabicNumber(numValue);

      // Add EGP suffix if not already present
      if (!currency || currency.toLowerCase() === 'pounds') {
        return `${formatted} EGP (${arabic} جنيه)`;
      }

      // If currency is already in Arabic, don't duplicate
      if (currency === 'جنيه' || currency === 'جنيهاً') {
        return `${formatted} EGP (${arabic} ${currency})`;
      }

      return `${formatted} ${currency}`;
    });
  }

  /**
   * Format price range for display
   * 
   * @param minPrice - Minimum price
   * @param maxPrice - Maximum price
   * @param currency - Currency code (default: 'EGP')
   * @returns Formatted price range
   * @example formatPriceRange(2000000, 3000000) → "2,000,000 - 3,000,000 EGP"
   */
  static formatPriceRange(
    minPrice: number,
    maxPrice: number,
    currency: string = 'EGP'
  ): string {
    const min = minPrice.toLocaleString('en-US', { maximumFractionDigits: 0 });
    const max = maxPrice.toLocaleString('en-US', { maximumFractionDigits: 0 });
    return `${min} - ${max} ${currency}`;
  }

  /**
   * Format price per square meter
   * 
   * @param pricePerMeter - Price per square meter
   * @param currency - Currency code (default: 'EGP')
   * @returns Formatted price per sqm
   * @example formatPricePerMeter(15000) → "15,000 EGP/sqm"
   */
  static formatPricePerMeter(
    pricePerMeter: number,
    currency: string = 'EGP'
  ): string {
    const formatted = pricePerMeter.toLocaleString('en-US', {
      maximumFractionDigits: 0,
    });
    return `${formatted} ${currency}/sqm`;
  }
}

