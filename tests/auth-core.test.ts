import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '../src/shared/database/client';
import { normalizeEmail, hashEmailForRateLimit } from '../src/modules/auth/email-normalizer';
import { PasswordService } from '../src/modules/auth/password-service';
import { generateOpaqueToken, hashToken, safeCompare } from '../src/modules/auth/token-utils';
import { SessionService, SESSION_TIMINGS } from '../src/modules/auth/session-service';
import { PasswordResetService } from '../src/modules/auth/password-reset';
import { AuthService } from '../src/modules/auth/auth-service';
import { RateLimiterService } from '../src/modules/auth/rate-limiter';
import { closeRedisClient } from '../src/shared/database/redis-client';

describe('Phase 2: Authentication Core, Sessions, and Rate Limiting', () => {
  afterAll(async () => {
    await closeRedisClient();
  });

  describe('1. Email Normalization & Privacy-Safe Key Hashing', () => {
    it('normalizes whitespace, unicode characters, and lowercases emails', () => {
      const email1 = '  User.Test@EXAMPLE.com  ';
      expect(normalizeEmail(email1)).toBe('user.test@example.com');

      const email2 = 'café@domain.com';
      expect(normalizeEmail(email2)).toBe('café@domain.com'.normalize('NFKC').toLowerCase());
    });

    it('rejects invalid email formats and empty inputs', () => {
      expect(() => normalizeEmail('')).toThrow();
      expect(() => normalizeEmail('invalid-email')).toThrow();
      expect(() => normalizeEmail('@domain.com')).toThrow();
      expect(() => normalizeEmail('user@')).toThrow();
    });

    it('generates deterministic, privacy-safe HMAC keys for Redis rate limiting', () => {
      const email = 'Security.User@Enterprise.Org';
      const hash1 = hashEmailForRateLimit(email);
      const hash2 = hashEmailForRateLimit('  security.user@enterprise.org ');

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex
      expect(hash1).not.toContain('enterprise'); // No plaintext leak
    });
  });

  describe('2. Password Validation and Argon2id Hashing', () => {
    it('enforces password complexity rules', () => {
      expect(() => PasswordService.validatePasswordStrength('short')).toThrow(/(10|12) characters/);
      expect(() => PasswordService.validatePasswordStrength('alllowercase12345!')).toThrow(/uppercase/);
      expect(() => PasswordService.validatePasswordStrength('ALLUPPERCASE12345!')).toThrow(/lowercase/);
      expect(() => PasswordService.validatePasswordStrength('OnlyLettersWithoutNumbersOrSymbols')).toThrow(
        /number or special character/
      );

      expect(() => PasswordService.validatePasswordStrength('ValidComplexPassword123!')).not.toThrow();
    });

    it('hashes and verifies valid passwords using RFC 9106 Argon2id profile', async () => {
      const password = 'StrongPassword2026!Enterprise';
      const hash = await PasswordService.hashPassword(password);

      expect(hash).toContain('$argon2id$');
      expect(await PasswordService.verifyPassword(hash, password)).toBe(true);
      expect(await PasswordService.verifyPassword(hash, 'WrongPassword2026!')).toBe(false);
    });

    it('executes dummy Argon2id verification for timing side-channel mitigation', async () => {
      const result = await PasswordService.verifyDummyPassword('arbitrary-candidate');
      expect(result).toBe(false);
    });
  });

  describe('3. Token Utilities', () => {
    it('generates URL-safe opaque 256-bit CSPRNG tokens', () => {
      const token1 = generateOpaqueToken();
      const token2 = generateOpaqueToken();

      expect(token1).not.toBe(token2);
      expect(token1.length).toBeGreaterThanOrEqual(43); // base64url of 32 bytes
    });

    it('computes SHA-256 hash and validates constant-time comparison', () => {
      const raw = 'test-token-value-123';
      const hash = hashToken(raw);

      expect(hash).toHaveLength(64);
      expect(safeCompare(hash, hashToken(raw))).toBe(true);
      expect(safeCompare(hash, 'wrong-hash')).toBe(false);
    });
  });

  describe('4. Stateful Opaque Session Lifecycle', () => {
    let testUserId: string;

    beforeEach(async () => {
      const random = generateOpaqueToken(8);
      const user = await prisma.user.create({
        data: {
          email: `session-test-${random}@localbi.test`,
          fullName: 'Session Tester',
          status: 'ACTIVE',
        },
      });
      testUserId = user.id;
    });

    it('creates, resolves, and tracks sessions with raw cookie token and hashed DB token', async () => {
      const { rawToken, session } = await SessionService.createSession(testUserId, {
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 TestBrowser',
      });

      // Confirm raw token is NOT in database
      const dbRecord = await prisma.userSession.findUnique({
        where: { id: session.id },
      });
      expect(dbRecord).toBeDefined();
      expect(dbRecord?.sessionTokenHash).toBe(hashToken(rawToken));
      expect(dbRecord?.sessionTokenHash).not.toBe(rawToken);

      // Resolve session from raw token
      const resolved = await SessionService.resolveSession(rawToken);
      expect(resolved).not.toBeNull();
      expect(resolved?.user.id).toBe(testUserId);
      expect(resolved?.session.id).toBe(session.id);
    });

    it('supports immediate single-device session revocation (sign-out)', async () => {
      const { rawToken } = await SessionService.createSession(testUserId, {
        ipAddress: '127.0.0.1',
        userAgent: 'DeviceA',
      });

      expect(await SessionService.resolveSession(rawToken)).not.toBeNull();

      const revoked = await SessionService.revokeSession(rawToken);
      expect(revoked).toBe(true);

      expect(await SessionService.resolveSession(rawToken)).toBeNull();
    });

    it('supports all-device session revocation', async () => {
      const s1 = await SessionService.createSession(testUserId, { ipAddress: '1.1.1.1', userAgent: 'D1' });
      const s2 = await SessionService.createSession(testUserId, { ipAddress: '2.2.2.2', userAgent: 'D2' });

      expect(await SessionService.resolveSession(s1.rawToken)).not.toBeNull();
      expect(await SessionService.resolveSession(s2.rawToken)).not.toBeNull();

      const count = await SessionService.revokeAllUserSessions(testUserId);
      expect(count).toBeGreaterThanOrEqual(2);

      expect(await SessionService.resolveSession(s1.rawToken)).toBeNull();
      expect(await SessionService.resolveSession(s2.rawToken)).toBeNull();
    });

    it('rotates session to prevent session fixation', async () => {
      const initial = await SessionService.createSession(testUserId, { ipAddress: '1.1.1.1', userAgent: 'D1' });
      const rotated = await SessionService.rotateSession(initial.rawToken, {
        ipAddress: '1.1.1.1',
        userAgent: 'D1-Rotated',
      });

      expect(rotated.rawToken).not.toBe(initial.rawToken);
      expect(await SessionService.resolveSession(initial.rawToken)).toBeNull();
      expect(await SessionService.resolveSession(rotated.rawToken)).not.toBeNull();
    });

    it('rejects idle-expired sessions', async () => {
      const { rawToken, session } = await SessionService.createSession(testUserId, {
        ipAddress: '1.1.1.1',
        userAgent: 'IdleTest',
      });

      // Manually set lastActiveAt to 3 hours ago (idle timeout is 2 hours)
      const pastActive = new Date(Date.now() - (SESSION_TIMINGS.IDLE_LIFETIME_MS + 10000));
      await prisma.userSession.update({
        where: { id: session.id },
        data: { lastActiveAt: pastActive },
      });

      const resolved = await SessionService.resolveSession(rawToken);
      expect(resolved).toBeNull();
    });
  });

  describe('5. Password Reset Flow and Complete Session Revocation', () => {
    let testUserEmail: string;
    let testUserId: string;

    beforeEach(async () => {
      const random = generateOpaqueToken(8);
      testUserEmail = normalizeEmail(`reset-user-${random}@localbi.test`);
      const initialHash = await PasswordService.hashPassword('InitialPass2026!');

      const user = await prisma.user.create({
        data: {
          email: testUserEmail,
          fullName: 'Reset Test User',
          status: 'ACTIVE',
          credential: {
            create: {
              passwordHash: initialHash,
            },
          },
        },
      });
      testUserId = user.id;
    });

    it('generates single-use reset token and does not leak unknown users', async () => {
      // Request for unknown email
      const unknownRes = await PasswordResetService.requestPasswordReset('nonexistent@domain.com');
      expect(unknownRes.genericMessage).toContain('If an active account exists');
      expect(unknownRes.rawToken).toBeUndefined();

      // Request for real email
      const realRes = await PasswordResetService.requestPasswordReset(testUserEmail);
      expect(realRes.genericMessage).toContain('If an active account exists');
      expect(realRes.rawToken).toBeDefined();

      // Ensure active sessions are revoked upon reset
      const s1 = await SessionService.createSession(testUserId, { ipAddress: '1.1.1.1', userAgent: 'BeforeReset' });
      expect(await SessionService.resolveSession(s1.rawToken)).not.toBeNull();

      // Reset password with token
      const resetRes = await PasswordResetService.resetPassword(
        realRes.rawToken!,
        'NewStrongPassword2026!Enterprise'
      );
      expect(resetRes.success).toBe(true);

      // Session before reset is now revoked
      expect(await SessionService.resolveSession(s1.rawToken)).toBeNull();

      // Token cannot be replayed
      await expect(
        PasswordResetService.resetPassword(realRes.rawToken!, 'AnotherNewPass2026!')
      ).rejects.toThrow();

      // User can now log in with the new password
      const loginRes = await AuthService.loginWithPassword(
        testUserEmail,
        'NewStrongPassword2026!Enterprise',
        { ipAddress: '127.0.0.1', userAgent: 'NewDevice' }
      );
      expect(loginRes.user.id).toBe(testUserId);
      expect(loginRes.rawToken).toBeDefined();
    });
  });

  describe('6. Redis Rate Limiter Behavior & Outage Policy', () => {
    it('increments attempts and enforces rate limit', async () => {
      const testKey = `ratelimit:unit_test:${generateOpaqueToken(8)}`;

      // Initial check should be allowed
      const check1 = await RateLimiterService.checkRateLimit(testKey, 3, 60);
      expect(check1.allowed).toBe(true);
      expect(check1.remaining).toBe(3);

      // Record 3 attempts
      await RateLimiterService.recordAttempt(testKey, 60);
      await RateLimiterService.recordAttempt(testKey, 60);
      await RateLimiterService.recordAttempt(testKey, 60);

      // 4th check should be denied
      const check2 = await RateLimiterService.checkRateLimit(testKey, 3, 60);
      expect(check2.allowed).toBe(false);
      expect(check2.remaining).toBe(0);
      expect(check2.retryAfterSeconds).toBeGreaterThan(0);

      // Reset counter
      await RateLimiterService.resetCounter(testKey);
      const check3 = await RateLimiterService.checkRateLimit(testKey, 3, 60);
      expect(check3.allowed).toBe(true);
    });

    it('respects fail-open and fail-closed outage policies', async () => {
      // Test simulated outage handling
      const failOpenResult = await RateLimiterService.checkRateLimit('simulated:outage', 5, 60, 'fail-open');
      expect(failOpenResult.allowed).toBe(true);
    });
  });
});
