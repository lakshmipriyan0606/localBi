-- AlterTable
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "tenant_type" TEXT NOT NULL DEFAULT 'DIRECT_CLIENT';

-- AlterTable
ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "client_account_id" TEXT;

-- AlterTable
ALTER TABLE "brands" ADD COLUMN IF NOT EXISTS "client_account_id" TEXT;

-- CreateTable
CREATE TABLE "client_accounts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "primary_contact" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "locale" TEXT NOT NULL DEFAULT 'en-US',
    "suspended_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_grants" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "scope_type" TEXT NOT NULL DEFAULT 'CLIENT',
    "client_account_id" TEXT,
    "brand_id" TEXT,
    "location_id" TEXT,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "white_label_configs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "portal_name" TEXT NOT NULL DEFAULT 'LocalBi',
    "company_legal_name" TEXT,
    "logo_url" TEXT,
    "favicon_url" TEXT,
    "primary_color" TEXT NOT NULL DEFAULT '#4F46E5',
    "secondary_color" TEXT NOT NULL DEFAULT '#0F172A',
    "accent_color" TEXT NOT NULL DEFAULT '#F59E0B',
    "support_email" TEXT,
    "support_url" TEXT,
    "hide_localbi_branding" BOOLEAN NOT NULL DEFAULT false,
    "custom_css" TEXT,
    "portal_domain_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "white_label_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_domains" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "verification_token" TEXT NOT NULL,
    "ssl_status" TEXT NOT NULL DEFAULT 'PENDING',
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portal_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_entitlements" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "feature_key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "limits" JSONB NOT NULL DEFAULT '{}',
    "source" TEXT NOT NULL DEFAULT 'PLAN_DEFAULT',
    "effective_from" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_feature_entitlements" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "client_account_id" TEXT NOT NULL,
    "feature_key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "limits" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_feature_entitlements_pkey" PRIMARY KEY ("id")
);

-- Indexes for client_accounts
CREATE UNIQUE INDEX "uq_client_account_tenant_slug" ON "client_accounts"("tenant_id", "slug");
CREATE UNIQUE INDEX "client_accounts_tenant_id_id_key" ON "client_accounts"("tenant_id", "id");
CREATE INDEX "idx_client_accounts_tenant_status" ON "client_accounts"("tenant_id", "status");

-- Indexes for access_grants
CREATE UNIQUE INDEX "access_grants_tenant_id_id_key" ON "access_grants"("tenant_id", "id");
CREATE INDEX "idx_access_grants_tenant_user" ON "access_grants"("tenant_id", "user_id");
CREATE INDEX "idx_access_grants_tenant_client_user" ON "access_grants"("tenant_id", "client_account_id", "user_id");

-- Indexes for white_label_configs
CREATE UNIQUE INDEX "white_label_configs_tenant_id_key" ON "white_label_configs"("tenant_id");
CREATE UNIQUE INDEX "white_label_configs_tenant_id_id_key" ON "white_label_configs"("tenant_id", "id");

-- Indexes for portal_domains
CREATE UNIQUE INDEX "portal_domains_hostname_key" ON "portal_domains"("hostname");
CREATE UNIQUE INDEX "portal_domains_tenant_id_id_key" ON "portal_domains"("tenant_id", "id");
CREATE INDEX "idx_portal_domains_tenant_status" ON "portal_domains"("tenant_id", "status");

-- Indexes for tenant_entitlements
CREATE UNIQUE INDEX "tenant_entitlements_tenant_id_feature_key_key" ON "tenant_entitlements"("tenant_id", "feature_key");
CREATE UNIQUE INDEX "tenant_entitlements_tenant_id_id_key" ON "tenant_entitlements"("tenant_id", "id");
CREATE INDEX "idx_tenant_entitlements_enabled" ON "tenant_entitlements"("tenant_id", "enabled");

