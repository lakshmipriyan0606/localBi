const crypto = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');

// Permanent invalid-authentication regression test
// Uses dynamically generated random wrong credentials to verify that invalid passwords
// are strictly rejected by PostgreSQL and Redis. No historical credentials or reversible
// encodings are retained.
async function testInvalidAuthentication() {
  console.log('=== Testing Authentication Failure with Generated Invalid Credentials ===');
  let allFailed = true;

  const rolesToTest = [
    { label: 'postgres / invalid_password', user: 'postgres' },
    { label: 'localbi_bootstrap / invalid_password', user: 'localbi_bootstrap' },
    { label: 'localbi_migrator / invalid_password', user: 'localbi_migrator' },
    { label: 'localbi_app / invalid_password', user: 'localbi_app' },
  ];

  for (const tc of rolesToTest) {
    const invalidPassword = `inv_${crypto.randomBytes(24).toString('hex')}`;
    const url = `postgresql://${tc.user}:${encodeURIComponent(invalidPassword)}@127.0.0.1:5432/localbi?schema=public`;
    const client = new PrismaClient({ datasourceUrl: url });
    try {
      await client.$queryRawUnsafe('SELECT 1;');
      console.error(`SECURITY_VIOLATION: Invalid credential accepted for [${tc.label}]!`);
      allFailed = false;
    } catch {
      console.log(`CONFIRMED: Authentication correctly REJECTED for [${tc.label}].`);
    } finally {
      await client.$disconnect().catch(() => {});
    }
  }

  const redisCases = [
    { label: 'redis / invalid_random_password', pass: `inv_${crypto.randomBytes(24).toString('hex')}` },
    { label: 'redis / unauthenticated_empty_password', pass: '' },
  ];

  for (const tc of redisCases) {
    const redis = new Redis({
      host: '127.0.0.1',
      port: 6379,
      password: tc.pass || undefined,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      retryStrategy: () => null,
      lazyConnect: true,
    });
    try {
      await redis.connect();
      await redis.ping();
      console.error(`SECURITY_VIOLATION: Invalid Redis credential accepted for [${tc.label}]!`);
      allFailed = false;
    } catch {
      console.log(`CONFIRMED: Authentication correctly REJECTED for [${tc.label}].`);
    } finally {
      redis.disconnect();
    }
  }

  if (!allFailed) {
    throw new Error('SECURITY_VIOLATION: One or more invalid credentials was accepted by a running service!');
  }
  console.log('\nCONFIRMED: All invalid credentials strictly failed authentication against running instances.');
}

testInvalidAuthentication().catch((err) => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
