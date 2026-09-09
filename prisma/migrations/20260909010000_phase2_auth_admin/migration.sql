-- =============================================================================
-- Migration: 20260909010000_phase2_auth_admin
-- Phase 2 Schema Enhancements: Optimistic Locking, Archival, Scopes, Indexes, RLS Policies
-- Executed strictly by localbi_migrator schema owner
-- =============================================================================

-- AlterTable tenants: add version for optimistic locking
ALTER TABLE "tenants" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable user_sessions: add last_active_at for idle expiration tracking
ALTER TABLE "user_sessions" ADD COLUMN "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable invitations: add invited_brand_ids and invited_location_ids
ALTER TABLE "invitations" ADD COLUMN "invited_brand_ids" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "invitations" ADD COLUMN "invited_location_ids" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable tenant_memberships: add status and suspended_at
ALTER TABLE "tenant_memberships" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "tenant_memberships" ADD COLUMN "suspended_at" TIMESTAMP(3);

-- AlterTable brands: add version and is_archived
ALTER TABLE "brands" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "brands" ADD COLUMN "is_archived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable locations: add version, is_archived, archived_at
ALTER TABLE "locations" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "locations" ADD COLUMN "is_archived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "locations" ADD COLUMN "archived_at" TIMESTAMP(3);

-- Create Indexes
CREATE INDEX "idx_user_sessions_user_id" ON "user_sessions"("user_id");
CREATE INDEX "idx_user_sessions_expires_at" ON "user_sessions"("expires_at");

CREATE INDEX "idx_auth_tokens_user_type" ON "auth_tokens"("user_id", "token_type");
CREATE INDEX "idx_auth_tokens_expires_at" ON "auth_tokens"("expires_at");

CREATE INDEX "idx_invitations_tenant_email" ON "invitations"("tenant_id", "email");
CREATE INDEX "idx_invitations_expires_at" ON "invitations"("expires_at");

CREATE INDEX "idx_tenant_memberships_tenant_status" ON "tenant_memberships"("tenant_id", "status");

CREATE INDEX "idx_brands_tenant_archived_name" ON "brands"("tenant_id", "is_archived", "name");

CREATE INDEX "idx_locations_tenant_brand_archived" ON "locations"("tenant_id", "brand_id", "is_archived");
CREATE INDEX "idx_locations_tenant_store_code" ON "locations"("tenant_id", "store_code");

CREATE INDEX "idx_audit_logs_tenant_created" ON "audit_logs"("tenant_id", "created_at");
CREATE INDEX "idx_audit_logs_actor_created" ON "audit_logs"("actor_id", "created_at");
CREATE INDEX "idx_audit_logs_resource" ON "audit_logs"("resource_type", "resource_id");

-- Update Control Plane RLS Policies for user_sessions
DROP POLICY IF EXISTS user_sessions_isolation ON user_sessions;

-- Allow session token lookup by localbi_app (unauthenticated or matching current user)
CREATE POLICY user_sessions_select_policy ON user_sessions
  FOR SELECT TO localbi_app
  USING (
    NULLIF(current_setting('app.current_user_id', true), '') IS NULL
    OR user_id = current_setting('app.current_user_id', true)
  );

-- Allow session mutations for current user, or unauthenticated session management (creation/touch)
CREATE POLICY user_sessions_mutation_policy ON user_sessions
  FOR ALL TO localbi_app
  USING (
    NULLIF(current_setting('app.current_user_id', true), '') IS NULL
    OR user_id = current_setting('app.current_user_id', true)
  )
  WITH CHECK (
    NULLIF(current_setting('app.current_user_id', true), '') IS NULL
    OR user_id = current_setting('app.current_user_id', true)
  );
