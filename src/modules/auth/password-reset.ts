import { prisma } from '../../shared/database/client';
import { generateOpaqueToken, hashToken } from './token-utils';
import { normalizeEmail } from './email-normalizer';
import { PasswordService } from './password-service';
import { createInvalidTokenError } from '../../shared/errors';
import { logger } from '../../shared/observability/logger';

export const PASSWORD_RESET_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

export class PasswordResetService {
  /**
   * Initiates a password reset request.
   * Guarantees NO user enumeration: returns the identical generic confirmation message
   * whether the email exists or not.
   */
  public static async requestPasswordReset(
    rawEmail: string
  ): Promise<{ genericMessage: string; rawToken?: string; userId?: string }> {
    const genericMessage =
      'If an active account exists for that email address, a password reset link has been dispatched.';

    let normalized: string;
    try {
      normalized = normalizeEmail(rawEmail);
    } catch {
      return { genericMessage };
    }

    const user = await prisma.user.findUnique({
      where: { email: normalized },
      select: { id: true, status: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      // Execute dummy work to equalize timing
      await PasswordService.verifyDummyPassword();
      return { genericMessage };
    }

    // Invalidate any previous unused password reset tokens for this user
    await prisma.authToken.updateMany({
      where: {
        userId: user.id,
        tokenType: 'RESET_PASSWORD',
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    // Generate fresh single-use 256-bit token
    const rawToken = generateOpaqueToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS);

    await prisma.authToken.create({
      data: {
        userId: user.id,
        tokenHash,
        tokenType: 'RESET_PASSWORD',
        expiresAt,
      },
    });

    logger.info({ userId: user.id }, 'Password reset token generated');

    return {
      genericMessage,
      rawToken, // Returned for transactional email dispatcher in production / test verification
      userId: user.id,
    };
  }

  /**
   * Completes a password reset using a single-use token.
   * Atomically:
   * 1. Validates and marks the token used (replay prevention).
   * 2. Updates password credentials with Argon2id.
   * 3. Revokes ALL active user sessions across all devices.
   */
  public static async resetPassword(
    rawToken: string,
    newPassword: string,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<{ success: boolean; userId: string }> {
    if (!rawToken || typeof rawToken !== 'string' || rawToken.trim().length < 32) {
      throw createInvalidTokenError('Invalid or malformed password reset token');
    }

    // Validate password complexity before running transaction
    PasswordService.validatePasswordStrength(newPassword);

    const tokenHash = hashToken(rawToken);
    const now = new Date();

    // Hash password before entering DB transaction to keep transaction window brief
    const newPasswordHash = await PasswordService.hashPassword(newPassword);

    return prisma.$transaction(async (tx) => {
      // Find valid, unconsumed, unexpired token
      const authToken = await tx.authToken.findFirst({
        where: {
          tokenHash,
          tokenType: 'RESET_PASSWORD',
          usedAt: null,
          expiresAt: { gt: now },
        },
      });

      if (!authToken) {
        throw createInvalidTokenError('Password reset link is invalid, expired, or has already been used');
      }

      // Mark token used (prevents replay attacks)
      await tx.authToken.update({
        where: { id: authToken.id },
        data: { usedAt: now },
      });

      // Update user credentials
      await tx.userCredential.upsert({
        where: { userId: authToken.userId },
        create: {
          userId: authToken.userId,
          passwordHash: newPasswordHash,
          passwordChangedAt: now,
          failedLoginAttempts: 0,
        },
        update: {
          passwordHash: newPasswordHash,
          passwordChangedAt: now,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });

      // Revoke all existing sessions across all devices
      await tx.userSession.updateMany({
        where: {
          userId: authToken.userId,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });

      // Create audit log entry
      await tx.auditLog.create({
        data: {
          actorId: authToken.userId,
          actorRole: 'USER',
          action: 'auth:password_reset',
          resourceType: 'UserCredential',
          resourceId: authToken.userId,
          ipAddress: metadata?.ipAddress || 'UNKNOWN',
          userAgent: metadata?.userAgent || 'UNKNOWN',
        },
      });

      return {
        success: true,
        userId: authToken.userId,
      };
    });
  }
}
