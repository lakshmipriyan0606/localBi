import pino from 'pino';
import { getConfig } from '../config';

const SENSITIVE_KEYS = [
  'password',
  'password_hash',
  'passwordHash',
  'authorization',
  'token',
  'access_token',
  'accessToken',
  'refresh_token',
  'refreshToken',
  'encrypted_refresh_token',
  'encryptedRefreshToken',
  'code',
  'client_secret',
  'clientSecret',
  'secret',
  'cookie',
  'set-cookie',
  'session_token',
  'sessionToken',
  'session_token_hash',
  'sessionTokenHash',
  'token_hash',
  'tokenHash',
];

const redactionPaths = SENSITIVE_KEYS.flatMap((key) => [
  key,
  `*.${key}`,
  `*.*.${key}`,
  `*.*.*.${key}`,
]);

export interface CreateLoggerOptions {
  destination?: pino.DestinationStream | undefined;
  level?: pino.LevelWithSilent | undefined;
}

export function createLogger(
  context?: Record<string, unknown> | undefined,
  options?: CreateLoggerOptions | undefined
): pino.Logger {
  const config = getConfig();

  return pino(
    {
      level: options?.level ?? config.LOG_LEVEL,
      redact: {
        paths: redactionPaths,
        censor: '[REDACTED_SECRET]',
      },
      base: {
        app: config.APP_NAME,
        env: config.NODE_ENV,
        ...context,
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level(label) {
          return { level: label };
        },
      },
    },
    options?.destination
  );
}

// Default root logger instance
export const logger = createLogger();
