import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://localbi_bootstrap:00e944b605f1eb43699df77d18ebe062@127.0.0.1:5432/localbi?schema=public',
    },
  },
});

async function main() {
  const brand = await prisma.brand.findFirst({ where: { slug: 'lakshmi-food' } });
  if (brand) {
    await prisma.brand.update({
      where: { id: brand.id },
      data: { isArchived: false, archivedAt: null },
    });
    console.log('Unarchived Brand!');
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
