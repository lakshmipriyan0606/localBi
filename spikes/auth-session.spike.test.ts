import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'node:crypto';
import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';

describe('Spike: Native Opaque Database Session & Credentials Authentication', () => {
  const prisma = new PrismaClient();

  const testEmail = `spike_user_${crypto.randomBytes(6).toString('hex')}@example.com`;
  const rawPassword = 'StrongPassword!2026#Spike';
  let testUserId = '';

  // Helpers for opaque token generation & hashing
  function generateSessionToken(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  beforeAll(async () => {
    // 1. Create a user and Argon2id hashed credentials
    const passwordHash = await argon2.hash(rawPassword, {
      type: argon2.argon2id,
      memoryCost: 19456, // 19 MiB
      timeCost: 2,
      parallelism: 1,
    });

    const user = await prisma.user.create({
      data: {
        email: testEmail,
        fullName: 'Spike Test User',
        credential: {
          create: {
            passwordHash,
          },
        },
      },
      include: {
        credential: true,
      },
    });

    testUserId = user.id;
  });

  afterAll(async () => {
    if (testUserId) {
      // Clean up test user (cascades sessions and credentials)
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it('1. Credentials login succeeds and verifies Argon2id password', async () => {
    const user = await prisma.user.findUnique({
      where: { email: testEmail },
      include: { credential: true },
    });

    expect(user).not.toBeNull();
    expect(user?.credential).not.toBeNull();

    const isValid = await argon2.verify(user!.credential!.passwordHash, rawPassword);
    expect(isValid).toBe(true);

    const isInvalid = await argon2.verify(user!.credential!.passwordHash, 'WrongPassword!');
    expect(isInvalid).toBe(false);
  });

  it('2, 3 & 4. Generates opaque token for cookie and stores only SHA-256 hash in database', async () => {
    const rawToken = generateSessionToken();
    const tokenHash = hashToken(rawToken);

    // Opaque token is high entropy base64url (43 chars)
    expect(rawToken.length).toBe(43);
    expect(tokenHash.length).toBe(64);
    expect(rawToken).not.toBe(tokenHash);

    // Create session record in database
    const session = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_user_id', ${testUserId}, true)`;
      return tx.userSession.create({
        data: {
          userId: testUserId,
          sessionTokenHash: tokenHash,
          ipAddress: '127.0.0.1',
          userAgent: 'vitest-agent/1.0',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });
    });

    expect(session.sessionTokenHash).toBe(tokenHash);
    expect(session.sessionTokenHash).not.toContain(rawToken);
  });

  it('5. Server resolves valid active session via token hash', async () => {
    const rawToken = generateSessionToken();
    const tokenHash = hashToken(rawToken);

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_user_id', ${testUserId}, true)`;
      await tx.userSession.create({
        data: {
          userId: testUserId,
          sessionTokenHash: tokenHash,
          ipAddress: '127.0.0.1',
          userAgent: 'vitest-agent/1.0',
          expiresAt: new Date(Date.now() + 86400000),
        },
      });
    });

    // Resolve session by token hash
    const resolvedSession = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_user_id', ${testUserId}, true)`;
      return tx.userSession.findUnique({
        where: { sessionTokenHash: tokenHash },
        include: { user: true },
      });
    });

    expect(resolvedSession).not.toBeNull();
    expect(resolvedSession?.userId).toBe(testUserId);
    expect(resolvedSession?.user.email).toBe(testEmail);
    expect(resolvedSession?.revokedAt).toBeNull();
  });

  it('6 & 7. Revoking session record immediately invalidates session (Single-device signout)', async () => {
    const rawToken = generateSessionToken();
    const tokenHash = hashToken(rawToken);

    const session = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_user_id', ${testUserId}, true)`;
      return tx.userSession.create({
        data: {
          userId: testUserId,
          sessionTokenHash: tokenHash,
          ipAddress: '127.0.0.1',
          userAgent: 'vitest-agent/1.0',
          expiresAt: new Date(Date.now() + 86400000),
        },
      });
    });

    // Revoke session
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_user_id', ${testUserId}, true)`;
      await tx.userSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
    });

    // Resolution check: revoked session must be rejected
    const checked = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_user_id', ${testUserId}, true)`;
      return tx.userSession.findUnique({
        where: { sessionTokenHash: tokenHash },
      });
    });

    expect(checked?.revokedAt).not.toBeNull();
    const isSessionActive = checked !== null && checked.revokedAt === null && checked.expiresAt > new Date();
    expect(isSessionActive).toBe(false);
  });

  it('8. Password reset revokes all sessions across all devices', async () => {
    // Create 3 separate device sessions
    const tokens = [generateSessionToken(), generateSessionToken(), generateSessionToken()];

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_user_id', ${testUserId}, true)`;
      for (const t of tokens) {
        await tx.userSession.create({
          data: {
            userId: testUserId,
            sessionTokenHash: hashToken(t),
            ipAddress: '127.0.0.1',
            userAgent: 'device-agent',
            expiresAt: new Date(Date.now() + 86400000),
          },
        });
      }
    });

    // Simulate password reset transaction: update password & revoke all active sessions for user
    const newPasswordHash = await argon2.hash('NewPassword2026!Reset', {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_user_id', ${testUserId}, true)`;
      await tx.userCredential.update({
        where: { userId: testUserId },
        data: { passwordHash: newPasswordHash, passwordChangedAt: new Date() },
      });
      // Revoke all existing sessions
      await tx.userSession.updateMany({
        where: { userId: testUserId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    // Verify all 3 sessions are now revoked
    const activeSessions = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_user_id', ${testUserId}, true)`;
      return tx.userSession.findMany({
        where: { userId: testUserId, revokedAt: null },
      });
    });

    expect(activeSessions.length).toBe(0);
  });
});
