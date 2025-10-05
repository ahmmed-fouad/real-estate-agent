import { verifyWebhookSignature, generateSecureToken, sha256Hash } from '../../../src/utils/crypto';

describe('Crypto Utils', () => {
  describe('verifyWebhookSignature', () => {
    const secret = 'test-secret-key';
    const payload = '{"test": "data"}';

    it('should verify valid signature', () => {
      // Generate a valid signature
      const crypto = require('crypto');
      const validSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      const result = verifyWebhookSignature(payload, validSignature, secret);
      expect(result).toBe(true);
    });

    it('should reject invalid signature', () => {
      const invalidSignature = 'invalid-signature';
      const result = verifyWebhookSignature(payload, invalidSignature, secret);
      expect(result).toBe(false);
    });

    it('should reject empty signature', () => {
      const result = verifyWebhookSignature(payload, '', secret);
      expect(result).toBe(false);
    });

    it('should handle empty payload', () => {
      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', secret)
        .update('')
        .digest('hex');

      const result = verifyWebhookSignature('', signature, secret);
      expect(result).toBe(true);
    });

    it('should handle empty secret', () => {
      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', '')
        .update(payload)
        .digest('hex');

      const result = verifyWebhookSignature(payload, signature, '');
      expect(result).toBe(true);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate token of default length', () => {
      const token = generateSecureToken();
      expect(token).toHaveLength(64); // 32 bytes = 64 hex chars
    });

    it('should generate token of specified length', () => {
      const token = generateSecureToken(16);
      expect(token).toHaveLength(32); // 16 bytes = 32 hex chars
    });

    it('should generate different tokens on each call', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      expect(token1).not.toBe(token2);
    });

    it('should generate valid hex string', () => {
      const token = generateSecureToken();
      expect(token).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('sha256Hash', () => {
    it('should hash text correctly', () => {
      const text = 'hello world';
      const hash = sha256Hash(text);
      
      // Expected SHA256 hash of "hello world"
      const expectedHash = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';
      expect(hash).toBe(expectedHash);
    });

    it('should handle empty string', () => {
      const hash = sha256Hash('');
      const expectedHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      expect(hash).toBe(expectedHash);
    });

    it('should produce consistent hashes', () => {
      const text = 'consistent text';
      const hash1 = sha256Hash(text);
      const hash2 = sha256Hash(text);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = sha256Hash('text1');
      const hash2 = sha256Hash('text2');
      expect(hash1).not.toBe(hash2);
    });
  });
});
