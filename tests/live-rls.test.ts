import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient, Prisma } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import { TenantContextService } from '../src/shared/database/tenant-context';
import { getConfig } from '../src/shared/config';

// Programmatically derive every model containing tenantId from Prisma DMMF
const DERIVED_TENANT_TABLES = Prisma.dmmf.datamodel.models
  .filter((model) => model.fields.some((field) => field.name === 'tenantId'))
  .map((model) => model.dbName || model.name);

export const EXPECTED_TENANT_TABLES = DERIVED_TENANT_TABLES;

describe('Live PostgreSQL 16 Dual-Role Row-Level Security (RLS) Exhaustive Integration Tests', () => {
  const appDbUrl = process.env['DATABASE_URL'];
  const migratorDbUrl = process.env['DIRECT_URL'] || process.env['MIGRATOR_DATABASE_URL'];

  if (!appDbUrl || !migratorDbUrl) {
    throw new Error('DATABASE_URL and DIRECT_URL (or MIGRATOR_DATABASE_URL) must be set in environment');
  }

  let migratorPrisma: PrismaClient;
  let appPrisma: PrismaClient;

  const tenantAId = `tenant_test_a_${Date.now()}`;
  const tenantBId = `tenant_test_b_${Date.now()}`;
  const brandAId = `brand_a_${Date.now()}`;
  const brandBId = `brand_b_${Date.now()}`;

  beforeAll(async () => {
    migratorPrisma = new PrismaClient({ datasources: { db: { url: migratorDbUrl } } });
    appPrisma = new PrismaClient({ datasources: { db: { url: appDbUrl } } });

    // Wait for database readiness if container was recently started
    let connected = false;
    const startWait = Date.now();
    while (!connected && Date.now() - startWait < 15000) {
      try {
        await migratorPrisma.$queryRaw`SELECT 1`;
        connected = true;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Ensure control plane tenants exist
    await migratorPrisma.tenant.createMany({
      data: [
        { id: tenantAId, name: 'Tenant Alpha Corp', slug: `alpha-${Date.now()}` },
        { id: tenantBId, name: 'Tenant Beta Corp', slug: `beta-${Date.now()}` },
      ],
      skipDuplicates: true,
    });
  });

  afterAll(async () => {
    try {
      // Clean up test tenants as migrator
      await migratorPrisma.brand.deleteMany({
        where: { tenantId: { in: [tenantAId, tenantBId] } },
      });
      await migratorPrisma.tenant.deleteMany({
        where: { id: { in: [tenantAId, tenantBId] } },
      });
    } catch {
      // Ignore cleanup error in teardown
    } finally {
      await appPrisma.$disconnect();
      await migratorPrisma.$disconnect();
    }
  });

  // --- Stage 5: Role & Privilege Constraints ---

  // --- Stage 5: Role & Privilege Constraints (Three-Role Architecture) ---

  it('Gate 5.1A: Bootstrap Administrator Isolation (credentials strictly absent from application config)', () => {
    const config = getConfig();
    expect((config as Record<string, unknown>)['POSTGRES_USER']).toBeUndefined();
    expect((config as Record<string, unknown>)['POSTGRES_PASSWORD']).toBeUndefined();
    expect((config as Record<string, unknown>)['DIRECT_URL']).toBeUndefined();
    expect((config as Record<string, unknown>)['MIGRATOR_DATABASE_URL']).toBeUndefined();
    const parsedUrl = new URL(config.DATABASE_URL);
    expect(parsedUrl.username).toBe('localbi_app');
    expect(parsedUrl.username).not.toBe('localbi_migrator');
    expect(parsedUrl.username).not.toBe('localbi_bootstrap');
    expect(parsedUrl.username).not.toBe('postgres');
  });

  it('Gate 5.1B: Codebase Search Proof (DIRECT_URL and bootstrap credentials never imported in application paths)', () => {
    function scanDir(dir: string): string[] {
      const files: string[] = [];
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...scanDir(fullPath));
        } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
          files.push(fullPath);
        }
      }
      return files;
    }

    const appFiles = scanDir(path.resolve(__dirname, '../src'));
    for (const file of appFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      expect(content).not.toContain('DIRECT_URL');
      expect(content).not.toContain('MIGRATOR_DATABASE_URL');
      expect(content).not.toContain('localbi_migrator');
      expect(content).not.toContain('localbi_bootstrap');
      expect(content).not.toContain('POSTGRES_USER');
    }
  });

  it('Gate 5.1C: Migrator Role localbi_migrator is Strictly Least-Privilege (NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOREPLICATION, NOBYPASSRLS)', async () => {
    const roles = await migratorPrisma.$queryRaw<
      Array<{
        rolname: string;
        rolsuper: boolean;
        rolbypassrls: boolean;
        rolcreatedb: boolean;
        rolcreaterole: boolean;
        rolreplication: boolean;
      }>
    >`
      SELECT r.rolname, r.rolsuper, r.rolbypassrls, r.rolcreatedb, r.rolcreaterole, r.rolreplication
      FROM pg_roles r
      WHERE r.rolname = 'localbi_migrator';
    `;

    expect(roles.length).toBe(1);
    const role = roles[0];
    expect(role?.rolname).toBe('localbi_migrator');
    expect(role?.rolsuper).toBe(false);
    expect(role?.rolbypassrls).toBe(false);
    expect(role?.rolcreatedb).toBe(false);
    expect(role?.rolcreaterole).toBe(false);
    expect(role?.rolreplication).toBe(false);

    // Attempt CREATE DATABASE as localbi_migrator -> must fail with permission denied
    await expect(
      migratorPrisma.$executeRawUnsafe('CREATE DATABASE unauth_forbidden_db;')
    ).rejects.toThrow();

    // Attempt CREATE ROLE as localbi_migrator -> must fail with permission denied
    await expect(
      migratorPrisma.$executeRawUnsafe('CREATE ROLE unauth_forbidden_role;')
    ).rejects.toThrow();

    // Attempt CREATE SCHEMA as localbi_migrator -> must fail with permission denied
    await expect(
      migratorPrisma.$executeRawUnsafe('CREATE SCHEMA unauth_forbidden_schema;')
    ).rejects.toThrow();

    // Attempt to access superuser-only shadow table pg_authid -> must fail with permission denied
    await expect(
      migratorPrisma.$executeRawUnsafe('SELECT rolpassword FROM pg_authid;')
    ).rejects.toThrow();
  });

  it('Gate 5.1D: Restricted Runtime Role localbi_app has NO SUPERUSER, NO BYPASSRLS, NO CREATEDB, NO CREATEROLE, NO REPLICATION', async () => {
    const roles = await appPrisma.$queryRaw<
      Array<{
        current_user: string;
        rolsuper: boolean;
        rolbypassrls: boolean;
        rolcreatedb: boolean;
        rolcreaterole: boolean;
        rolreplication: boolean;
      }>
    >`
      SELECT current_user, r.rolsuper, r.rolbypassrls, r.rolcreatedb, r.rolcreaterole, r.rolreplication
      FROM pg_roles r
      WHERE r.rolname = current_user;
    `;

    expect(roles.length).toBe(1);
    const role = roles[0];
    expect(role).toBeDefined();
    expect(role?.current_user).toBe('localbi_app');
    expect(role?.rolsuper).toBe(false);
    expect(role?.rolbypassrls).toBe(false);
    expect(role?.rolcreatedb).toBe(false);
    expect(role?.rolcreaterole).toBe(false);
    expect(role?.rolreplication).toBe(false);
  });

  it('Gate 5.2: Runtime role localbi_app CANNOT alter tables, policies, schema, or assume elevated roles', async () => {
    // Attempt ALTER TABLE as localbi_app -> must fail with permission denied
    await expect(
      appPrisma.$executeRaw`ALTER TABLE brands ADD COLUMN unauth_hack_col TEXT;`
    ).rejects.toThrow();

    // Attempt CREATE POLICY as localbi_app -> must fail with permission denied
    await expect(
      appPrisma.$executeRaw`CREATE POLICY unauth_policy ON brands FOR ALL TO PUBLIC USING (true);`
    ).rejects.toThrow();

    // Attempt DROP TABLE as localbi_app -> must fail with permission denied
    await expect(
      appPrisma.$executeRaw`DROP TABLE brands CASCADE;`
    ).rejects.toThrow();

    // Attempt SET ROLE localbi_migrator as localbi_app -> must fail with permission denied
    await expect(
      appPrisma.$executeRawUnsafe('SET ROLE localbi_migrator;')
    ).rejects.toThrow();

    // Attempt SET ROLE localbi_bootstrap as localbi_app -> must fail with permission denied
    await expect(
      appPrisma.$executeRawUnsafe('SET ROLE localbi_bootstrap;')
    ).rejects.toThrow();

    // Attempt SET ROLE postgres as localbi_app -> must fail with permission denied
    await expect(
      appPrisma.$executeRawUnsafe('SET ROLE postgres;')
    ).rejects.toThrow();
  });

  // --- Stage 5: Exhaustive RLS Configuration for all 25 Tenant Tables ---

  it('Gate 5.3: System Catalog Verification — RLS is ENABLED and FORCED on ALL 25 tenant-owned tables', async () => {
    const tableSecurity = await appPrisma.$queryRaw<
      Array<{ relname: string; rowsecurity: boolean; forcerowsecurity: boolean }>
    >`
      SELECT c.relname, c.relrowsecurity AS rowsecurity, c.relforcerowsecurity AS forcerowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY c.relname;
    `;

    const securityMap = new Map(tableSecurity.map((t) => [t.relname, t]));
    const expectedCount = EXPECTED_TENANT_TABLES.length;
    const actualProtectedCount = EXPECTED_TENANT_TABLES.filter(
      (t) => securityMap.get(t)?.rowsecurity && securityMap.get(t)?.forcerowsecurity
    ).length;

    const missingTables = EXPECTED_TENANT_TABLES.filter(
      (t) => !securityMap.has(t) || !securityMap.get(t)?.rowsecurity || !securityMap.get(t)?.forcerowsecurity
    );

    const allCatalogTables = tableSecurity.map((t) => t.relname);
    const unexpectedTables = EXPECTED_TENANT_TABLES.filter((t) => !allCatalogTables.includes(t));

    console.warn(`RLS Catalog Audit:
  - Expected Tenant Tables: ${expectedCount}
  - Actual Protected Tables: ${actualProtectedCount}
  - Missing Tables: [${missingTables.join(', ')}]
  - Unexpected Tables: [${unexpectedTables.join(', ')}]`);

    expect(expectedCount).toBe(34);
    expect(actualProtectedCount).toBe(34);
    expect(missingTables).toEqual([]);
    expect(unexpectedTables).toEqual([]);

    for (const tableName of EXPECTED_TENANT_TABLES) {
      const sec = securityMap.get(tableName);
      expect(sec, `Table ${tableName} missing from database catalog`).toBeDefined();
      expect(sec?.rowsecurity, `RLS must be enabled on ${tableName}`).toBe(true);
      expect(sec?.forcerowsecurity, `RLS must be forced on ${tableName}`).toBe(true);
    }
  });

  it('Gate 5.4: System Catalog Verification — Fail-closed isolation policy exists on ALL 34 tenant tables', async () => {
    const policies = await appPrisma.$queryRaw<
      Array<{ tablename: string; policyname: string; cmd: string; qual: string; with_check: string }>
    >`
      SELECT tablename, policyname, cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public';
    `;

    const malformedOrDuplicatePolicies: string[] = [];

    // Check policy name uniqueness across catalog
    const policyNames = policies.map((p) => `${p.tablename}.${p.policyname}`);
    const uniquePolicyNames = new Set(policyNames);
    if (policyNames.length !== uniquePolicyNames.size) {
      malformedOrDuplicatePolicies.push('Duplicate policy names detected in catalog');
    }

    for (const tableName of EXPECTED_TENANT_TABLES) {
      const expectedPolicyName = `${tableName}_tenant_isolation`;
      const matchingPolicies = policies.filter(
        (p) => p.tablename === tableName && p.policyname === expectedPolicyName
      );

      if (matchingPolicies.length !== 1) {
        malformedOrDuplicatePolicies.push(
          `${tableName}: expected exactly 1 ${expectedPolicyName}, found ${matchingPolicies.length}`
        );
        continue;
      }

      const policy = matchingPolicies[0];
      if (!policy) continue;
      if (policy.cmd !== 'ALL') {
        malformedOrDuplicatePolicies.push(`${tableName}: policy cmd is ${policy.cmd}, expected ALL`);
      }
      if (!policy.qual || !policy.qual.includes('app.current_tenant_id')) {
        malformedOrDuplicatePolicies.push(`${tableName}: policy qual missing app.current_tenant_id`);
      }
      if (!policy.with_check || !policy.with_check.includes('app.current_tenant_id')) {
        malformedOrDuplicatePolicies.push(`${tableName}: policy with_check missing app.current_tenant_id`);
      }
    }

    console.warn(`RLS Policy Audit:
  - Total Policies in Catalog: ${policies.length}
  - Duplicate / Malformed Policies: [${malformedOrDuplicatePolicies.join(', ')}]`);

    expect(malformedOrDuplicatePolicies).toEqual([]);
  });

  // --- Stage 5: Application Execution Tests as localbi_app ---

  it('Gate 5.5: Missing Context Fail-Closed (SELECT returns 0 rows without tenant context)', async () => {
    // Seed brand for Tenant A using withTenantContext
    await TenantContextService.withTenantContext(appPrisma, tenantAId, async (tx) => {
      await tx.$executeRaw`
        INSERT INTO brands (id, tenant_id, name, slug, created_at, updated_at)
        VALUES (${brandAId}, ${tenantAId}, 'Alpha Brand', ${'alpha-' + Date.now()}, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `;
    });

    // Query brands directly without setting app.current_tenant_id
    const rows = await appPrisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM brands WHERE id = ${brandAId};
    `;

    // Fail-closed guarantee: must return 0 rows
    expect(rows.length).toBe(0);
  });

  it('Gate 5.6: Missing Context Fail-Closed (INSERT fails without tenant context)', async () => {
    const orphanBrandId = `brand_orphan_${Date.now()}`;
    await expect(
      appPrisma.$executeRaw`
        INSERT INTO brands (id, tenant_id, name, slug, created_at, updated_at)
        VALUES (${orphanBrandId}, ${tenantAId}, 'Orphan Brand', ${'orphan-' + Date.now()}, NOW(), NOW());
      `
    ).rejects.toThrow();
  });

  it('Gate 5.7: Same-Tenant Full CRUD Lifecycle (SELECT, INSERT, UPDATE, DELETE)', async () => {
    const testBrandId = `brand_crud_${Date.now()}`;

    await TenantContextService.withTenantContext(appPrisma, tenantAId, async (tx) => {
      // INSERT
      await tx.$executeRaw`
        INSERT INTO brands (id, tenant_id, name, slug, created_at, updated_at)
        VALUES (${testBrandId}, ${tenantAId}, 'CRUD Brand', ${'crud-' + Date.now()}, NOW(), NOW());
      `;

      // SELECT
      const selectRes = await tx.$queryRaw<Array<{ id: string; name: string }>>`
        SELECT id, name FROM brands WHERE id = ${testBrandId};
      `;
      expect(selectRes.length).toBe(1);
      expect(selectRes[0]?.name).toBe('CRUD Brand');

      // UPDATE
      const updateCount = await tx.$executeRaw`
        UPDATE brands SET name = 'CRUD Brand Updated' WHERE id = ${testBrandId};
      `;
      expect(updateCount).toBe(1);

      // Verify updated value
      const updatedRes = await tx.$queryRaw<Array<{ name: string }>>`
        SELECT name FROM brands WHERE id = ${testBrandId};
      `;
      expect(updatedRes[0]?.name).toBe('CRUD Brand Updated');

      // DELETE
      const deleteCount = await tx.$executeRaw`
        DELETE FROM brands WHERE id = ${testBrandId};
      `;
      expect(deleteCount).toBe(1);

      // Verify deleted
      const postDelete = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM brands WHERE id = ${testBrandId};
      `;
      expect(postDelete.length).toBe(0);
    });
  });

  it('Gate 5.8: Cross-Tenant SELECT Rejection (Tenant B cannot read Tenant A records)', async () => {
    const rows = await TenantContextService.withTenantContext(appPrisma, tenantBId, async (tx) => {
      return tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM brands WHERE id = ${brandAId};
      `;
    });

    // Tenant B must see 0 rows
    expect(rows.length).toBe(0);
  });

  it('Gate 5.9: Cross-Tenant INSERT Spoofing Rejection (Tenant A cannot insert record for Tenant B)', async () => {
    const spoofedBrandId = `brand_spoofed_${Date.now()}`;

    // Tenant A tries to insert a row with tenant_id = tenantBId
    await expect(
      TenantContextService.withTenantContext(appPrisma, tenantAId, async (tx) => {
        return tx.$executeRaw`
          INSERT INTO brands (id, tenant_id, name, slug, created_at, updated_at)
          VALUES (${spoofedBrandId}, ${tenantBId}, 'Spoofed Brand', ${'spoofed-' + Date.now()}, NOW(), NOW());
        `;
      })
    ).rejects.toThrow();
  });

  it('Gate 5.10: Cross-Tenant UPDATE Rejection (Tenant B cannot update Tenant A record)', async () => {
    const updatedCount = await TenantContextService.withTenantContext(appPrisma, tenantBId, async (tx) => {
      return tx.$executeRaw`
        UPDATE brands SET name = 'Compromised Brand' WHERE id = ${brandAId};
      `;
    });

    // 0 rows affected
    expect(updatedCount).toBe(0);

    // Verify Tenant A record remains unchanged
    const brand = await TenantContextService.withTenantContext(appPrisma, tenantAId, async (tx) => {
      const res = await tx.$queryRaw<Array<{ name: string }>>`
        SELECT name FROM brands WHERE id = ${brandAId};
      `;
      return res[0];
    });
    expect(brand).toBeDefined();
    expect(brand?.name).toBe('Alpha Brand');
  });

  it('Gate 5.11: Cross-Tenant DELETE Rejection (Tenant B cannot delete Tenant A record)', async () => {
    const deletedCount = await TenantContextService.withTenantContext(appPrisma, tenantBId, async (tx) => {
      return tx.$executeRaw`
        DELETE FROM brands WHERE id = ${brandAId};
      `;
    });

    // 0 rows affected
    expect(deletedCount).toBe(0);

    // Verify Tenant A record still exists
    const brand = await TenantContextService.withTenantContext(appPrisma, tenantAId, async (tx) => {
      const res = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM brands WHERE id = ${brandAId};
      `;
      return res[0];
    });
    expect(brand).toBeDefined();
  });

  it('Gate 5.12: Cross-Tenant UPSERT Rejection (Tenant B cannot hijack Tenant A record via ON CONFLICT DO UPDATE)', async () => {
    await expect(
      TenantContextService.withTenantContext(appPrisma, tenantBId, async (tx) => {
        return tx.$executeRaw`
          INSERT INTO brands (id, tenant_id, name, slug, created_at, updated_at)
          VALUES (${brandAId}, ${tenantBId}, 'Hijacked Brand', ${'hijack-' + Date.now()}, NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET name = 'Hijacked By B';
        `;
      })
    ).rejects.toThrow();

    // Verify Tenant A brand name remains unchanged
    const brand = await TenantContextService.withTenantContext(appPrisma, tenantAId, async (tx) => {
      const res = await tx.$queryRaw<Array<{ name: string }>>`
        SELECT name FROM brands WHERE id = ${brandAId};
      `;
      return res[0];
    });
    expect(brand).toBeDefined();
    expect(brand?.name).toBe('Alpha Brand');
  });

  it('Gate 5.13: Transaction Rollback Reversion (Aborted transactions do not persist data)', async () => {
    const rollbackBrandId = `brand_rollback_${Date.now()}`;

    try {
      await TenantContextService.withTenantContext(appPrisma, tenantAId, async (tx) => {
        await tx.$executeRaw`
          INSERT INTO brands (id, tenant_id, name, slug, created_at, updated_at)
          VALUES (${rollbackBrandId}, ${tenantAId}, 'Rollback Brand', ${'rb-' + Date.now()}, NOW(), NOW());
        `;
        throw new Error('SIMULATED_TRANSACTION_FAILURE');
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        expect(err.message).toContain('SIMULATED_TRANSACTION_FAILURE');
      }
    }

    // Verify record was completely rolled back
    const rows = await TenantContextService.withTenantContext(appPrisma, tenantAId, async (tx) => {
      return tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM brands WHERE id = ${rollbackBrandId};
      `;
    });
    expect(rows.length).toBe(0);
  });

  it('Gate 5.14: Connection Pool Isolation (SET LOCAL prevents leakage across pooled connections)', async () => {
    // Run an isolated operation under Tenant A
    await TenantContextService.withTenantContext(appPrisma, tenantAId, async (tx) => {
      const currentSetting = await tx.$queryRaw<Array<{ current_setting: string }>>`
        SELECT current_setting('app.current_tenant_id', true) AS current_setting;
      `;
      expect(currentSetting[0]?.current_setting).toBe(tenantAId);
    });

    // Outside the transaction on the pooled client connection, app.current_tenant_id must be NULL or empty
    const outsideSetting = await appPrisma.$queryRaw<Array<{ current_setting: string | null }>>`
      SELECT current_setting('app.current_tenant_id', true) AS current_setting;
    `;
    expect(outsideSetting[0]?.current_setting).toBeFalsy();
  });

  it('Gate 5.15: Concurrent Operations Alternating Between Tenants (No cross-contamination under concurrency)', async () => {
    // Seed brand for Tenant B
    await TenantContextService.withTenantContext(appPrisma, tenantBId, async (tx) => {
      await tx.$executeRaw`
        INSERT INTO brands (id, tenant_id, name, slug, created_at, updated_at)
        VALUES (${brandBId}, ${tenantBId}, 'Beta Brand', ${'beta-' + Date.now()}, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `;
    });

    // Run 10 concurrent requests alternating between Tenant A and Tenant B
    const operations = Array.from({ length: 10 }, (_, index) => {
      const isEven = index % 2 === 0;
      const tenantId = isEven ? tenantAId : tenantBId;
      const expectedBrandId = isEven ? brandAId : brandBId;
      const forbiddenBrandId = isEven ? brandBId : brandAId;

      return TenantContextService.withTenantContext(appPrisma, tenantId, async (tx) => {
        // Query own brand -> must be visible
        const ownRows = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM brands WHERE id = ${expectedBrandId};
        `;
        expect(ownRows.length).toBe(1);
        expect(ownRows[0]?.id).toBe(expectedBrandId);

        // Query other tenant brand -> must be completely invisible
        const otherRows = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM brands WHERE id = ${forbiddenBrandId};
        `;
        expect(otherRows.length).toBe(0);

        return true;
      });
    });

    const results = await Promise.all(operations);
    expect(results.every(Boolean)).toBe(true);
  });

  it('Gate 5.16: Tenant Context Reset After Success and Failure', async () => {
    // 1. Success case reset
    await TenantContextService.withTenantContext(appPrisma, tenantAId, async (tx) => {
      const res = await tx.$queryRaw<Array<{ val: string }>>`
        SELECT current_setting('app.current_tenant_id', true) AS val;
      `;
      expect(res[0]?.val).toBe(tenantAId);
    });

    const afterSuccess = await appPrisma.$queryRaw<Array<{ val: string | null }>>`
      SELECT current_setting('app.current_tenant_id', true) AS val;
    `;
    expect(afterSuccess[0]?.val).toBeFalsy();

    // 2. Failure case reset
    try {
      await TenantContextService.withTenantContext(appPrisma, tenantAId, async () => {
        throw new Error('FAILURE_TRIGGERED');
      });
    } catch {
      // expected failure
    }

    const afterFailure = await appPrisma.$queryRaw<Array<{ val: string | null }>>`
      SELECT current_setting('app.current_tenant_id', true) AS val;
    `;
    expect(afterFailure[0]?.val).toBeFalsy();
  });

  it('Gate 5.17: Fail when PostgreSQL is unavailable (no mocks)', async () => {
    // Point to dead, unallocated port
    const deadUrl = appDbUrl.replace(':5432', ':5433');
    const deadPrisma = new PrismaClient({
      datasources: { db: { url: deadUrl } },
    });

    await expect(deadPrisma.$queryRaw`SELECT 1`).rejects.toThrow();
    await deadPrisma.$disconnect();
  });
});
