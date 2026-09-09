const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Generating base DDL from schema.prisma via prisma migrate diff...');
const baseDdl = execSync('npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script', {
  encoding: 'utf-8',
});

const tenantTables = [
  'invitations',
  'tenant_memberships',
  'brands',
  'brand_access_scopes',
  'locations',
  'location_access_scopes',
  'products',
  'product_locations',
  'integration_connections',
  'external_accounts',
  'external_resources',
  'connection_resource_access',
  'internal_resource_mappings',
  'gsc_properties',
  'gsc_pages',
  'gsc_queries',
  'gsc_daily_property_totals',
  'gsc_daily_device_metrics',
  'gsc_daily_country_metrics',
  'gsc_daily_page_metrics',
  'gsc_daily_query_metrics',
  'gbp_daily_metrics',
  'sync_runs',
  'sync_cursors',
  'audit_logs',
];

const rlsSql = `
-- =============================================================================
-- GRANTS & PRIVILEGES FOR RUNTIME APPLICATION ROLE (localbi_app)
-- =============================================================================
GRANT USAGE ON SCHEMA public TO localbi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO localbi_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO localbi_app;

ALTER DEFAULT PRIVILEGES FOR ROLE localbi_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO localbi_app;
ALTER DEFAULT PRIVILEGES FOR ROLE localbi_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO localbi_app;

-- =============================================================================
-- ROW-LEVEL SECURITY ENFORCEMENT ON ALL TENANT-OWNED TABLES
-- =============================================================================
DO $$
DECLARE
  tbl text;
  tenant_tables text[] := ARRAY[
${tenantTables.map((t) => `    '${t}'`).join(',\n')}
  ];
BEGIN
  FOREACH tbl IN ARRAY tenant_tables
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I_tenant_isolation ON %I;', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I_tenant_isolation ON %I ' ||
      'FOR ALL TO localbi_app ' ||
      'USING (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), '''')) ' ||
      'WITH CHECK (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), ''''));',
      tbl, tbl
    );
  END LOOP;
END
$$;

-- =============================================================================
-- CONTROL PLANE ROW-LEVEL SECURITY POLICIES
-- =============================================================================
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_sessions_isolation ON user_sessions;
CREATE POLICY user_sessions_isolation ON user_sessions
  FOR ALL TO localbi_app
  USING (user_id = NULLIF(current_setting('app.current_user_id', true), ''))
  WITH CHECK (user_id = NULLIF(current_setting('app.current_user_id', true), ''));

DROP POLICY IF EXISTS memberships_user_discovery ON tenant_memberships;
CREATE POLICY memberships_user_discovery ON tenant_memberships
  FOR SELECT TO localbi_app
  USING (
    user_id = NULLIF(current_setting('app.current_user_id', true), '')
    OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
  );
`;

const completeMigrationSql = `-- =============================================================================
-- Migration: 20260909000000_init
-- Canonical Baseline Schema, Relational Integrity, Grants & Fail-Closed RLS
-- Executed strictly by localbi_migrator schema owner
-- =============================================================================

${baseDdl}

${rlsSql}
`;

const migrationDir = path.join(__dirname, '..', 'prisma', 'migrations', '20260909000000_init');
fs.mkdirSync(migrationDir, { recursive: true });
fs.writeFileSync(path.join(migrationDir, 'migration.sql'), completeMigrationSql);
console.log(`Canonical migration successfully written to: ${path.join(migrationDir, 'migration.sql')}`);

// Remove legacy migration directory if present
const legacyDir = path.join(__dirname, '..', 'prisma', 'migrations', '0_init_rls_policies');
if (fs.existsSync(legacyDir)) {
  fs.rmSync(legacyDir, { recursive: true, force: true });
  console.log('Removed incomplete legacy migration directory.');
}
