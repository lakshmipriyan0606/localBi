import { prisma } from '../src/shared/database/client';

async function main() {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: 'lakshmi-food' },
    include: {
      memberships: {
        include: { user: true }
      }
    }
  });

  console.log('Tenant:', tenant?.name, tenant?.slug);
  console.log('Users in tenant:');
  tenant?.memberships.forEach(u => {
    console.log(` - ${u.user.email} (Role: ${u.role})`);
  });

  await prisma.$disconnect();
}

main();
