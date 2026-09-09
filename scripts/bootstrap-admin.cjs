#!/usr/bin/env node
/**
 * Idempotent Platform Super-Admin Bootstrap CLI.
 *
 * Security Requirements:
 * - Accepts secrets via environment variables or prompt.
 * - ZERO hardcoded default passwords.
 * - Validates strict password complexity.
 * - NEVER prints or logs passwords.
 * - Idempotent: safe to run multiple times.
 */

const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

const ARGON2_CONFIG = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
};

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const fullName = process.env.BOOTSTRAP_ADMIN_NAME || 'Platform Super Admin';

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    console.error('FATAL: BOOTSTRAP_ADMIN_EMAIL must be provided as a valid email address.');
    process.exit(1);
  }

  if (!password || typeof password !== 'string') {
    console.error('FATAL: BOOTSTRAP_ADMIN_PASSWORD environment variable is required.');
    console.error('Refusing execution: No default password is permitted.');
    process.exit(1);
  }

  // Enforce password strength
  if (password.length < 12) {
    console.error('FATAL: BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters.');
    process.exit(1);
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasSpecial = /[\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password);

  if (!hasUpper || !hasLower || !hasSpecial) {
    console.error('FATAL: BOOTSTRAP_ADMIN_PASSWORD must include uppercase, lowercase, and numeric/special characters.');
    process.exit(1);
  }

  const normalizedEmail = email.trim().normalize('NFKC').toLowerCase();
  const prisma = new PrismaClient();

  try {
    console.log(`[BOOTSTRAP] Processing administrator identity for: ${normalizedEmail}`);

    const passwordHash = await argon2.hash(password, ARGON2_CONFIG);

    const result = await prisma.$transaction(async (tx) => {
      // Upsert User
      const user = await tx.user.upsert({
        where: { email: normalizedEmail },
        create: {
          email: normalizedEmail,
          fullName,
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
        },
        update: {
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
        },
      });

      // Upsert UserCredential
      await tx.userCredential.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          passwordHash,
          failedLoginAttempts: 0,
        },
        update: {
          passwordHash,
          failedLoginAttempts: 0,
          lockedUntil: null,
          passwordChangedAt: new Date(),
        },
      });

      // Create or update platform staff access record
      const existingStaff = await tx.platformStaffAccess.findFirst({
        where: {
          userId: user.id,
          role: 'PLATFORM_SUPER_ADMIN',
          revokedAt: null,
        },
      });

      if (!existingStaff) {
        await tx.platformStaffAccess.create({
          data: {
            userId: user.id,
            role: 'PLATFORM_SUPER_ADMIN',
            targetTenantId: 'PLATFORM_GLOBAL',
            reason: 'Platform Bootstrap Initialization',
            approvedBy: 'SYSTEM_BOOTSTRAP',
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          },
        });
      }

      // Record Audit Event
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          actorRole: 'PLATFORM_SUPER_ADMIN',
          action: 'platform:bootstrap_admin',
          resourceType: 'User',
          resourceId: user.id,
          ipAddress: 'BOOTSTRAP_CLI',
          userAgent: 'BOOTSTRAP_CLI',
        },
      });

      return user;
    });

    console.log(`[BOOTSTRAP] Successfully provisioned Platform Super Admin (User ID: ${result.id})`);
    process.exit(0);
  } catch (error) {
    console.error('[BOOTSTRAP] Error provisioning administrator:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
