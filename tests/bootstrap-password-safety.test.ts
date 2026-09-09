import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

describe('Bootstrap Password Handling & SQL Injection Prevention Integration Test', () => {
  const isWslOrLinux = process.platform === 'linux' || Boolean(process.env['WSL_DISTRO_NAME']);
  const containerName = 'localbi_bootstrap_v3-postgres-1';

  // Difficult password containing quotes, semicolons, comments, slashes, ampersands, dollars
  const difficultMigratorPw = 'migrator\'"p@ss;--\\safe$injection#check&more!';
  const difficultAppPw = 'app\'"p@ss;--\\safe$injection#check&more!';
  const testDb = 'localbi_test_pw_safety';

  beforeAll(async () => {
    // Redacted setup
  });

  afterAll(async () => {
    // Clean up test database and temporary roles
    const cleanupSql = `
      DROP DATABASE IF EXISTS ${testDb};
      DROP ROLE IF EXISTS localbi_migrator_pwtest;
      DROP ROLE IF EXISTS localbi_app_pwtest;
    `;
    const dockerPrefix = isWslOrLinux ? 'docker' : 'wsl docker';
    try {
      execSync(`${dockerPrefix} exec -i ${containerName} psql -U localbi_bootstrap -d postgres`, {
        input: cleanupSql,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch {
      // Ignore cleanup failure
    }
  });

  it('safely handles difficult characters and quotes in passwords without SQL injection or syntax errors', async () => {
    const dockerPrefix = isWslOrLinux ? 'docker' : 'wsl docker';

    // 1. Create a disposable test database
    execSync(`${dockerPrefix} exec -i ${containerName} psql -U localbi_bootstrap -d postgres`, {
      input: `CREATE DATABASE ${testDb};`,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // 2. Prepare container execution script that runs init-db logic with difficult passwords
    // Script is sent over stdin to container shell so host cmd.exe never parses difficult chars
    const script = `
set -euo pipefail
set +x
export POSTGRES_USER="localbi_bootstrap"
export POSTGRES_DB="${testDb}"
export MIGRATOR_PASSWORD='${difficultMigratorPw.replace(/'/g, "'\\''")}'
export APP_PASSWORD='${difficultAppPw.replace(/'/g, "'\\''")}'

psql -v ON_ERROR_STOP=1 \\
     --username "$POSTGRES_USER" \\
     --dbname "$POSTGRES_DB" \\
     -v migrator_pw="$MIGRATOR_PASSWORD" \\
     -v app_pw="$APP_PASSWORD" \\
     -v db_name="$POSTGRES_DB" \\
     <<-'EOSQL'
    CREATE ROLE localbi_migrator_pwtest WITH
        LOGIN
        PASSWORD :'migrator_pw'
        NOSUPERUSER
        NOCREATEDB
        NOCREATEROLE
        NOREPLICATION
        NOBYPASSRLS;

    CREATE ROLE localbi_app_pwtest WITH
        LOGIN
        PASSWORD :'app_pw'
        NOSUPERUSER
        NOCREATEDB
        NOCREATEROLE
        NOREPLICATION
        NOBYPASSRLS;

    REVOKE ALL ON DATABASE :"db_name" FROM PUBLIC;
    REVOKE ALL ON SCHEMA public FROM PUBLIC;
    GRANT CONNECT ON DATABASE :"db_name" TO localbi_migrator_pwtest, localbi_app_pwtest;
    ALTER SCHEMA public OWNER TO localbi_migrator_pwtest;
    GRANT USAGE ON SCHEMA public TO localbi_app_pwtest;
EOSQL
`;

    const result = execSync(`${dockerPrefix} exec -i ${containerName} sh`, {
      input: script,
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf-8',
    });

    expect(result).not.toContain(difficultMigratorPw);
    expect(result).not.toContain(difficultAppPw);

    // 3. Verify authentication works using URL-encoded connection string
    const encodedMigratorPw = encodeURIComponent(difficultMigratorPw);
    const migratorUrl = `postgresql://localbi_migrator_pwtest:${encodedMigratorPw}@127.0.0.1:5432/${testDb}?schema=public`;

    const migratorClient = new PrismaClient({
      datasourceUrl: migratorUrl,
    });

    try {
      const migratorRes = await migratorClient.$queryRawUnsafe<Array<{ user: string }>>(
        'SELECT current_user AS user;'
      );
      expect(migratorRes[0]?.user).toBe('localbi_migrator_pwtest');
    } finally {
      await migratorClient.$disconnect();
    }

    const encodedAppPw = encodeURIComponent(difficultAppPw);
    const appUrl = `postgresql://localbi_app_pwtest:${encodedAppPw}@127.0.0.1:5432/${testDb}?schema=public`;

    const appClient = new PrismaClient({
      datasourceUrl: appUrl,
    });

    try {
      const appRes = await appClient.$queryRawUnsafe<Array<{ user: string }>>(
        'SELECT current_user AS user;'
      );
      expect(appRes[0]?.user).toBe('localbi_app_pwtest');
    } finally {
      await appClient.$disconnect();
    }
  });
});
