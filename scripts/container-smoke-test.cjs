const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

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

const isWslOrLinux = process.platform === 'linux' || Boolean(process.env['WSL_DISTRO_NAME']);

function dockerCmd(cmd) {
  if (isWslOrLinux) {
    return cmd;
  }
  return `wsl ${cmd}`;
}

function runCmd(cmd, silent = false) {
  let attempts = 0;
  while (attempts < 3) {
    attempts++;
    try {
      const res = execSync(dockerCmd(cmd), {
        stdio: 'pipe',
        encoding: 'utf-8',
      });
      if (!silent && res.trim()) {
        console.log(res.trim());
      }
      return res;
    } catch (err) {
      const msg = (err.message || '') + (err.stdout ? err.stdout.toString() : '') + (err.stderr ? err.stderr.toString() : '');
      if (attempts < 3 && (msg.includes('0x8007274c') || err.status === 4294967295 || err.status === 1)) {
        console.warn(`Transient command failure (attempt ${attempts}/3). Retrying in 2s...`);
        const sleepUntil = Date.now() + 2000;
        while (Date.now() < sleepUntil) {}
        continue;
      }
      throw err;
    }
  }
}

function runCmdOutput(cmd) {
  let attempts = 0;
  while (attempts < 3) {
    attempts++;
    try {
      return execSync(dockerCmd(cmd), {
        stdio: 'pipe',
        encoding: 'utf-8',
      }).trim();
    } catch (err) {
      const msg = (err.message || '') + (err.stdout ? err.stdout.toString() : '') + (err.stderr ? err.stderr.toString() : '');
      if (attempts < 3 && (msg.includes('0x8007274c') || err.status === 4294967295 || err.status === 1)) {
        console.warn(`Transient command output failure (attempt ${attempts}/3). Retrying in 2s...`);
        const sleepUntil = Date.now() + 2000;
        while (Date.now() < sleepUntil) {}
        continue;
      }
      throw err;
    }
  }
}

function fetchHttp(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ statusCode: res.statusCode, body }));
      })
      .on('error', reject);
  });
}

