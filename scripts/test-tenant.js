import { PrismaClient } from '@prisma/client';

const migratorUrl = process.env.DIRECT_URL || process.env.MIGRATOR_DATABASE_URL;
if (!migratorUrl) {
  console.error('Error: DIRECT_URL or MIGRATOR_DATABASE_URL is required');
  process.exit(1);
}

const p = new PrismaClient({
  datasources: {
    db: { url: migratorUrl },
  },
});

async function main() {
  console.log('Testing tenant createMany...');
  const res = await p.tenant.createMany({
    data: [{ id: 'test_t1_' + Date.now(), name: 'T1', slug: 't1-' + Date.now() }],
  });
  console.log('Success:', res);
  await p.$disconnect();
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
