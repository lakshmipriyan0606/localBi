import { prisma } from '../src/shared/database/client';

async function checkResources() {
  const resources = await prisma.externalResource.findMany({
    include: { connectionAccess: true }
  });

  console.log(`Found ${resources.length} total resources`);
  for (const r of resources) {
    console.log(`Resource: ${r.provider} - ${r.externalResourceId}, Accesses: ${r.connectionAccess.length}`);
    for (const acc of r.connectionAccess) {
      console.log(`  Access: canAccess=${acc.canAccess}`);
    }
  }
}

checkResources().catch(console.error).finally(() => prisma.$disconnect());
