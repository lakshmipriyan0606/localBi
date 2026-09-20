import { prisma } from '../src/shared/database/client';

async function main() {
  const tenants = await prisma.tenant.findMany();
  console.log('Tenants:', tenants.map(t => ({ id: t.id, slug: t.slug, name: t.name })));

  for (const t of tenants) {
    // Set tenant context via raw SQL or transaction
    const conns = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${t.id}, true)`;
      return tx.integrationConnection.findMany();
    });
    console.log(`Tenant ${t.slug} (${t.id}) connections:`, conns.map(c => ({ id: c.id, email: c.externalEmail, status: c.status })));
  }

  await prisma.$disconnect();
}

main();
