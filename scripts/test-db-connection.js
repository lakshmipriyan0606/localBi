import { PrismaClient } from '@prisma/client';

async function testConnection() {
  const migratorUrl = process.env.DIRECT_URL || process.env.MIGRATOR_DATABASE_URL;
  const appUrl = process.env.DATABASE_URL;
  if (!migratorUrl || !appUrl) {
    console.error('Error: DIRECT_URL (or MIGRATOR_DATABASE_URL) and DATABASE_URL are required');
    process.exit(1);
  }

  const migrator = new PrismaClient({
    datasources: {
      db: { url: migratorUrl },
    },
  });

  try {
    const res = await migrator.$queryRaw`SELECT current_user, current_database(), version();`;
    console.log('Migrator connected successfully:', res);
  } catch (err) {
    console.error('Migrator connection failed:', err);
    process.exit(1);
  } finally {
    await migrator.$disconnect();
  }

  console.log('\nTesting connection as localbi_app...');
  const app = new PrismaClient({
    datasources: {
      db: { url: appUrl },
    },
  });

  try {
    const res = await app.$queryRaw`SELECT current_user, current_database();`;
    console.log('App connected successfully:', res);
  } catch (err) {
    console.error('App connection failed:', err);
    process.exit(1);
  } finally {
    await app.$disconnect();
  }
}

testConnection().catch(console.error);
