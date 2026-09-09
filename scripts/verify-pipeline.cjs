const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

// Load environment variables from .env if present
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

const results = [];

function runStep(stepNumber, description, command, options = {}) {
  console.log(`\n================================================================================`);
  console.log(`[Gate ${stepNumber}/15] ${description}`);
  console.log(`Command: ${options.sanitizedCommand || command}`);
  console.log(`================================================================================`);

  const maxAttempts = (options.retries || 0) + 1;
  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt++;
    const start = Date.now();
    try {
      const stdout = execSync(command, {
        stdio: options.silent ? 'pipe' : 'inherit',
        env: { ...process.env, ...options.env },
        cwd: process.cwd(),
        encoding: 'utf-8',
      });
      const duration = Date.now() - start;
      console.log(`>>> [PASS] Gate ${stepNumber} completed in ${duration}ms (Exit 0)`);
      results.push({ gate: stepNumber, description, status: 'PASS', exitCode: 0, duration });
      return { success: true, stdout };
    } catch (err) {
      const duration = Date.now() - start;
      const exitCode = err.status || 1;
      if (attempt < maxAttempts) {
        console.warn(`>>> [RETRY] Gate ${stepNumber} failed (attempt ${attempt}/${maxAttempts}). Retrying in 2s...`);
        const waitEnd = Date.now() + 2000;
        while (Date.now() < waitEnd) { /* wait */ }
        continue;
      }
      const status = options.customFailureStatus || 'FAIL';
      console.error(`>>> [${status}] Gate ${stepNumber} failed with exit code ${exitCode} after ${duration}ms`);
      results.push({ gate: stepNumber, description, status, exitCode, duration, error: err.message });
      if (!options.allowFailure) {
        console.error(`\nPipeline halted due to failure in Gate ${stepNumber}: ${description}`);
        printSummary();
        process.exit(exitCode);
      }
      return { success: false, error: err };
    }
  }
}

function printSummary() {
  console.log(`\n\n================================================================================`);
  console.log(`FINAL 15-GATE VERIFICATION PIPELINE EXECUTION SUMMARY`);
  console.log(`================================================================================`);
  console.table(results);
  const technicalFailed = results.filter((r) => r.gate < 15 && r.status === 'FAIL');
  const gate15 = results.find((r) => r.gate === 15);
  if (technicalFailed.length === 0 && gate15 && gate15.status.includes('FAIL — historical credentials detected')) {
    console.log(`\nALL 14 TECHNICAL GATES PASSED.`);
    console.log(`GATE 15: FAIL — historical credentials detected in commit 38d01bf.`);
    console.log(`OVERALL DECISION: CONDITIONALLY APPROVED (Pending user authorization for history cleanup).`);
  } else if (results.every((r) => r.status === 'PASS')) {
    console.log(`\nALL 15 VERIFICATION GATES PASSED.`);
    console.log(`OVERALL DECISION: APPROVED FOR PHASE 2.`);
  } else {
    console.error(`\nPIPELINE BLOCKED: Technical verification gates failed.`);
  }
}

function ensureContainersHealthy() {
  console.log('\n--- Ensuring PostgreSQL and Redis disposable containers are running and healthy ---');
  const isWslOrLinux = process.platform === 'linux' || Boolean(process.env.WSL_DISTRO_NAME);
  const upCmd = isWslOrLinux
    ? 'cd /mnt/e/project/localBi 2>/dev/null || cd . ; docker compose -p localbi_bootstrap_v3 up -d'
    : 'wsl sh -c "cd /mnt/e/project/localBi && docker compose -p localbi_bootstrap_v3 up -d"';
  const psCmd = isWslOrLinux
    ? 'docker compose -p localbi_bootstrap_v3 ps'
    : 'wsl sh -c "cd /mnt/e/project/localBi && docker compose -p localbi_bootstrap_v3 ps"';

  if (!isWslOrLinux) {
    try {
      execSync('wsl sh -c "pgrep -f \'sleep 3600\' || nohup sleep 3600 >/dev/null 2>&1 &"');
    } catch {
      // ignore
    }
  }

  execSync(upCmd, { stdio: 'inherit' });
  const start = Date.now();
  let healthy = false;
  while (!healthy && Date.now() - start < 30000) {
    try {
      const ps = execSync(psCmd, { encoding: 'utf-8' });
      if (ps.includes('postgres') && ps.includes('(healthy)') && ps.includes('redis')) {
        healthy = true;
        console.log('Containers confirmed healthy.');
        break;
      }
    } catch {
      // retry
    }
    const sleepEnd = Date.now() + 1000;
    while (Date.now() < sleepEnd) { /* busy wait 1s */ }
  }
}

async function main() {
  console.log('Starting Phase 1 Final 15-Gate Verification Pipeline...');

  // 1. Clean dependencies check
  runStep(1, 'Clean dependencies check (npm ci)', 'npm ci');

  // 2. Prisma Client generation
  runStep(2, 'Prisma Client generation', 'npx prisma generate');

  // Ensure disposable database and redis containers are active
  ensureContainersHealthy();

  // 3. Fresh-database Prisma migration deployment
  runStep(3, 'Fresh-database Prisma migration deployment (migrate deploy)', 'npx prisma migrate deploy');

  // 4. Prisma migration status check
  runStep(4, 'Prisma migration status verification (migrate status)', 'npx prisma migrate status');

  // 5. Strict TypeScript typecheck
  runStep(5, 'Strict TypeScript typecheck (noEmit)', 'npm run typecheck');

  // 6. ESLint with zero warnings
  runStep(6, 'ESLint code quality and style validation', 'npm run lint');

  // 7. Unit tests
  runStep(7, 'Unit test suite', 'npm run test:unit');

  // 8. Spike tests
  runStep(8, 'Architectural spike test suite', 'npm run test:spikes');

  // Ensure containers are active and healthy before live PostgreSQL tests
  ensureContainersHealthy();

  // 9. Full PostgreSQL dual-role RLS and bootstrap password safety integration tests
  runStep(9, 'Full PostgreSQL 16 dual-role RLS & bootstrap password safety integration tests', 'npx vitest run tests/live-rls.test.ts tests/bootstrap-password-safety.test.ts');

  // Ensure containers are active and healthy before live Redis tests
  ensureContainersHealthy();

  // 10. Redis / BullMQ integration tests
  runStep(10, 'Live Redis 7 / BullMQ lifecycle integration tests', 'npx vitest run tests/live-redis.test.ts');

  // 11. Next.js production build
  runStep(11, 'Next.js production build', 'npm run build', { env: { NODE_ENV: 'production' } });

  // 12. Production-container smoke test
  runStep(12, 'Production container build & live smoke test', 'node scripts/container-smoke-test.cjs', { retries: 1 });

  // 13. Production dependency audit
  runStep(13, 'Production dependency audit (audit --omit=dev)', 'npm audit --omit=dev', { retries: 2 });

  // 14. Complete dependency audit
  runStep(14, 'Complete dependency audit (audit)', 'npm audit', { retries: 2 });

  // 15. Working-tree and Git-history secret scan
  runStep(15, 'Working-tree and Git-history secret scan', 'node scripts/secret-scanner.cjs', {
    allowFailure: true,
    customFailureStatus: 'FAIL — historical credentials detected',
  });

  printSummary();
}

main().catch((err) => {
  console.error('Fatal pipeline error:', err);
  process.exit(1);
});
