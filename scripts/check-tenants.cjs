const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        memberships: {
          include: { user: true }
        }
      }
    });

    console.log('Total tenants found:', tenants.length);
    for (const t of tenants) {
      console.log({
        id: t.id,
        name: t.name,
        slug: t.slug,
        members: t.memberships.map(m => `${m.user.email} (${m.role})`)
      });
    }
  } catch (err) {
    console.error('Error querying tenants:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
