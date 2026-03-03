import { validate, envSchema } from './env.validation';
import { randomBytes } from 'node:crypto';

/** Returns a complete, valid env object for testing. */
function validEnv(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    NODE_ENV: 'development',
    PORT: '3001',
    DATABASE_URL: 'postgresql://localhost:5432/fieldrunner',
    ENCRYPTION_KEY: randomBytes(32).toString('hex'),
    CLERK_SECRET_KEY: 'sk_test_abc123',
    CLERK_WEBHOOK_SIGNING_SECRET: 'whsec_abc123',
    GOOGLE_PLACES_API_KEY: 'AIzaSyTestKey123',
    ANTHROPIC_API_KEY: 'sk-ant-api03-testkey123',
    ...overrides,
  };
}

describe('env.validation', () => {
  describe('validate()', () => {
    it('should accept a fully valid env', () => {
      const env = validEnv();
      const result = validate(env);
      expect(result.DATABASE_URL).toBe(env.DATABASE_URL);
      expect(result.NODE_ENV).toBe('development');
      expect(result.PORT).toBe(3001);
    });

    it('should apply defaults for NODE_ENV and PORT when missing', () => {
      const env = validEnv();
      delete env.NODE_ENV;
      delete env.PORT;
      const result = validate(env);
      expect(result.NODE_ENV).toBe('development');
      expect(result.PORT).toBe(3001);
    });

    it('should coerce PORT from string to number', () => {
      const result = validate(validEnv({ PORT: '8080' }));
      expect(result.PORT).toBe(8080);
      expect(typeof result.PORT).toBe('number');
    });

    it('should allow optional fields to be absent', () => {
      const env = validEnv();
      // These should all be optional
      delete env.CORS_ORIGINS;
      delete env.FRONTEND_URL;
      delete env.CLERK_PUBLISHABLE_KEY;
      delete env.CLERK_JWT_KEY;
      delete env.NOMINATIM_USER_AGENT;
      const result = validate(env);
      expect(result.CORS_ORIGINS).toBeUndefined();
      expect(result.FRONTEND_URL).toBeUndefined();
    });
  });

  describe('DATABASE_URL', () => {
    it('should reject missing DATABASE_URL', () => {
      const env = validEnv();
      delete env.DATABASE_URL;
      expect(() => validate(env)).toThrow('Environment validation failed');
    });

    it('should reject empty DATABASE_URL', () => {
      expect(() => validate(validEnv({ DATABASE_URL: '' }))).toThrow(
        'Environment validation failed',
      );
    });

    it('should reject non-postgresql URLs', () => {
      expect(() =>
        validate(validEnv({ DATABASE_URL: 'mysql://localhost:3306/db' })),
      ).toThrow('Environment validation failed');
    });

    it('should accept postgres:// prefix', () => {
      const result = validate(
        validEnv({ DATABASE_URL: 'postgres://localhost:5432/db' }),
      );
      expect(result.DATABASE_URL).toBe('postgres://localhost:5432/db');
    });

    it('should accept postgresql:// prefix', () => {
      const result = validate(
        validEnv({ DATABASE_URL: 'postgresql://localhost:5432/db' }),
      );
      expect(result.DATABASE_URL).toBe('postgresql://localhost:5432/db');
    });
  });

  describe('ENCRYPTION_KEY', () => {
    it('should reject missing ENCRYPTION_KEY', () => {
      const env = validEnv();
      delete env.ENCRYPTION_KEY;
      expect(() => validate(env)).toThrow('Environment validation failed');
    });

    it('should reject short ENCRYPTION_KEY', () => {
      expect(() => validate(validEnv({ ENCRYPTION_KEY: 'abcdef' }))).toThrow(
        'Environment validation failed',
      );
    });

    it('should reject non-hex ENCRYPTION_KEY', () => {
      expect(() =>
        validate(validEnv({ ENCRYPTION_KEY: 'g'.repeat(64) })),
      ).toThrow('Environment validation failed');
    });

    it('should accept a valid 64-char hex key', () => {
      const key = randomBytes(32).toString('hex');
      expect(key).toHaveLength(64);
      const result = validate(validEnv({ ENCRYPTION_KEY: key }));
      expect(result.ENCRYPTION_KEY).toBe(key);
    });
  });

  describe('CLERK_SECRET_KEY', () => {
    it('should reject missing CLERK_SECRET_KEY', () => {
      const env = validEnv();
      delete env.CLERK_SECRET_KEY;
      expect(() => validate(env)).toThrow('Environment validation failed');
    });

    it('should reject empty CLERK_SECRET_KEY', () => {
      expect(() => validate(validEnv({ CLERK_SECRET_KEY: '' }))).toThrow(
        'Environment validation failed',
      );
    });
  });

  describe('CLERK_WEBHOOK_SIGNING_SECRET', () => {
    it('should reject missing CLERK_WEBHOOK_SIGNING_SECRET', () => {
      const env = validEnv();
      delete env.CLERK_WEBHOOK_SIGNING_SECRET;
      expect(() => validate(env)).toThrow('Environment validation failed');
    });
  });

  describe('GOOGLE_PLACES_API_KEY', () => {
    it('should reject missing GOOGLE_PLACES_API_KEY', () => {
      const env = validEnv();
      delete env.GOOGLE_PLACES_API_KEY;
      expect(() => validate(env)).toThrow('Environment validation failed');
    });
  });

  describe('ANTHROPIC_API_KEY', () => {
    it('should reject missing ANTHROPIC_API_KEY', () => {
      const env = validEnv();
      delete env.ANTHROPIC_API_KEY;
      expect(() => validate(env)).toThrow('Environment validation failed');
    });
  });

  describe('NODE_ENV', () => {
    it('should accept "production"', () => {
      const result = validate(validEnv({ NODE_ENV: 'production' }));
      expect(result.NODE_ENV).toBe('production');
    });

    it('should accept "test"', () => {
      const result = validate(validEnv({ NODE_ENV: 'test' }));
      expect(result.NODE_ENV).toBe('test');
    });

    it('should reject invalid NODE_ENV values', () => {
      expect(() => validate(validEnv({ NODE_ENV: 'staging' }))).toThrow(
        'Environment validation failed',
      );
    });
  });

  describe('PORT', () => {
    it('should reject PORT below 1', () => {
      expect(() => validate(validEnv({ PORT: '0' }))).toThrow(
        'Environment validation failed',
      );
    });

    it('should reject PORT above 65535', () => {
      expect(() => validate(validEnv({ PORT: '99999' }))).toThrow(
        'Environment validation failed',
      );
    });

    it('should reject non-numeric PORT', () => {
      expect(() => validate(validEnv({ PORT: 'abc' }))).toThrow(
        'Environment validation failed',
      );
    });
  });

  describe('FRONTEND_URL', () => {
    it('should accept a valid URL', () => {
      const result = validate(
        validEnv({ FRONTEND_URL: 'https://app.example.com' }),
      );
      expect(result.FRONTEND_URL).toBe('https://app.example.com');
    });

    it('should reject an invalid URL', () => {
      expect(() => validate(validEnv({ FRONTEND_URL: 'not-a-url' }))).toThrow(
        'Environment validation failed',
      );
    });
  });

  describe('error output', () => {
    it('should report all missing required fields at once', () => {
      expect(() => validate({ NODE_ENV: 'development' })).toThrow(
        'Environment validation failed',
      );
    });
  });
});
