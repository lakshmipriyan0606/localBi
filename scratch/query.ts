import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({
    where: { slug: { contains: 'lakshmi' } }
  });
  console.log('Tenants:', tenants);
  
  if (tenants.length > 0) {
    const ext = await prisma.externalResource.findMany({
      where: { tenantId: tenants[0].id }
    });
    console.log('External Resources:', ext.length);
  }
}

main().then(() => console.log('Done')).catch(console.error).finally(() => prisma.$disconnect());
