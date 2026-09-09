import { resetConfigForTest } from '../src/shared/config';
import fs from 'node:fs';
import path from 'node:path';

// Parse .env if present into process.env without external dependencies
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const configOverrides: Partial<import('../src/shared/config').AppConfig> = {
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  SESSION_SECRET: process.env['SESSION_SECRET'] || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  ENCRYPTION_MASTER_KEY: process.env['ENCRYPTION_MASTER_KEY'] || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  ENCRYPTION_KEY_ID: process.env['ENCRYPTION_KEY_ID'] || 'key-test-v1',
  ENABLE_GBP_SYNC: false,
};

if (process.env['DATABASE_URL']) configOverrides.DATABASE_URL = process.env['DATABASE_URL'];
if (process.env['REDIS_QUEUE_URL']) configOverrides.REDIS_QUEUE_URL = process.env['REDIS_QUEUE_URL'];
if (process.env['REDIS_CACHE_URL']) configOverrides.REDIS_CACHE_URL = process.env['REDIS_CACHE_URL'];

resetConfigForTest(configOverrides);
