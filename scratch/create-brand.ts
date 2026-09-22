import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://localbi_bootstrap:00e944b605f1eb43699df77d18ebe062@127.0.0.1:5432/localbi?schema=public',
    },
  },
});

async function main() {
  const tenants = await prisma.tenant.findMany({ where: { slug: 'lakshmi-food' } });
  
  if (tenants.length > 0) {
    const tenantId = tenants[0].id;
    console.log('Tenant:', tenants[0].name);
    
    const brands = await prisma.brand.findMany({ where: { tenantId }});
    if (brands.length === 0) {
      const brand = await prisma.brand.create({
        data: {
          tenantId,
          name: tenants[0].name,
          slug: tenants[0].slug,
        }
      });
      console.log('Created Brand:', brand.name);
    } else {
      console.log('Brand already exists');
    }
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
