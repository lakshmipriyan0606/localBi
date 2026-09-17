const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const emails = ['operator@example.com', 'viewer.chennai@abcdental.example', 'admin@example.com'];
    for (const email of emails) {
      const u = await prisma.user.findUnique({
        where: { email },
        include: {
          credential: true,
          memberships: {
            include: { tenant: true }
          }
        }
      });
      console.log('User result for', email, ':', u ? {
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        hasCredential: Boolean(u.credential),
        failedAttempts: u.credential ? u.credential.failedLoginAttempts : null,
        lockedUntil: u.credential ? u.credential.lockedUntil : null,
        tenants: u.memberships.map(m => `${m.tenant.slug} (${m.role})`)
      } : 'NOT_FOUND');
    }
  } catch (err) {
    console.error('Error querying users:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
