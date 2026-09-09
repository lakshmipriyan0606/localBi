const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

async function main() {
  const migratorUrl = process.env.DIRECT_URL || process.env.MIGRATOR_DATABASE_URL;
  if (!migratorUrl) {
    throw new Error('DIRECT_URL or MIGRATOR_DATABASE_URL must be defined');
  }

  const prisma = new PrismaClient({ datasources: { db: { url: migratorUrl } } });
  try {
    const migrations = await prisma.$queryRaw`
      SELECT id, migration_name, checksum, finished_at, rolled_back_at, started_at, applied_steps_count
      FROM _prisma_migrations
      ORDER BY started_at ASC;
    `;

    console.log('--- _prisma_migrations Catalog Inspection ---');
    console.log(`Total applied migrations: ${migrations.length}`);
    for (const m of migrations) {
      console.log(`- Migration ID: ${m.id}`);
      console.log(`  Name: ${m.migration_name}`);
      console.log(`  Applied Steps: ${m.applied_steps_count}`);
      console.log(`  Started At: ${m.started_at}`);
      console.log(`  Finished At: ${m.finished_at}`);
      console.log(`  Rolled Back At: ${m.rolled_back_at}`);
      console.log(`  Checksum: ${m.checksum}`);
    }

    const failed = migrations.filter((m) => m.finished_at === null || m.rolled_back_at !== null);
    if (failed.length === 0) {
      console.log('CONFIRMED: Zero failed or rolled-back migrations in _prisma_migrations.');
    } else {
      console.error(`ERROR: Found ${failed.length} failed or rolled-back migrations.`);
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Inspection error:', err.message);
  process.exit(1);
});