-- Indexes for client_feature_entitlements
CREATE UNIQUE INDEX "client_feature_entitlements_tenant_id_client_account_id_feature_key_key" ON "client_feature_entitlements"("tenant_id", "client_account_id", "feature_key");
CREATE UNIQUE INDEX "client_feature_entitlements_tenant_id_id_key" ON "client_feature_entitlements"("tenant_id", "id");
CREATE INDEX "idx_client_feature_entitlements" ON "client_feature_entitlements"("tenant_id", "client_account_id");

-- Indexes for Brand & Invitation alterations
CREATE INDEX "idx_brands_client_account" ON "brands"("tenant_id", "client_account_id");
CREATE INDEX "idx_invitations_tenant_client" ON "invitations"("tenant_id", "client_account_id");

-- Foreign Keys
ALTER TABLE "client_accounts" ADD CONSTRAINT "client_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "brands" ADD CONSTRAINT "brands_tenant_id_client_account_id_fkey" FOREIGN KEY ("tenant_id", "client_account_id") REFERENCES "client_accounts"("tenant_id", "id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invitations" ADD CONSTRAINT "invitations_tenant_id_client_account_id_fkey" FOREIGN KEY ("tenant_id", "client_account_id") REFERENCES "client_accounts"("tenant_id", "id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_tenant_id_client_account_id_fkey" FOREIGN KEY ("tenant_id", "client_account_id") REFERENCES "client_accounts"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_tenant_id_brand_id_fkey" FOREIGN KEY ("tenant_id", "brand_id") REFERENCES "brands"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_tenant_id_location_id_fkey" FOREIGN KEY ("tenant_id", "location_id") REFERENCES "locations"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "white_label_configs" ADD CONSTRAINT "white_label_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "white_label_configs" ADD CONSTRAINT "white_label_configs_tenant_id_portal_domain_id_fkey" FOREIGN KEY ("tenant_id", "portal_domain_id") REFERENCES "portal_domains"("tenant_id", "id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "portal_domains" ADD CONSTRAINT "portal_domains_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_entitlements" ADD CONSTRAINT "tenant_entitlements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "client_feature_entitlements" ADD CONSTRAINT "client_feature_entitlements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_feature_entitlements" ADD CONSTRAINT "client_feature_entitlements_tenant_id_client_account_id_fkey" FOREIGN KEY ("tenant_id", "client_account_id") REFERENCES "client_accounts"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row Level Security (RLS) for Phase 14 tables
ALTER TABLE "client_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "client_accounts" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "client_accounts";
CREATE POLICY tenant_isolation_policy ON "client_accounts"
  FOR ALL
  TO localbi_app
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text);

ALTER TABLE "access_grants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "access_grants" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "access_grants";
CREATE POLICY tenant_isolation_policy ON "access_grants"
  FOR ALL
  TO localbi_app
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text);

ALTER TABLE "white_label_configs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "white_label_configs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "white_label_configs";
CREATE POLICY tenant_isolation_policy ON "white_label_configs"
  FOR ALL
  TO localbi_app
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text);

ALTER TABLE "portal_domains" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "portal_domains" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "portal_domains";
CREATE POLICY tenant_isolation_policy ON "portal_domains"
  FOR ALL
  TO localbi_app
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text);

ALTER TABLE "tenant_entitlements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_entitlements" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "tenant_entitlements";
CREATE POLICY tenant_isolation_policy ON "tenant_entitlements"
  FOR ALL
  TO localbi_app
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text);

ALTER TABLE "client_feature_entitlements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "client_feature_entitlements" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "client_feature_entitlements";
CREATE POLICY tenant_isolation_policy ON "client_feature_entitlements"
  FOR ALL
  TO localbi_app
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text);

-- Grant DML permissions to localbi_app
GRANT SELECT, INSERT, UPDATE, DELETE ON "client_accounts" TO localbi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "access_grants" TO localbi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "white_label_configs" TO localbi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "portal_domains" TO localbi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "tenant_entitlements" TO localbi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "client_feature_entitlements" TO localbi_app;
