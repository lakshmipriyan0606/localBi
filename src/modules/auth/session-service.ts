import { prisma } from '../../shared/database/client';
import { generateOpaqueToken, hashToken } from './token-utils';
import { Prisma } from '@prisma/client';
import { logger } from '../../shared/observability/logger';

export interface SessionMetadata {
  ipAddress: string;
  userAgent: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  status: string;
}

export interface ActiveSession {
  id: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  expiresAt: Date;
  lastActiveAt: Date;
  createdAt: Date;
}

export interface SessionResolution {
  user: AuthenticatedUser;
  session: ActiveSession;
}

export interface SessionListItem {
  id: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
  isCurrent: boolean;
}

export const SESSION_TIMINGS = {
  // Absolute lifetime: 7 days
  ABSOLUTE_LIFETIME_MS: 7 * 24 * 60 * 60 * 1000,
  // Idle lifetime: 2 hours of inactivity
  IDLE_LIFETIME_MS: 2 * 60 * 60 * 1000,
  // Activity touch throttle: at most once per 60 seconds
  ACTIVITY_TOUCH_THROTTLE_MS: 60 * 1000,
  // Retention for expired/revoked sessions before hard purge: 30 days
  CLEANUP_RETENTION_MS: 30 * 24 * 60 * 60 * 1000,
};

export class SessionService {
  /**
   * Creates a new stateful session.
   * Generates a 256-bit CSPRNG token, hashes it via SHA-256, and stores only the hash in PostgreSQL.
   */
  public static async createSession(
    userId: string,
    metadata: SessionMetadata,
    tx?: Prisma.TransactionClient
  ): Promise<{ rawToken: string; session: ActiveSession }> {
    const rawToken = generateOpaqueToken(32);
    const sessionTokenHash = hashToken(rawToken);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TIMINGS.ABSOLUTE_LIFETIME_MS);

    const db = tx ?? prisma;

    const record = await db.userSession.create({
      data: {
        userId,
        sessionTokenHash,
        ipAddress: metadata.ipAddress || 'UNKNOWN',
        userAgent: metadata.userAgent || 'UNKNOWN',
        expiresAt,
        lastActiveAt: now,
        createdAt: now,
      },
    });

    return {
      rawToken,
      session: {
        id: record.id,
        userId: record.userId,
        ipAddress: record.ipAddress,
        userAgent: record.userAgent,
        expiresAt: record.expiresAt,
        lastActiveAt: record.lastActiveAt,
        createdAt: record.createdAt,
      },
    };
  }

  /**
   * Resolves an authenticated user and active session from a raw cookie token.
   * Enforces absolute expiration, idle expiration, user account status, and session revocation.
   */
  public static async resolveSession(rawToken: string | null | undefined): Promise<SessionResolution | null> {
    if (!rawToken || typeof rawToken !== 'string' || rawToken.trim().length < 32) {
      return null;
    }

    const sessionTokenHash = hashToken(rawToken);

    const sessionRecord = await prisma.userSession.findUnique({
      where: { sessionTokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            status: true,
          },
        },
      },
    });

    if (!sessionRecord) {
      return null;
    }

    // Check if session has been revoked or user is not active
    if (sessionRecord.revokedAt !== null || sessionRecord.user.status !== 'ACTIVE') {
      return null;
    }

    const now = Date.now();

    // 1. Check absolute expiration
    if (sessionRecord.expiresAt.getTime() <= now) {
      await this.revokeSessionById(sessionRecord.id);
      return null;
    }

    // 2. Check idle expiration
    const lastActive = sessionRecord.lastActiveAt.getTime();
    if (now - lastActive > SESSION_TIMINGS.IDLE_LIFETIME_MS) {
      await this.revokeSessionById(sessionRecord.id);
      return null;
    }

    // 3. Throttled update of lastActiveAt
    if (now - lastActive > SESSION_TIMINGS.ACTIVITY_TOUCH_THROTTLE_MS) {
      prisma.userSession
        .update({
          where: { id: sessionRecord.id },
          data: { lastActiveAt: new Date(now) },
        })
        .catch((err) => {
          logger.warn({ error: (err as Error).message }, 'Failed to update session lastActiveAt touch');
        });
    }

    return {
      user: sessionRecord.user,
      session: {
        id: sessionRecord.id,
        userId: sessionRecord.userId,
        ipAddress: sessionRecord.ipAddress,
        userAgent: sessionRecord.userAgent,
        expiresAt: sessionRecord.expiresAt,
        lastActiveAt: sessionRecord.lastActiveAt,
        createdAt: sessionRecord.createdAt,
      },
    };
  }

  /**
   * Rotates a session: revokes the old session and issues a new one.
   * Mitigates session fixation attacks upon login and privilege elevation.
   */
  public static async rotateSession(
    currentRawToken: string,
    metadata: SessionMetadata,
    tx?: Prisma.TransactionClient
  ): Promise<{ rawToken: string; session: ActiveSession }> {
    const db = tx ?? prisma;
    const oldHash = hashToken(currentRawToken);

    const existing = await db.userSession.findUnique({
      where: { sessionTokenHash: oldHash },
    });

    if (!existing) {
      throw new Error('Cannot rotate non-existent session');
    }

    // Atomically revoke old session
    await db.userSession.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    // Create fresh session
    return this.createSession(existing.userId, metadata, db);
  }

  /**
   * Revokes a single session by raw token (single device logout).
   */
  public static async revokeSession(rawToken: string, tx?: Prisma.TransactionClient): Promise<boolean> {
    if (!rawToken || typeof rawToken !== 'string') {
      return false;
    }

    const sessionTokenHash = hashToken(rawToken);
    const db = tx ?? prisma;

    try {
      const result = await db.userSession.updateMany({
        where: {
          sessionTokenHash,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      return result.count > 0;
    } catch {
      return false;
    }
  }

  /**
   * Revokes a session by session ID.
   */
  public static async revokeSessionById(sessionId: string, tx?: Prisma.TransactionClient): Promise<boolean> {
    const db = tx ?? prisma;
    try {
      const result = await db.userSession.updateMany({
        where: {
          id: sessionId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
      return result.count > 0;
    } catch {
      return false;
    }
  }

  /**
   * Revokes all active sessions for a user (all-device signout, password reset, suspension).
   */
  public static async revokeAllUserSessions(userId: string, tx?: Prisma.TransactionClient): Promise<number> {
    const db = tx ?? prisma;

    const result = await db.userSession.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Lists active sessions for an authenticated user to allow device management.
   */
  public static async listUserSessions(
    userId: string,
    currentRawToken?: string
  ): Promise<SessionListItem[]> {
    const currentHash = currentRawToken ? hashToken(currentRawToken) : null;
    const now = new Date();

    const sessions = await prisma.userSession.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { lastActiveAt: 'desc' },
      take: 20,
    });

    return sessions.map((s) => ({
      id: s.id,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
      lastActiveAt: s.lastActiveAt,
      expiresAt: s.expiresAt,
      isCurrent: currentHash !== null && s.sessionTokenHash === currentHash,
    }));
  }

  /**
   * Purges expired and revoked sessions older than 30 days.
   */
  public static async cleanupExpiredSessions(): Promise<number> {
    const cutoffDate = new Date(Date.now() - SESSION_TIMINGS.CLEANUP_RETENTION_MS);

    const result = await prisma.userSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: cutoffDate } },
          { revokedAt: { lt: cutoffDate } },
        ],
      },
    });

    return result.count;
  }
}
