import { Redis } from 'ioredis';
import { getConfig } from '../config';
import { logger } from '../observability/logger';

/**
 * Shared Redis client for caching and rate limiting.
 * Configured with resilient retry strategy, timeouts, and disconnection handling.
 */
let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    const config = getConfig();
    redisClient = new Redis(config.REDIS_CACHE_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      commandTimeout: 2000,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy(times) {
        if (times > 3) {
          return null; // Stop retrying after 3 attempts
        }
        return Math.min(times * 100, 1000);
      },
    });

    redisClient.on('error', (err) => {
      logger.warn({ error: err.message }, 'Redis cache client warning');
    });
  }

  return redisClient;
}

/**
 * Disconnects the shared Redis client (useful for clean test teardown).
 */
export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch {
      redisClient.disconnect();
    } finally {
      redisClient = null;
    }
  }
}
