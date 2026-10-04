import { z } from 'zod';

const configSchema = z.object({
  // Runtime
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_NAME: z.string().min(1).default('localbi'),
  APP_DOMAIN: z.string().min(1).default('localhost:3000'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  PORT: z.coerce.number().int().positive().default(3000),

  // Database (Runtime role only — bootstrap and migrator credentials strictly excluded)
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required for application runtime'),

  // Redis
  REDIS_QUEUE_URL: z.string().min(1).default('redis://localhost:6379/0'),
  REDIS_CACHE_URL: z.string().min(1).default('redis://localhost:6379/1'),

  // Cryptography & Sessions
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  ENCRYPTION_MASTER_KEY: z.string().length(64, 'ENCRYPTION_MASTER_KEY must be a 64-character hex string (32 bytes)'),
  ENCRYPTION_KEY_ID: z.string().min(1).default('key-2026-v1'),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),

  // Feature Flags
  ENABLE_GBP_SYNC: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(true),
  ENABLE_REGISTRATION: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(true),

  // Email Delivery
  EMAIL_PROVIDER: z.enum(['resend', 'smtp', 'console', 'mock']).default('console'),
  EMAIL_FROM: z.string().default('localBi <notifications@localbi.app>'),
  RESEND_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),

  // Observability
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type AppConfig = z.infer<typeof configSchema>;

function loadAndValidateConfig(): AppConfig {
  const parsed = configSchema.safeParse(process.env);

  if (!parsed.success) {
    const errorDetails = parsed.error.issues
      .map((issue) => ` - [${issue.path.join('.')}]: ${issue.message}`)
      .join('\n');

    // Fail-fast with clear, safe diagnostic (never logs secret values)
    console.error(`FATAL_CONFIG_ERROR: Application configuration failed validation:\n${errorDetails}`);
    throw new Error(`FATAL_CONFIG_ERROR: Invalid application configuration`);
  }

  return parsed.data;
}

// Global cached validated configuration instance
let cachedConfig: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!cachedConfig) {
    cachedConfig = loadAndValidateConfig();
  }
  return cachedConfig;
}

/**
 * For testing purposes: allows resetting configuration in unit test suites.
 */
export function resetConfigForTest(override?: Partial<AppConfig>): AppConfig {
  cachedConfig = configSchema.parse({
    ...process.env,
    ...override,
  });
  return cachedConfig;
}
