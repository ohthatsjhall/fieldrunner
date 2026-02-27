import { encrypt, decrypt } from './crypto.util';
import { randomBytes } from 'node:crypto';

const TEST_KEY = randomBytes(32).toString('hex');

beforeEach(() => {
  process.env.ENCRYPTION_KEY = TEST_KEY;
});

afterEach(() => {
  delete process.env.ENCRYPTION_KEY;
});

describe('crypto.util', () => {
  describe('encrypt + decrypt round-trip', () => {
    it('should round-trip a simple string', () => {
      const plaintext = 'my-secret-api-key-1234';
      const encrypted = encrypt(plaintext);
      expect(decrypt(encrypted)).toBe(plaintext);
    });

    it('should round-trip an empty string', () => {
      const encrypted = encrypt('');
      expect(decrypt(encrypted)).toBe('');
    });

    it('should round-trip unicode characters', () => {
      const plaintext = 'key-with-special-chars: !@#$%^&*()';
      const encrypted = encrypt(plaintext);
      expect(decrypt(encrypted)).toBe(plaintext);
    });

    it('should produce different ciphertext for the same plaintext (random IV)', () => {
      const plaintext = 'same-input';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);
      expect(encrypted1).not.toBe(encrypted2);
      expect(decrypt(encrypted1)).toBe(plaintext);
      expect(decrypt(encrypted2)).toBe(plaintext);
    });
  });

  describe('encrypt output format', () => {
    it('should produce iv:authTag:ciphertext format', () => {
      const encrypted = encrypt('test');
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);
      // IV = 16 bytes = 32 hex chars
      expect(parts[0]).toHaveLength(32);
      // Auth tag = 16 bytes = 32 hex chars
      expect(parts[1]).toHaveLength(32);
      // Ciphertext should be non-empty
      expect(parts[2].length).toBeGreaterThan(0);
    });
  });

  describe('decrypt error handling', () => {
    it('should throw on invalid format (missing parts)', () => {
      expect(() => decrypt('invalid')).toThrow(
        'Invalid encrypted value format',
      );
    });

    it('should throw on tampered ciphertext', () => {
      const encrypted = encrypt('test');
      const parts = encrypted.split(':');
      parts[2] = 'ff'.repeat(parts[2].length / 2);
      expect(() => decrypt(parts.join(':'))).toThrow();
    });

    it('should throw on tampered auth tag', () => {
      const encrypted = encrypt('test');
      const parts = encrypted.split(':');
      parts[1] = '00'.repeat(16);
      expect(() => decrypt(parts.join(':'))).toThrow();
    });
  });

  describe('ENCRYPTION_KEY validation', () => {
    it('should throw when ENCRYPTION_KEY is not set', () => {
      delete process.env.ENCRYPTION_KEY;
      expect(() => encrypt('test')).toThrow(
        'ENCRYPTION_KEY environment variable is not set',
      );
    });

    it('should throw when ENCRYPTION_KEY is wrong length', () => {
      process.env.ENCRYPTION_KEY = 'abcd';
      expect(() => encrypt('test')).toThrow(
        'ENCRYPTION_KEY must be a 64-character hex string (32 bytes)',
      );
    });

    it('should throw on decrypt when ENCRYPTION_KEY is not set', () => {
      const encrypted = encrypt('test');
      delete process.env.ENCRYPTION_KEY;
      expect(() => decrypt(encrypted)).toThrow(
        'ENCRYPTION_KEY environment variable is not set',
      );
    });

    it('should fail to decrypt with a different key', () => {
      const encrypted = encrypt('test');
      process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex');
      expect(() => decrypt(encrypted)).toThrow();
    });
  });
});
