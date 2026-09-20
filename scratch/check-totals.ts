import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: { url: 'postgresql://localbi_bootstrap:00e944b605f1eb43699df77d18ebe062@127.0.0.1:5432/localbi?schema=public' }
  }
});

async function main() {
  const totals = await prisma.gscDailyPropertyTotal.findMany();
  console.log('GSC Totals:', totals);
}

main().then(() => process.exit(0)).catch(console.error);
