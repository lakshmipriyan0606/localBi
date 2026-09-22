import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://localbi_bootstrap:00e944b605f1eb43699df77d18ebe062@127.0.0.1:5432/localbi?schema=public',
    },
  },
});

async function main() {
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1
  });
  
  if (tenants.length > 0) {
    const tenantId = tenants[0].id;
    console.log('Tenant:', tenants[0].slug);
    
    const brands = await prisma.brand.findMany({ where: { tenantId }});
    console.log('Brands:', brands.length);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
