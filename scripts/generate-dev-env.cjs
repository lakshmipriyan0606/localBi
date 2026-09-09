const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function generateSecret(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

function generatePassword(length = 24) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let ret = '';
  for (let i = 0; i < length; i++) {
    ret += charset.charAt(crypto.randomInt(0, charset.length));
  }
  return ret;
}

// Generate new strong credentials
const postgresPassword = generateSecret(16);
const migratorPassword = generateSecret(16);
const appPassword = generateSecret(16);
const redisPassword = generateSecret(16);
const sessionSecret = generateSecret(32);
const encryptionMasterKey = generateSecret(32); // 64 hex characters (32 bytes)

const envContent = `# -----------------------------------------------------------------------------
# localBi — Local Development Environment (.env)
# Automatically generated with rotated, strong development-only credentials
# NEVER commit this file to version control.
# -----------------------------------------------------------------------------

# Application Runtime
NODE_ENV=development
APP_NAME=localbi
APP_DOMAIN=localhost:3000
APP_URL=http://localhost:3000
PORT=3000

# PostgreSQL Container Bootstrap (used only by Docker Compose)
POSTGRES_USER=localbi_bootstrap
POSTGRES_PASSWORD=${postgresPassword}
POSTGRES_DB=localbi
MIGRATOR_PASSWORD=${migratorPassword}
APP_PASSWORD=${appPassword}

# Database Configuration (PostgreSQL 16)
# localbi_app: Restricted application runtime role (NOBYPASSRLS, NOSUPERUSER)
DATABASE_URL=postgresql://localbi_app:${encodeURIComponent(appPassword)}@127.0.0.1:5432/localbi?schema=public

# localbi_migrator: Table owner role, strictly for running schema migrations via directUrl
MIGRATOR_DATABASE_URL=postgresql://localbi_migrator:${encodeURIComponent(migratorPassword)}@127.0.0.1:5432/localbi?schema=public
DIRECT_URL=postgresql://localbi_migrator:${encodeURIComponent(migratorPassword)}@127.0.0.1:5432/localbi?schema=public

# Redis Configuration (Queue & Cache with requirepass authentication)
REDIS_PASSWORD=${redisPassword}
REDIS_QUEUE_URL=redis://:${encodeURIComponent(redisPassword)}@127.0.0.1:6379/0
REDIS_CACHE_URL=redis://:${encodeURIComponent(redisPassword)}@127.0.0.1:6379/1

# Session & Security
SESSION_SECRET=${sessionSecret}
ENCRYPTION_MASTER_KEY=${encryptionMasterKey}
ENCRYPTION_KEY_ID=key-2026-v1

# Google OAuth 2.0 Integration (Tenant Connection Flow)
GOOGLE_CLIENT_ID=mock-client-id-dev.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=mock-client-secret-dev
GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/google/callback

# Feature Flags
ENABLE_GBP_SYNC=false
ENABLE_REGISTRATION=true

# Observability
LOG_LEVEL=info
`;

// Guard against silent overwrite of existing environment file
const envFilePath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFilePath) && !process.argv.includes('--force')) {
  console.log('NOTICE: .env file already exists. To regenerate and rotate credentials, pass --force.');
  process.exit(0);
}

// Write strictly to ignored local .env file (mode 0600)
fs.writeFileSync(envFilePath, envContent, { mode: 0o600 });
console.log('Successfully generated new cryptographically secure credentials into ignored .env (sanitized)');
