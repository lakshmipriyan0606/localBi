const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: { url: 'postgresql://localbi_migrator:8c64a30a649493b0796970d65bdde5e7@127.0.0.1:5432/localbi?schema=public' }
  }
});

async function main() {
  const tenants = await prisma.tenant.findMany();
  console.log('All tenants:', tenants.map(t => ({ id: t.id, name: t.name, slug: t.slug })));
  
  const conns = await prisma.$queryRawUnsafe(`SELECT id, tenant_id, provider, external_email, created_at, status FROM integration_connections`);
  console.log('All connections:', conns);
  
  const resources = await prisma.$queryRawUnsafe(`SELECT id, tenant_id, provider, resource_type, resource_name, external_resource_id FROM external_resources`);
  console.log('All resources (' + resources.length + '):', resources);
  
  const mappings = await prisma.$queryRawUnsafe(`SELECT id, tenant_id, internal_type, internal_id, resource_id FROM internal_resource_mappings`);
  console.log('All mappings (' + mappings.length + '):', mappings);
}

main().catch(console.error).finally(() => prisma.$disconnect());
