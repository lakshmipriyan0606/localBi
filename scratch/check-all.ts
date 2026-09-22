import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import { prisma } from './src/shared/database/client.ts';

async function checkAll() {
  const resources = await prisma.externalResource.findMany({
    include: { connectionAccess: true }
  });

  console.log(`Total External Resources: ${resources.length}`);
  for (const r of resources) {
    console.log(`- ${r.provider} | ID: ${r.externalResourceId} | canAccess: ${r.connectionAccess[0]?.canAccess}`);
  }
}

checkAll().catch(console.error).finally(() => prisma.$disconnect());
