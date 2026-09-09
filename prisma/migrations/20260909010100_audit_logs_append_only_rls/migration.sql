-- =============================================================================
-- Migration: 20260909010100_audit_logs_append_only_rls
-- Append-Only Audit Logging with Control Plane and Tenant RLS Support
-- Executed strictly by localbi_migrator schema owner
-- =============================================================================

DROP POLICY IF EXISTS audit_logs_tenant_isolation ON audit_logs;
DROP POLICY IF EXISTS audit_logs_insert_policy ON audit_logs;
DROP POLICY IF EXISTS audit_logs_select_policy ON audit_logs;

-- Audit logs insertion:
-- Tenant events: tenant_id must match app.current_tenant_id.
-- Global auth/control plane events: tenant_id IS NULL when no tenant is scoped.
CREATE POLICY audit_logs_insert_policy ON audit_logs
  FOR INSERT TO localbi_app
  WITH CHECK (
    (tenant_id IS NOT NULL AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
    OR
    (tenant_id IS NULL AND NULLIF(current_setting('app.current_tenant_id', true), '') IS NULL)
  );

-- Audit logs selection:
-- In tenant context: can read audit logs for that tenant.
-- In user control plane context: actor can read their own activity.
CREATE POLICY audit_logs_select_policy ON audit_logs
  FOR SELECT TO localbi_app
  USING (
    (tenant_id IS NOT NULL AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
    OR
    (actor_id = NULLIF(current_setting('app.current_user_id', true), ''))
  );
