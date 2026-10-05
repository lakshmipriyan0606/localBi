const { execSync } = require('node:child_process');

console.log('[deploy-migrations] Checking database migrations...');
try {
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  console.log('[deploy-migrations] Migrations successfully verified/deployed.');
} catch (err) {
  console.warn('[deploy-migrations] Notice: prisma migrate deploy notice:', err.message);
}
