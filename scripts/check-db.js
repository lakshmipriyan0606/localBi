import { PrismaClient } from '@prisma/client';

// Use the app's DATABASE_URL env
const prisma = new PrismaClient();

async function main() {
  // Use raw query to bypass RLS
  const resources = await prisma.$queryRaw`
    SELECT id, provider, resource_type, resource_name, external_resource_id, tenant_id
    FROM public.external_resources
    ORDER BY created_at DESC
    LIMIT 30
  `;

  console.log('Total rows:', resources.length);
  for (const r of resources) {
    console.log(` - [${r.provider}] [${r.resource_type}] ${r.resource_name} (${r.external_resource_id})`);
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
