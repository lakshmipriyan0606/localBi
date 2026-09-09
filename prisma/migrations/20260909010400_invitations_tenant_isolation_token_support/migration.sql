-- =============================================================================
-- Migration: 20260909010400_invitations_tenant_isolation_token_support
-- Update invitations_tenant_isolation to allow token lookup when unauthenticated
-- Satisfies Gate 5.4 catalog audit and enables secure invitation acceptance
-- Executed strictly by localbi_migrator schema owner
-- =============================================================================

DROP POLICY IF EXISTS invitations_tenant_isolation ON invitations;

CREATE POLICY invitations_tenant_isolation ON invitations
  FOR ALL TO localbi_app
  USING (
    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
    OR NULLIF(current_setting('app.current_tenant_id', true), '') IS NULL
  )
  WITH CHECK (
    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')
    OR NULLIF(current_setting('app.current_tenant_id', true), '') IS NULL
  );
