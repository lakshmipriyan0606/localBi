import { getRedisClient } from '../../shared/database/redis-client';
import { hashEmailForRateLimit } from './email-normalizer';
import { logger } from '../../shared/observability/logger';
import { createRateLimitedError } from '../../shared/errors';
import crypto from 'node:crypto';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export type OutagePolicy = 'fail-open' | 'fail-closed';

export const RATE_LIMIT_CONFIG = {
  // 10 failed attempts per IP per 15 minutes
  IP_MAX_ATTEMPTS: 10,
  IP_WINDOW_SECONDS: 900,
  // 5 failed attempts per email hash per 15 minutes
  EMAIL_MAX_ATTEMPTS: 5,
  EMAIL_WINDOW_SECONDS: 900,
  // 3 password reset requests per email hash per 1 hour
  PASSWORD_RESET_MAX_ATTEMPTS: 3,
  PASSWORD_RESET_WINDOW_SECONDS: 3600,
};

export class RateLimiterService {
  /**
   * Hashes IP address if necessary to ensure uniform Redis key shape.
   */
  public static sanitizeIpKey(ip: string): string {
    const cleanIp = ip.trim();
    return crypto.createHash('sha256').update(cleanIp).digest('hex').substring(0, 16);
  }

  /**
   * Checks generic rate limit using atomic Redis commands.
   */
  public static async checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number,
    outagePolicy: OutagePolicy = 'fail-open'
  ): Promise<RateLimitResult> {
    const redis = getRedisClient();

    try {
      if (redis.status !== 'ready') {
        await redis.connect().catch(() => {});
      }

      const countStr = await redis.get(key);
      const currentCount = countStr ? parseInt(countStr, 10) : 0;

      if (currentCount >= limit) {
        const ttl = await redis.ttl(key);
        const retryAfterSeconds = ttl > 0 ? ttl : windowSeconds;
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds,
        };
      }

      return {
        allowed: true,
        remaining: Math.max(0, limit - currentCount),
        retryAfterSeconds: 0,
      };
    } catch (error) {
      logger.warn(
        { error: (error as Error).message, key, outagePolicy },
        'Redis rate limiter encountered error, applying outage policy'
      );

      if (outagePolicy === 'fail-closed') {
        throw createRateLimitedError('Security rate limiting service temporarily unavailable');
      }

      // fail-open: allow request with 1 remaining
      return {
        allowed: true,
        remaining: 1,
        retryAfterSeconds: 0,
      };
    }
  }

  /**
   * Increments the attempt counter for a rate-limited key with TTL.
   */
  public static async recordAttempt(key: string, windowSeconds: number): Promise<number> {
    const redis = getRedisClient();

    try {
      if (redis.status !== 'ready') {
        await redis.connect().catch(() => {});
      }

      const pipeline = redis.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, windowSeconds, 'NX'); // Only set expiry if key has no expiry
      const results = await pipeline.exec();

      if (results && results[0] && results[0][1]) {
        return results[0][1] as number;
      }
      return 1;
    } catch (error) {
      logger.warn({ error: (error as Error).message, key }, 'Failed to record attempt in Redis rate limiter');
      return 1;
    }
  }

  /**
   * Resets the counter for a key upon successful action.
   */
  public static async resetCounter(key: string): Promise<void> {
    const redis = getRedisClient();

    try {
      if (redis.status !== 'ready') {
        await redis.connect().catch(() => {});
      }
      await redis.del(key);
    } catch (error) {
      logger.warn({ error: (error as Error).message, key }, 'Failed to reset rate limit counter in Redis');
    }
  }

  /**
   * Checks login rate limit across both IP address and privacy-safe email hash.
   */
  public static async checkLoginRateLimit(
    ip: string,
    email: string,
    outagePolicy: OutagePolicy = 'fail-open'
  ): Promise<RateLimitResult> {
    const ipKey = `ratelimit:auth:ip:${this.sanitizeIpKey(ip)}`;
    const emailKey = `ratelimit:auth:email:${hashEmailForRateLimit(email)}`;

    // Check IP limit
    const ipResult = await this.checkRateLimit(
      ipKey,
      RATE_LIMIT_CONFIG.IP_MAX_ATTEMPTS,
      RATE_LIMIT_CONFIG.IP_WINDOW_SECONDS,
      outagePolicy
    );

    if (!ipResult.allowed) {
      return ipResult;
    }

    // Check Email limit
    const emailResult = await this.checkRateLimit(
      emailKey,
      RATE_LIMIT_CONFIG.EMAIL_MAX_ATTEMPTS,
      RATE_LIMIT_CONFIG.EMAIL_WINDOW_SECONDS,
      outagePolicy
    );

    return emailResult;
  }

  /**
   * Records a failed login attempt for both IP and email hash.
   */
  public static async recordFailedLogin(ip: string, email: string): Promise<void> {
    const ipKey = `ratelimit:auth:ip:${this.sanitizeIpKey(ip)}`;
    const emailKey = `ratelimit:auth:email:${hashEmailForRateLimit(email)}`;

    await Promise.all([
      this.recordAttempt(ipKey, RATE_LIMIT_CONFIG.IP_WINDOW_SECONDS),
      this.recordAttempt(emailKey, RATE_LIMIT_CONFIG.EMAIL_WINDOW_SECONDS),
    ]);
  }

  /**
   * Resets rate limit counters after successful authentication.
   */
  public static async resetLoginRateLimit(ip: string, email: string): Promise<void> {
    const ipKey = `ratelimit:auth:ip:${this.sanitizeIpKey(ip)}`;
    const emailKey = `ratelimit:auth:email:${hashEmailForRateLimit(email)}`;

    await Promise.all([this.resetCounter(ipKey), this.resetCounter(emailKey)]);
  }
}
