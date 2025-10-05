import { PriceFormatter } from '../../../src/utils/price-formatter';

describe('PriceFormatter', () => {
  describe('formatForDisplay', () => {
    it('should format price with EGP currency', () => {
      const result = PriceFormatter.formatForDisplay(3000000);
      expect(result).toContain('3,000,000 EGP');
      expect(result).toContain('٣٬٠٠٠٬٠٠٠ جنيه');
    });

    it('should format price with custom currency', () => {
      const result = PriceFormatter.formatForDisplay(1500000, 'USD');
      expect(result).toContain('1,500,000 USD');
    });

    it('should handle zero amount', () => {
      const result = PriceFormatter.formatForDisplay(0);
      expect(result).toBe('0 EGP (٠ جنيه)');
    });

    it('should handle invalid amount', () => {
      const result = PriceFormatter.formatForDisplay(NaN);
      expect(result).toBe('0 EGP');
    });

    it('should handle null amount', () => {
      const result = PriceFormatter.formatForDisplay(null as any);
      expect(result).toBe('0 EGP');
    });

    it('should handle undefined amount', () => {
      const result = PriceFormatter.formatForDisplay(undefined as any);
      expect(result).toBe('0 EGP');
    });
  });

  describe('formatForContext', () => {
    it('should format price for LLM context', () => {
      const result = PriceFormatter.formatForContext(3000000);
      expect(result).toBe('3,000,000 EGP');
    });

    it('should format price with custom currency', () => {
      const result = PriceFormatter.formatForContext(1500000, 'USD');
      expect(result).toBe('1,500,000 USD');
    });

    it('should handle invalid amount', () => {
      const result = PriceFormatter.formatForContext(NaN);
      expect(result).toBe('0 EGP');
    });
  });

  describe('formatForLog', () => {
    it('should format price for logging', () => {
      const result = PriceFormatter.formatForLog(3000000);
      expect(result).toBe('3,000,000 EGP');
    });

    it('should handle decimal amounts', () => {
      const result = PriceFormatter.formatForLog(3000000.50);
      expect(result).toBe('3,000,000.5 EGP');
    });
  });

  describe('formatArabicNumber', () => {
    it('should format number in Arabic', () => {
      const result = PriceFormatter.formatArabicNumber(3000000);
      expect(result).toBe('٣٬٠٠٠٬٠٠٠');
    });

    it('should handle zero', () => {
      const result = PriceFormatter.formatArabicNumber(0);
      expect(result).toBe('٠');
    });

    it('should handle invalid number', () => {
      const result = PriceFormatter.formatArabicNumber(NaN);
      expect(result).toBe('٠');
    });
  });

  describe('formatTextPrices', () => {
    it('should format prices in text', () => {
      const text = 'The price is 3000000 EGP for this property';
      const result = PriceFormatter.formatTextPrices(text);
      expect(result).toContain('3,000,000 EGP');
      // The method doesn't add Arabic translation when EGP is already present
      expect(result).toBe('The price is 3,000,000 EGP for this property');
    });

    it('should format prices without currency indicators', () => {
      const text = 'The price is 3000000 for this property';
      const result = PriceFormatter.formatTextPrices(text);
      expect(result).toContain('3,000,000 EGP');
      expect(result).toContain('٣٬٠٠٠٬٠٠٠ جنيه');
    });

    it('should handle multiple prices in text', () => {
      const text = 'Prices range from 2000000 to 3000000 EGP';
      const result = PriceFormatter.formatTextPrices(text);
      expect(result).toContain('2,000,000 EGP');
      expect(result).toContain('3,000,000 EGP');
    });

    it('should handle empty text', () => {
      const result = PriceFormatter.formatTextPrices('');
      expect(result).toBe('');
    });

    it('should handle text without prices', () => {
      const text = 'This is just regular text without any prices';
      const result = PriceFormatter.formatTextPrices(text);
      expect(result).toBe(text);
    });

    it('should handle prices with existing commas', () => {
      const text = 'The price is 3,000,000 EGP';
      const result = PriceFormatter.formatTextPrices(text);
      expect(result).toContain('3,000,000 EGP');
    });
  });

  describe('formatPriceRange', () => {
    it('should format price range', () => {
      const result = PriceFormatter.formatPriceRange(2000000, 3000000);
      expect(result).toBe('2,000,000 - 3,000,000 EGP');
    });

    it('should format price range with custom currency', () => {
      const result = PriceFormatter.formatPriceRange(1000000, 2000000, 'USD');
      expect(result).toBe('1,000,000 - 2,000,000 USD');
    });
  });

  describe('formatPricePerMeter', () => {
    it('should format price per square meter', () => {
      const result = PriceFormatter.formatPricePerMeter(15000);
      expect(result).toBe('15,000 EGP/sqm');
    });

    it('should format price per square meter with custom currency', () => {
      const result = PriceFormatter.formatPricePerMeter(1000, 'USD');
      expect(result).toBe('1,000 USD/sqm');
    });
  });
});
