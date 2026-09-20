import { prisma } from '../src/shared/database/client';

async function main() {
  const sessions = await prisma.session.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { user: true }
  });
  console.log('Recent sessions:');
  sessions.forEach(s => {
    console.log(`Token: ${s.sessionToken.slice(0, 10)}... User: ${s.user.email} (Expires: ${s.expiresAt})`);
  });
  await prisma.$disconnect();
}

main();
