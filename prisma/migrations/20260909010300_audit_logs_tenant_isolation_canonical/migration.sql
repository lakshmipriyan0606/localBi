-- =============================================================================
-- Migration: 20260909010300_audit_logs_tenant_isolation_canonical
-- Canonical audit_logs_tenant_isolation policy satisfying Gate 5.4 catalog audit
-- and permitting control plane global audit logs when un-scoped
-- Executed strictly by localbi_migrator schema owner
-- =============================================================================

DROP POLICY IF EXISTS audit_logs_insert_policy ON audit_logs;
DROP POLICY IF EXISTS audit_logs_select_policy ON audit_logs;
DROP POLICY IF EXISTS audit_logs_tenant_isolation ON audit_logs;

CREATE POLICY audit_logs_tenant_isolation ON audit_logs
  FOR ALL TO localbi_app
  USING (
    (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
    OR
    (tenant_id IS NULL AND NULLIF(current_setting('app.current_tenant_id', true), '') IS NULL)
  )
  WITH CHECK (
    (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
    OR
    (tenant_id IS NULL AND NULLIF(current_setting('app.current_tenant_id', true), '') IS NULL)
  );
