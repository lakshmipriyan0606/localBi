const argon2 = require('argon2');
const { PrismaClient } = require('@prisma/client');

async function testInsideContainer() {
  console.log('--- 1. Testing Argon2 Inside Linux Container ---');
  const password = 'SuperSecretSecurePassword2026!';
  const start = Date.now();
  const hash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456, // 19 MB (OWASP Profile B)
    timeCost: 2,
    parallelism: 1,
  });
  const elapsed = Date.now() - start;
  console.log(`Argon2 hash generated in ${elapsed}ms:`, hash.substring(0, 30) + '...');
  
  const verifyStart = Date.now();
  const isValid = await argon2.verify(hash, password);
  const verifyElapsed = Date.now() - verifyStart;
  console.log(`Argon2 verification match (${verifyElapsed}ms):`, isValid);
  if (!isValid) throw new Error('Argon2 verification failed inside container');

  console.log('\n--- 2. Testing Prisma Client Inside Linux Container ---');
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  const prisma = new PrismaClient({
    datasources: {
      db: { url: dbUrl },
    },
  });

  const res = await prisma.$queryRaw`SELECT current_user, current_database(), version();`;
  console.log('Prisma live query result from container:', res);
  await prisma.$disconnect();

  console.log('\n=== ALL LINUX CONTAINER GATES PASSED (Argon2 + Prisma) ===');
}

testInsideContainer().catch((err) => {
  console.error('Container validation failed:', err);
  process.exit(1);
});