async function smokeTest() {
  console.log('=== Stage 7: Production-Container Proof & Smoke Test ===\n');

  const containerName = 'localbi-prod-smoke';

  // 1. Build production image with multi-stage build
  console.log('--- Step 7.1: Building production Linux container (localbi:production) ---');
  const projectPath = isWslOrLinux ? '.' : '/mnt/e/project/localBi';
  runCmd(`docker build -t localbi:production ${projectPath}`);

  // 2. Inspect image files to ensure no .env, tests, or scripts exist in runtime image
  console.log('\n--- Step 7.2: Verifying runtime container filesystem isolation ---');
  const files = runCmdOutput('docker run --rm localbi:production ls -la');
  console.log('Runtime directory contents:\n' + files);
  if (files.includes('.env') || files.includes(' tests') || files.includes(' spikes')) {
    throw new Error('SECURITY_VIOLATION: Secrets, tests, or spikes found in production runtime container image!');
  }
  console.log('CONFIRMED: Zero .env, tests, or unnecessary files present in runner image.');

  // Clean up any stale smoke test container
  try {
    runCmdOutput(`docker rm -f ${containerName}`);
  } catch {
    // Ignore error if container does not exist
  }

  // 3. Start Next.js production server inside container on Compose network
  console.log('\n--- Step 7.3: Starting production container on localbi-network ---');
  const appPassword = process.env.APP_PASSWORD;
  const redisPassword = process.env.REDIS_PASSWORD;
  const sessionSecret = process.env.SESSION_SECRET;
  const masterKey = process.env.ENCRYPTION_MASTER_KEY;

  if (!appPassword || !redisPassword) {
    throw new Error('APP_PASSWORD and REDIS_PASSWORD must be defined in environment');
  }

  const networkName = runCmdOutput('docker network ls --filter name=localbi-network --format {{.Name}}').split('\n')[0].trim() || 'localbi_bootstrap_v3_localbi-network';

  const runCmdStr = `docker run -d --name ${containerName} ` +
    `--network ${networkName} ` +
    `-p 127.0.0.1:3001:3000 ` +
    `-e NODE_ENV=production ` +
    `-e DATABASE_URL=postgresql://localbi_app:${encodeURIComponent(appPassword)}@localbi-postgres:5432/localbi?schema=public ` +
    `-e REDIS_QUEUE_URL=redis://:${encodeURIComponent(redisPassword)}@localbi-redis:6379/0 ` +
    `-e REDIS_CACHE_URL=redis://:${encodeURIComponent(redisPassword)}@localbi-redis:6379/1 ` +
    `-e SESSION_SECRET=${sessionSecret} ` +
    `-e ENCRYPTION_MASTER_KEY=${masterKey} ` +
    `-e ENCRYPTION_KEY_ID=key-prod-v1 ` +
    `localbi:production`;

  runCmd(runCmdStr);

  try {
    // 4. Verify process runs as non-root user
    console.log('\n--- Step 7.4: Verifying process runs as non-root user (node) ---');
    const idInfo = runCmdOutput(`docker exec ${containerName} id`);
    console.log(`id: ${idInfo}`);
    if (!idInfo.includes('uid=1000(node)')) {
      throw new Error(`SECURITY_VIOLATION: Container running with unexpected id: ${idInfo}, expected non-root user node (uid 1000)!`);
    }
    console.log('CONFIRMED: Process is executing strictly as non-root user "node" (uid 1000).');

    // 5. Poll Next.js health endpoint until server is ready
    console.log('\n--- Step 7.5: Polling Next.js production server readiness ---');
    let isReady = false;
    let healthResponse = null;
    const startPoll = Date.now();

    while (!isReady && Date.now() - startPoll < 30000) {
      try {
        const res = await fetchHttp('http://127.0.0.1:3001/api/health');
        if (res.statusCode === 200) {
          healthResponse = JSON.parse(res.body);
          isReady = true;
          break;
        }
      } catch {
        // Server still starting
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    if (!isReady || !healthResponse) {
      const logs = runCmdOutput(`docker logs ${containerName}`);
      console.error('Container logs on failure:\n' + logs);
      throw new Error('Next.js server failed to respond with HTTP 200 at /api/health within 30s');
    }

    console.log('Health Endpoint Response (HTTP 200):', healthResponse);
    if (healthResponse.database !== 'connected' || healthResponse.redis !== 'connected') {
      throw new Error(`Infrastructure check degraded: DB=${healthResponse.database}, Redis=${healthResponse.redis}`);
    }
    console.log('CONFIRMED: Health endpoint reports database: connected, redis: connected.');

    // 6. Test main route
    console.log('\n--- Step 7.6: Testing main route (/) ---');
    const homeRes = await fetchHttp('http://127.0.0.1:3001/');
    console.log(`Home Route HTTP status: ${homeRes.statusCode}`);
    if (homeRes.statusCode !== 200 || !homeRes.body.includes('localBi Foundation')) {
      throw new Error(`Home route returned invalid response (Status ${homeRes.statusCode})`);
    }
    console.log('CONFIRMED: Main route returned HTTP 200 with valid application content.');

    // 7. Verify graceful shutdown
    console.log('\n--- Step 7.7: Testing graceful shutdown (SIGTERM) ---');
    runCmd(`docker stop -t 10 ${containerName}`);
    const exitCode = runCmdOutput(`docker inspect ${containerName} --format {{.State.ExitCode}}`);
    console.log(`Container exit code after SIGTERM: ${exitCode}`);
    if (exitCode !== '0' && exitCode !== '143') {
      throw new Error(`Container did not exit cleanly: exit code ${exitCode}`);
    }
    console.log(`CONFIRMED: Container stopped gracefully and exited cleanly with code ${exitCode} (SIGTERM).`);

    console.log('\n=== ALL STAGE 7 PRODUCTION CONTAINER CHECKS PASSED ===');
  } finally {
    try {
      runCmdOutput(`docker rm -f ${containerName}`);
    } catch {
      // Ignore cleanup error
    }
  }
}

smokeTest().catch((err) => {
  console.error('Production smoke test failed:', err);
  process.exit(1);
});
