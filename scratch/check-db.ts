import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://localbi_bootstrap:00e944b605f1eb43699df77d18ebe062@127.0.0.1:5432/localbi?schema=public',
    },
  },
});

async function main() {
  const tenants = await prisma.tenant.findMany({ where: { slug: 'lakshmi-food' }});
  console.log('Tenants:', JSON.stringify(tenants, null, 2));

  if (tenants.length > 0) {
    const tenantId = tenants[0].id;
    const mappings = await prisma.internalResourceMapping.findMany({ where: { tenantId }});
    console.log('Mappings:', JSON.stringify(mappings, null, 2));

    const external = await prisma.externalResource.findMany({ where: { tenantId }});
    console.log('External Resources:', JSON.stringify(external, null, 2));
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
