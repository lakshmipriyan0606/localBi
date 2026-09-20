import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: { url: 'postgresql://localbi_bootstrap:00e944b605f1eb43699df77d18ebe062@127.0.0.1:5432/localbi?schema=public' }
  }
});

async function main() {
  const tenants = await prisma.tenant.findMany({ where: { slug: 'lakshmi-food' }});
  const tenantId = tenants[0].id;
  
  const brands = await prisma.brand.findMany({ where: { tenantId }});
  console.log('Brands:', brands);
  
  const mappings = await prisma.internalResourceMapping.findMany({ where: { tenantId } });
  console.log('Mappings:', mappings);
  
  const extResources = await prisma.externalResource.findMany({ where: { tenantId } });
  console.log('Ext Resources:', extResources);
}

main().then(() => process.exit(0)).catch(console.error);
