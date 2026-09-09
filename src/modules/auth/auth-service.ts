import { prisma } from '../../shared/database/client';
import { normalizeEmail } from './email-normalizer';
import { hashToken } from './token-utils';
import { PasswordService } from './password-service';
import { RateLimiterService } from './rate-limiter';
import { SessionService, SessionMetadata, ActiveSession, AuthenticatedUser } from './session-service';
import {
  createInvalidCredentialsError,
  createAccountSuspendedError,
  createValidationError,
} from '../../shared/errors';
import { logger } from '../../shared/observability/logger';

export interface LoginResult {
  user: AuthenticatedUser;
  session: ActiveSession;
  rawToken: string;
}

export class AuthService {
  /**
   * Authenticates a user with email and password.
   * Enforces:
   * - Rate limiting by IP and privacy-safe email hash
   * - Normalized email comparison
   * - RFC 9106 Argon2id verification
   * - Dummy verification for non-existent users (timing side-channel protection)
   * - Account lockout protection after 5 consecutive failures
   * - Opaque 256-bit session token creation
   */
  public static async loginWithPassword(
    rawEmail: string,
    rawPassword: string,
    metadata: SessionMetadata
  ): Promise<LoginResult> {
    const ip = metadata.ipAddress || '127.0.0.1';

    // 1. Check rate limits (fail-closed or fail-open per policy)
    const rateLimit = await RateLimiterService.checkLoginRateLimit(ip, rawEmail || 'unknown');
    if (!rateLimit.allowed) {
      throw createInvalidCredentialsError(); // Generic error without leaking specific block reason
    }

    let normalizedEmail: string;
    try {
      normalizedEmail = normalizeEmail(rawEmail);
    } catch {
      await PasswordService.verifyDummyPassword(rawPassword);
      await RateLimiterService.recordFailedLogin(ip, rawEmail || 'invalid');
      throw createInvalidCredentialsError();
    }

    // 2. Query user and credential
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { credential: true },
    });

    // 3. User does not exist or has no password credential (e.g. SSO only)
    if (!user || !user.credential) {
      await PasswordService.verifyDummyPassword(rawPassword);
      await RateLimiterService.recordFailedLogin(ip, normalizedEmail);
      throw createInvalidCredentialsError();
    }

    const now = new Date();

    // 4. Check credential lockout
    if (user.credential.lockedUntil && user.credential.lockedUntil > now) {
      await PasswordService.verifyDummyPassword(rawPassword);
      throw createInvalidCredentialsError();
    }

    // 5. Verify Argon2id password hash
    const isValid = await PasswordService.verifyPassword(user.credential.passwordHash, rawPassword);

    if (!isValid) {
      const failedAttempts = user.credential.failedLoginAttempts + 1;
      const lockedUntil = failedAttempts >= 5 ? new Date(now.getTime() + 15 * 60 * 1000) : null;

      await prisma.userCredential.update({
        where: { userId: user.id },
        data: {
          failedLoginAttempts: failedAttempts,
          lockedUntil,
        },
      });

      await RateLimiterService.recordFailedLogin(ip, normalizedEmail);
      throw createInvalidCredentialsError();
    }

    // 6. Check account status
    if (user.status !== 'ACTIVE') {
      throw createAccountSuspendedError();
    }

    // 7. Reset failed login attempts and rate limit on success
    if (user.credential.failedLoginAttempts > 0 || user.credential.lockedUntil) {
      await prisma.userCredential.update({
        where: { userId: user.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
    }

    await RateLimiterService.resetLoginRateLimit(ip, normalizedEmail);

    // 8. Create stateful opaque session
    const { rawToken, session } = await SessionService.createSession(user.id, metadata);

    // 9. Emit audit event
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        actorRole: 'USER',
        action: 'auth:login',
        resourceType: 'UserSession',
        resourceId: session.id,
        ipAddress: metadata.ipAddress || 'UNKNOWN',
        userAgent: metadata.userAgent || 'UNKNOWN',
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        status: user.status,
      },
      session,
      rawToken,
    };
  }

  /**
   * Signs out the current device by revoking the active session token.
   */
  public static async logout(rawToken: string): Promise<void> {
    await SessionService.revokeSession(rawToken);
  }

  /**
   * Signs out all devices for a user.
   */
  public static async logoutAllDevices(userId: string): Promise<number> {
    return SessionService.revokeAllUserSessions(userId);
  }

  /**
   * Safe password change for an authenticated user.
   * Requires current password verification and revokes all other sessions.
   */
  public static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    currentRawToken?: string
  ): Promise<void> {
    PasswordService.validatePasswordStrength(newPassword);

    const credential = await prisma.userCredential.findUnique({
      where: { userId },
    });

    if (!credential) {
      throw createValidationError('User has no password credentials set');
    }

    const isValid = await PasswordService.verifyPassword(credential.passwordHash, currentPassword);
    if (!isValid) {
      throw createInvalidCredentialsError();
    }

    const newHash = await PasswordService.hashPassword(newPassword);
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.userCredential.update({
        where: { userId },
        data: {
          passwordHash: newHash,
          passwordChangedAt: now,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      // Revoke sessions across devices (preserving current session if provided)
      const currentHash = currentRawToken ? hashToken(currentRawToken) : null;
      await tx.userSession.updateMany({
        where: {
          userId,
          revokedAt: null,
          ...(currentHash ? { sessionTokenHash: { not: currentHash } } : {}),
        },
        data: {
          revokedAt: now,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: userId,
          actorRole: 'USER',
          action: 'auth:password_change',
          resourceType: 'UserCredential',
          resourceId: userId,
          ipAddress: 'INTERNAL',
          userAgent: 'INTERNAL',
        },
      });
    });

    logger.info({ userId }, 'Password changed successfully and sessions revoked');
  }
}
