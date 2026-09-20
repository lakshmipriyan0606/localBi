import { prisma } from '../src/shared/database/client';

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, fullName: true },
    take: 20,
  });
  console.log('USERS:', users);
  await prisma.$disconnect();
}

main();
