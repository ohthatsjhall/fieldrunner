import { z } from 'zod';

/**
 * Zod schema for validating all environment variables used by the API.
 *
 * Required variables will cause a startup failure with a clear message
 * if they are missing or malformed. Optional variables have sensible
 * defaults or are truly optional.
 */
export const envSchema = z.object({
  // ── Server ──────────────────────────────────────────────────────────
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  PORT: z.coerce
    .number()
    .int()
    .min(1)
    .max(65535)
    .default(3001),

  CORS_ORIGINS: z.string().optional(),

  FRONTEND_URL: z.url({ error: 'FRONTEND_URL must be a valid URL' }).optional(),

  // ── Database ────────────────────────────────────────────────────────
  DATABASE_URL: z
    .string({ error: 'DATABASE_URL is required' })
    .min(1, { error: 'DATABASE_URL must not be empty' })
    .refine(
      (val) => val.startsWith('postgresql://') || val.startsWith('postgres://'),
      { error: 'DATABASE_URL must start with postgresql:// or postgres://' },
    ),

  // ── Encryption ──────────────────────────────────────────────────────
  ENCRYPTION_KEY: z
    .string({ error: 'ENCRYPTION_KEY is required' })
    .length(64, {
      error: 'ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)',
    })
    .regex(/^[0-9a-fA-F]+$/, {
      error: 'ENCRYPTION_KEY must contain only hexadecimal characters',
    }),

  // ── Clerk ───────────────────────────────────────────────────────────
  CLERK_SECRET_KEY: z
    .string({ error: 'CLERK_SECRET_KEY is required' })
    .min(1, { error: 'CLERK_SECRET_KEY must not be empty' }),

  CLERK_PUBLISHABLE_KEY: z.string().optional(),

  CLERK_WEBHOOK_SIGNING_SECRET: z
    .string({ error: 'CLERK_WEBHOOK_SIGNING_SECRET is required' })
    .min(1, { error: 'CLERK_WEBHOOK_SIGNING_SECRET must not be empty' }),

  CLERK_JWT_KEY: z.string().optional(),

  // ── Google Places ───────────────────────────────────────────────────
  GOOGLE_PLACES_API_KEY: z
    .string({ error: 'GOOGLE_PLACES_API_KEY is required' })
    .min(1, { error: 'GOOGLE_PLACES_API_KEY must not be empty' }),

  // ── Anthropic ───────────────────────────────────────────────────────
  ANTHROPIC_API_KEY: z
    .string({ error: 'ANTHROPIC_API_KEY is required' })
    .min(1, { error: 'ANTHROPIC_API_KEY must not be empty' }),

  // ── Apify / BuildZoom (optional) ────────────────────────────────────
  APIFY_API_TOKEN: z.string().optional(),

  // ── Nominatim (optional) ────────────────────────────────────────────
  NOMINATIM_USER_AGENT: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validation function compatible with NestJS ConfigModule's `validate` option.
 *
 * Takes the raw `process.env` record, validates it against the schema,
 * and returns the typed, validated object. Throws at startup with a
 * human-readable error if any variable is missing or malformed.
 */
export function validate(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const formatted = z.prettifyError(result.error);
    throw new Error(
      `\n\nEnvironment validation failed:\n${formatted}\n`,
    );
  }

  return result.data;
}
