import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import { prisma } from './src/shared/database/client.ts';

async function verify() {
  const resources = await prisma.externalResource.findMany({
    where: { provider: 'GOOGLE_SEARCH_CONSOLE' },
    include: { connectionAccess: true }
  });

  console.log(`Found ${resources.length} GSC resources`);
  for (const r of resources) {
    const acc = r.connectionAccess[0];
    console.log(`Resource: ${r.externalResourceId}, canAccess=${acc?.canAccess}`);
    if (acc && !acc.canAccess) {
      console.log('Fixing...');
      await prisma.connectionResourceAccess.update({
        where: { id: acc.id },
        data: { canAccess: true }
      });
      console.log('Fixed');
    }
  }
}

verify().catch(console.error).finally(() => prisma.$disconnect());
