-- =============================================================================
-- Migration: 20260909010200_audit_logs_select_rls_fix
-- Allow SELECT for global audit logs when tenant context is null
-- Executed strictly by localbi_migrator schema owner
-- =============================================================================

DROP POLICY IF EXISTS audit_logs_select_policy ON audit_logs;

CREATE POLICY audit_logs_select_policy ON audit_logs
  FOR SELECT TO localbi_app
  USING (
    (tenant_id IS NOT NULL AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
    OR
    (actor_id = NULLIF(current_setting('app.current_user_id', true), ''))
    OR
    (tenant_id IS NULL AND NULLIF(current_setting('app.current_tenant_id', true), '') IS NULL)
  );
