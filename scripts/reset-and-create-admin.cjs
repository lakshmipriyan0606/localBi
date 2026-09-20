/**
 * Script: reset-and-create-admin.cjs
 * 
 * 1. Purges all existing mock tenants, brands, locations, metrics, and memberships.
 * 2. Purges all old mock users and sessions.
 * 3. Provisions a clean Super Admin:
 *    - Email: admin@localbi.com
 *    - Password: Admin@1234
 *    - Role: PLATFORM_SUPER_ADMIN
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
  const migratorUrl =
    process.env.MIGRATOR_DATABASE_URL ||
    process.env.DIRECT_URL ||
    'postgresql://localbi_migrator:8c64a30a649493b0796970d65bdde5e7@127.0.0.1:5432/localbi?schema=public';

  const prisma = new PrismaClient({
    datasources: {
      db: { url: migratorUrl },
    },
  });

  console.log('[RESET] Connecting to database as migrator...');

  try {
    // 1. Purge all existing tenants (cascades to all brands, locations, metrics, etc.)
    const deletedTenants = await prisma.tenant.deleteMany({});
    console.log(`[RESET] Removed ${deletedTenants.count} tenants and all associated brands, locations, and metrics.`);

    // 2. Purge all existing users (cascades to credentials, sessions, staff access, etc.)
    const deletedUsers = await prisma.user.deleteMany({});
    console.log(`[RESET] Removed ${deletedUsers.count} existing mock users.`);

    // 3. Hash the new admin password
    const email = 'admin@localbi.com';
    const password = 'Admin@1234';
    const fullName = 'LocalBi Admin';

    console.log(`[ADMIN] Generating Argon2id hash for ${email}...`);
    const passwordHash = await argon2.hash(password, ARGON2_CONFIG);

    // 4. Create the new Super Admin User
    const adminUser = await prisma.user.create({
      data: {
        email,
        fullName,
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
      },
    });

    // 5. Create Credentials
    await prisma.userCredential.create({
      data: {
        userId: adminUser.id,
        passwordHash,
        failedLoginAttempts: 0,
      },
    });

    // 6. Grant Platform Super Admin staff access
    await prisma.platformStaffAccess.create({
      data: {
        userId: adminUser.id,
        role: 'PLATFORM_SUPER_ADMIN',
        targetTenantId: 'PLATFORM_GLOBAL',
        reason: 'Platform Master Admin Bootstrap',
        approvedBy: 'SYSTEM_BOOTSTRAP',
        expiresAt: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000), // 10 years
      },
    });

    console.log('\n======================================================');
    console.log(' DATABASE SUCCESSFULLY PURGED & CLEAN ADMIN CREATED!  ');
    console.log('======================================================');
    console.log(`User ID   : ${adminUser.id}`);
    console.log(`Email     : ${email}`);
    console.log(`Password  : ${password}`);
    console.log(`Role      : PLATFORM_SUPER_ADMIN`);
    console.log('Zero mock organizations or brands remaining in database.');
    console.log('You can now log in and create your first real organization!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('[RESET] Error resetting database:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
