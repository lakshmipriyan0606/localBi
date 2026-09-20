import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenantSlug = 'lakshmi-food'; // from the URL in screenshot
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug }});
  if (!tenant) return;

  const gscResources = await prisma.externalResource.findMany({
    where: {
      tenantId: tenant.id,
      provider: 'GOOGLE_SEARCH_CONSOLE',
    },
    include: { internalMappings: true }
  });

  let deletedCount = 0;
  for (const res of gscResources) {
    if (res.internalMappings.length === 0) {
      await prisma.externalResource.delete({
        where: { id: res.id }
      });
      deletedCount++;
    }
  }

  console.log(`Deleted ${deletedCount} unmapped GSC resources`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
