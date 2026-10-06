const { execSync } = require('node:child_process');

console.log('[deploy-migrations] Checking database migrations...');

function extractHost(connStr) {
  if (!connStr || typeof connStr !== 'string') return null;
  try {
    const u = new URL(connStr);
    return u.hostname;
  } catch {
    const match = connStr.match(/@([^/:?]+)/);
    return match ? match[1] : null;
  }
}

function isLocalhost(host) {
  if (!host) return true;
  const h = host.toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || h === '::1';
}

const isCloud = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

// Candidate connection strings in priority order for running migrations
const candidates = [
  { name: 'MIGRATOR_DATABASE_URL', val: process.env.MIGRATOR_DATABASE_URL },
  { name: 'DIRECT_URL', val: process.env.DIRECT_URL },
  { name: 'DATABASE_URL_DATABASE_URL', val: process.env.DATABASE_URL_DATABASE_URL },
  { name: 'DATABASE_URL_POSTGRES_URL', val: process.env.DATABASE_URL_POSTGRES_URL },
  { name: 'DATABASE_URL_PRISMA_DATABASE_URL', val: process.env.DATABASE_URL_PRISMA_DATABASE_URL },
  { name: 'DATABASE_URL', val: process.env.DATABASE_URL },
];

console.log('[deploy-migrations] Analyzing database connection candidates:');
let chosenUrl = null;
let chosenName = null;

for (const c of candidates) {
  if (!c.val) continue;
  const host = extractHost(c.val);
  const local = isLocalhost(host);
  console.log(`[deploy-migrations]   ${c.name}: host=${host || 'unknown'} (localhost=${local})`);

  if (isCloud && local) {
    // In cloud builds, 127.0.0.1 is unreachable; skip local dev placeholders
    continue;
  }

  if (!chosenUrl) {
    chosenUrl = c.val;
    chosenName = c.name;
  }
}

if (chosenUrl) {
  // If the URL has "-pooler." (e.g. Neon connection pooler), convert to direct unpooled endpoint for migrations
  if (chosenUrl.includes('-pooler.')) {
    console.log(`[deploy-migrations]   Adjusting ${chosenName} to unpooled host for DDL advisory locks`);
    chosenUrl = chosenUrl.replace('-pooler.', '.');
  }

  const chosenHost = extractHost(chosenUrl);
  console.log(`[deploy-migrations] Selected ${chosenName} (host: ${chosenHost}) for migration execution.`);
  process.env.DIRECT_URL = chosenUrl;
  process.env.DATABASE_URL = chosenUrl;
} else {
  console.warn('[deploy-migrations] Notice: No external database candidate selected; using default environment.');
}

try {
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
  console.log('[deploy-migrations] Migrations successfully verified/deployed.');
} catch (err) {
  console.warn('[deploy-migrations] Notice: prisma migrate deploy notice:', err.message);
}
