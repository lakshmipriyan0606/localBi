import { prisma } from '../src/shared/database/client';

async function main() {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: 'lakshmi-food' },
  });

  if (!tenant) {
    console.log('Tenant lakshmi-food not found');
    return;
  }

  console.log('Found lakshmi-food tenant:', tenant.id);

  const conns = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenant.id}, true)`;
    return tx.integrationConnection.findMany();
  });

  console.log('lakshmi-food connections:', conns);

  const resources = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenant.id}, true)`;
    return tx.externalResource.findMany();
  });
  console.log('lakshmi-food external resources:', resources);

  await prisma.$disconnect();
}

main();
