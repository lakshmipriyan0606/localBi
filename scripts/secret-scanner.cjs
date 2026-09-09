const { execSync } = require('child_process');

console.log('================================================================================');
console.log('STAGE 4 / GATE 15: COMPREHENSIVE SECRET INVESTIGATION & AUDIT');
console.log('================================================================================\n');

let hasViolations = false;
let hasHistoricalCommit = false;

// 1. Check if historical commit 38d01bf is reachable or exists
try {
  execSync('git cat-file -e 38d01bf^{commit}', { stdio: 'pipe' });
  hasHistoricalCommit = true;
  console.log('--- Historical Commit 38d01bf Audit ---');
  console.log('NOTICE: Historical commit 38d01bf exists in object database.');
} catch {
  console.log('--- Historical Commit 38d01bf Verification ---');
  console.log('CONFIRMED: Historical commit 38d01bf is completely absent from Git object database.');
}

// 2. Pinned Gitleaks Scan across ALL commits and refs (--all)
console.log('\n--- 2. Pinned Gitleaks (v8.24.0) Full History & All-Refs Scan ---');
try {
  const glAllCmd = 'wsl docker run --rm -v /mnt/e/project/localBi:/repo zricethezav/gitleaks:v8.24.0 git /repo --log-opts="--all" --redact';
  const out = execSync(glAllCmd, { encoding: 'utf-8', stdio: 'pipe' });
  console.log(out.trim());
  console.log('Gitleaks all-refs scan: PASS (0 leaks found across entire repository history)');
} catch (err) {
  const stdout = err.stdout ? err.stdout.toString() : '';
  const stderr = err.stderr ? err.stderr.toString() : '';
  const full = stdout + stderr;
  if (full.includes('leaks found: 0') || full.includes('no leaks found')) {
    console.log('Gitleaks all-refs scan: PASS (0 leaks found across entire repository history)');
  } else {
    console.error('Gitleaks all-refs scan: FAILED — leaks detected in Git history:');
    console.error(full);
    hasViolations = true;
  }
}

// 3. Pinned Gitleaks Scan on Staged & Uncommitted Content
console.log('\n--- 3. Pinned Gitleaks Scan (Staged & Uncommitted Content) ---');
try {
  const glStagedCmd = 'wsl docker run --rm -v /mnt/e/project/localBi:/repo zricethezav/gitleaks:v8.24.0 git /repo --staged --redact';
  execSync(glStagedCmd, { encoding: 'utf-8', stdio: 'pipe' });
  console.log('Gitleaks staged scan: PASS (0 leaks found)');
} catch (err) {
  const full = (err.stdout ? err.stdout.toString() : '') + (err.stderr ? err.stderr.toString() : '');
  if (full.includes('leaks found: 0') || full.includes('no leaks found')) {
    console.log('Gitleaks staged scan: PASS (0 leaks found)');
  } else {
    console.error('Gitleaks staged scan: FAILED');
    hasViolations = true;
  }
}

// 4. Known Development Password Signatures in Working Tree
console.log('\n--- 4. Tracked Working Tree Known Dev Password Signatures ---');
const knownSignatures = [
  { label: 'migrator_dev_*', pattern: 'migrator_dev_password' },
  { label: 'app_dev_*', pattern: 'app_dev_password' },
  { label: 'postgres_root_*', pattern: 'postgres_root_password' },
  { label: 'migrator_secret_*', pattern: 'migrator_secret_change_me' },
  { label: 'app_secret_*', pattern: 'app_secret_change_me' },
];

for (const item of knownSignatures) {
  try {
    const res = execSync(`git grep -l "${item.pattern}"`, { encoding: 'utf-8' });
    const files = res.trim().split('\n').filter((f) => f && f !== 'scripts/secret-scanner.cjs');
    if (files.length > 0) {
      console.error(`VIOLATION: Pattern [${item.label}] found in ${files.length} tracked file(s): ${files.join(', ')}`);
      hasViolations = true;
    } else {
      console.log(`Pattern [${item.label}]: 0 occurrences in tracked files`);
    }
  } catch {
    console.log(`Pattern [${item.label}]: 0 occurrences in tracked files`);
  }
}

// 5. Targeted File-Type Inspection (SQL, JS, TS, YAML, Docker, Markdown)
console.log('\n--- 5. Targeted File-Type Inspection (SQL, JS, TS, YAML, Docker, Markdown) ---');
const genericChecks = [
  { label: 'Private Key Block', regex: 'BEGIN (RSA|EC|PGP|OPENSSH)? ?PRIVATE KEY' },
  { label: 'AWS Access Key ID', regex: 'AKIA[0-9A-Z]{16}' },
  { label: 'Slack Webhook URL', regex: 'https://hooks.slack.com/services/T[0-9A-Z_]+/B[0-9A-Z_]+/[0-9A-Za-z]+' },
  { label: 'GitHub Personal Access Token', regex: 'ghp_[0-9a-zA-Z]{36}' },
];

for (const gc of genericChecks) {
  try {
    const res = execSync(`git grep -E -l "${gc.regex}"`, { encoding: 'utf-8' });
    const files = res.trim().split('\n').filter((f) => f && f !== 'scripts/secret-scanner.cjs');
    if (files.length > 0) {
      console.error(`VIOLATION: Generic secret pattern [${gc.label}] found in: ${files.join(', ')}`);
      hasViolations = true;
    } else {
      console.log(`Check [${gc.label}]: 0 matches`);
    }
  } catch {
    console.log(`Check [${gc.label}]: 0 matches`);
  }
}

console.log('\n================================================================================');
if (hasViolations || hasHistoricalCommit) {
  if (hasHistoricalCommit) {
    console.error('SECRET SCAN RESULT: FAIL — historical credentials detected in commit 38d01bf.');
    console.error('Commit 38d01bf still exists in repository. History rewrite required.');
    process.exit(2);
  } else {
    console.error('SECRET SCAN RESULT: FAILED — Disallowed secret patterns exist in repository.');
    process.exit(1);
  }
} else {
  console.log('SECRET SCAN RESULT: PASSED — Zero leaks across Git history, refs, and working tree.');
  process.exit(0);
}
console.log('================================================================================');
