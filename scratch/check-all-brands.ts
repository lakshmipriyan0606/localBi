import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://localbi_bootstrap:00e944b605f1eb43699df77d18ebe062@127.0.0.1:5432/localbi?schema=public',
    },
  },
});

async function main() {
  const tenants = await prisma.tenant.findMany();
  for (const t of tenants) {
    const brands = await prisma.brand.findMany({ where: { tenantId: t.id }});
    console.log(`Tenant: ${t.slug} - Brands: ${brands.length}`);
    console.log(brands);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
