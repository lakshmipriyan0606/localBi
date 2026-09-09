-- =============================================================================
-- Migration: 20260909000000_init
-- Canonical Baseline Schema, Relational Integrity, Grants & Fail-Closed RLS
-- Executed strictly by localbi_migrator schema owner
-- =============================================================================

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "plan" TEXT NOT NULL DEFAULT 'STANDARD',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "deletion_scheduled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "email_verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_credentials" (
    "user_id" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "password_changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_credentials_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "user_identities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_sub" TEXT NOT NULL,
    "provider_email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "session_token_hash" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "token_type" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "scope_mode" TEXT NOT NULL DEFAULT 'ALL',
    "token_hash" TEXT NOT NULL,
    "invited_by" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_staff_access" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "target_tenant_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "approved_by" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_staff_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_memberships" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "scope_mode" TEXT NOT NULL DEFAULT 'ALL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_access_scopes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "membership_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_access_scopes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "store_code" TEXT,
    "address_line1" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postal_code" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_access_scopes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "membership_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "location_access_scopes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_locations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "price" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_connections" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "external_subject_id" TEXT NOT NULL,
    "external_email" TEXT NOT NULL,
    "encrypted_refresh_token" TEXT NOT NULL,
    "token_key_version" INTEGER NOT NULL DEFAULT 1,
    "granted_scopes" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "last_used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_accounts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "external_account_id" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_resources" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "external_resource_id" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connection_resource_access" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "can_access" BOOLEAN NOT NULL DEFAULT true,
    "last_verified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connection_resource_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_resource_mappings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "internal_type" TEXT NOT NULL,
    "internal_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "internal_resource_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gsc_properties" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "property_url" TEXT NOT NULL,
    "property_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gsc_properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gsc_pages" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "page_hash" CHAR(64) NOT NULL,
    "full_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gsc_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gsc_queries" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "query_hash" CHAR(64) NOT NULL,
    "query_text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gsc_queries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gsc_daily_property_totals" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "search_type" TEXT NOT NULL DEFAULT 'WEB',
    "data_state" TEXT NOT NULL DEFAULT 'FINAL',
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "sum_position_impressions" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "sync_revision" INTEGER NOT NULL DEFAULT 1,
    "freshness_timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gsc_daily_property_totals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gsc_daily_device_metrics" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "search_type" TEXT NOT NULL DEFAULT 'WEB',
    "device" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "sum_position_impressions" DOUBLE PRECISION NOT NULL DEFAULT 0.0,

    CONSTRAINT "gsc_daily_device_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gsc_daily_country_metrics" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "search_type" TEXT NOT NULL DEFAULT 'WEB',
    "country" CHAR(3) NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "sum_position_impressions" DOUBLE PRECISION NOT NULL DEFAULT 0.0,

    CONSTRAINT "gsc_daily_country_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gsc_daily_page_metrics" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "search_type" TEXT NOT NULL DEFAULT 'WEB',
    "page_id" BIGINT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "sum_position_impressions" DOUBLE PRECISION NOT NULL DEFAULT 0.0,

    CONSTRAINT "gsc_daily_page_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gsc_daily_query_metrics" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "search_type" TEXT NOT NULL DEFAULT 'WEB',
    "query_id" BIGINT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "sum_position_impressions" DOUBLE PRECISION NOT NULL DEFAULT 0.0,

    CONSTRAINT "gsc_daily_query_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gbp_daily_metrics" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "metric_type" TEXT NOT NULL,
    "value" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gbp_daily_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_runs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "business_key" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "rows_ingested" INTEGER NOT NULL DEFAULT 0,
    "error_code" TEXT,
    "error_details" JSONB,

    CONSTRAINT "sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_cursors" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "cursor_key" TEXT NOT NULL,
    "cursor_value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_cursors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "actor_id" TEXT NOT NULL,
    "actor_role" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_identities_provider_provider_sub_key" ON "user_identities"("provider", "provider_sub");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_session_token_hash_key" ON "user_sessions"("session_token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "auth_tokens_token_hash_key" ON "auth_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_hash_key" ON "invitations"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_memberships_tenant_id_user_id_key" ON "tenant_memberships"("tenant_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_memberships_tenant_id_id_key" ON "tenant_memberships"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "brands_tenant_id_slug_key" ON "brands"("tenant_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "brands_tenant_id_id_key" ON "brands"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "brand_access_scopes_tenant_id_membership_id_brand_id_key" ON "brand_access_scopes"("tenant_id", "membership_id", "brand_id");

-- CreateIndex
CREATE UNIQUE INDEX "locations_tenant_id_id_key" ON "locations"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "locations_tenant_id_brand_id_id_key" ON "locations"("tenant_id", "brand_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "locations_tenant_id_brand_id_store_code_key" ON "locations"("tenant_id", "brand_id", "store_code");

-- CreateIndex
CREATE UNIQUE INDEX "location_access_scopes_tenant_id_membership_id_location_id_key" ON "location_access_scopes"("tenant_id", "membership_id", "location_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_tenant_id_id_key" ON "products"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "products_tenant_id_brand_id_id_key" ON "products"("tenant_id", "brand_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "products_tenant_id_brand_id_sku_key" ON "products"("tenant_id", "brand_id", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "product_locations_tenant_id_brand_id_product_id_location_id_key" ON "product_locations"("tenant_id", "brand_id", "product_id", "location_id");

-- CreateIndex
CREATE UNIQUE INDEX "integration_connections_tenant_id_id_key" ON "integration_connections"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "integration_connections_tenant_id_provider_external_subject_key" ON "integration_connections"("tenant_id", "provider", "external_subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "external_accounts_tenant_id_id_key" ON "external_accounts"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "external_accounts_tenant_id_provider_external_account_id_key" ON "external_accounts"("tenant_id", "provider", "external_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "external_resources_tenant_id_id_key" ON "external_resources"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "external_resources_tenant_id_provider_external_resource_id_key" ON "external_resources"("tenant_id", "provider", "external_resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "connection_resource_access_tenant_id_connection_id_resource_key" ON "connection_resource_access"("tenant_id", "connection_id", "resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "internal_resource_mappings_tenant_id_internal_type_internal_key" ON "internal_resource_mappings"("tenant_id", "internal_type", "internal_id", "resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "gsc_properties_tenant_id_id_key" ON "gsc_properties"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "gsc_properties_tenant_id_property_url_key" ON "gsc_properties"("tenant_id", "property_url");

-- CreateIndex
CREATE UNIQUE INDEX "gsc_pages_tenant_id_id_key" ON "gsc_pages"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "gsc_pages_tenant_id_property_id_page_hash_key" ON "gsc_pages"("tenant_id", "property_id", "page_hash");

-- CreateIndex
CREATE UNIQUE INDEX "gsc_queries_tenant_id_id_key" ON "gsc_queries"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "gsc_queries_tenant_id_property_id_query_hash_key" ON "gsc_queries"("tenant_id", "property_id", "query_hash");

-- CreateIndex
CREATE UNIQUE INDEX "gsc_daily_property_totals_tenant_id_property_id_date_search_key" ON "gsc_daily_property_totals"("tenant_id", "property_id", "date", "search_type");

-- CreateIndex
CREATE UNIQUE INDEX "gsc_daily_device_metrics_tenant_id_property_id_date_search__key" ON "gsc_daily_device_metrics"("tenant_id", "property_id", "date", "search_type", "device");

-- CreateIndex
CREATE UNIQUE INDEX "gsc_daily_country_metrics_tenant_id_property_id_date_search_key" ON "gsc_daily_country_metrics"("tenant_id", "property_id", "date", "search_type", "country");

-- CreateIndex
CREATE UNIQUE INDEX "gsc_daily_page_metrics_tenant_id_property_id_date_search_ty_key" ON "gsc_daily_page_metrics"("tenant_id", "property_id", "date", "search_type", "page_id");

-- CreateIndex
CREATE UNIQUE INDEX "gsc_daily_query_metrics_tenant_id_property_id_date_search_t_key" ON "gsc_daily_query_metrics"("tenant_id", "property_id", "date", "search_type", "query_id");

-- CreateIndex
CREATE UNIQUE INDEX "gbp_daily_metrics_tenant_id_location_id_date_metric_type_key" ON "gbp_daily_metrics"("tenant_id", "location_id", "date", "metric_type");

-- CreateIndex
CREATE UNIQUE INDEX "sync_runs_tenant_id_business_key_key" ON "sync_runs"("tenant_id", "business_key");

-- CreateIndex
CREATE UNIQUE INDEX "sync_cursors_tenant_id_provider_resource_id_cursor_key_key" ON "sync_cursors"("tenant_id", "provider", "resource_id", "cursor_key");

-- AddForeignKey
ALTER TABLE "user_credentials" ADD CONSTRAINT "user_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_identities" ADD CONSTRAINT "user_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_staff_access" ADD CONSTRAINT "platform_staff_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_access_scopes" ADD CONSTRAINT "brand_access_scopes_tenant_id_membership_id_fkey" FOREIGN KEY ("tenant_id", "membership_id") REFERENCES "tenant_memberships"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_access_scopes" ADD CONSTRAINT "brand_access_scopes_tenant_id_brand_id_fkey" FOREIGN KEY ("tenant_id", "brand_id") REFERENCES "brands"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_tenant_id_brand_id_fkey" FOREIGN KEY ("tenant_id", "brand_id") REFERENCES "brands"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_access_scopes" ADD CONSTRAINT "location_access_scopes_tenant_id_membership_id_fkey" FOREIGN KEY ("tenant_id", "membership_id") REFERENCES "tenant_memberships"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_access_scopes" ADD CONSTRAINT "location_access_scopes_tenant_id_location_id_fkey" FOREIGN KEY ("tenant_id", "location_id") REFERENCES "locations"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_brand_id_fkey" FOREIGN KEY ("tenant_id", "brand_id") REFERENCES "brands"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_locations" ADD CONSTRAINT "product_locations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_locations" ADD CONSTRAINT "product_locations_tenant_id_brand_id_product_id_fkey" FOREIGN KEY ("tenant_id", "brand_id", "product_id") REFERENCES "products"("tenant_id", "brand_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_locations" ADD CONSTRAINT "product_locations_tenant_id_brand_id_location_id_fkey" FOREIGN KEY ("tenant_id", "brand_id", "location_id") REFERENCES "locations"("tenant_id", "brand_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_accounts" ADD CONSTRAINT "external_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_accounts" ADD CONSTRAINT "external_accounts_tenant_id_connection_id_fkey" FOREIGN KEY ("tenant_id", "connection_id") REFERENCES "integration_connections"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_resources" ADD CONSTRAINT "external_resources_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_resources" ADD CONSTRAINT "external_resources_tenant_id_account_id_fkey" FOREIGN KEY ("tenant_id", "account_id") REFERENCES "external_accounts"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connection_resource_access" ADD CONSTRAINT "connection_resource_access_tenant_id_connection_id_fkey" FOREIGN KEY ("tenant_id", "connection_id") REFERENCES "integration_connections"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connection_resource_access" ADD CONSTRAINT "connection_resource_access_tenant_id_resource_id_fkey" FOREIGN KEY ("tenant_id", "resource_id") REFERENCES "external_resources"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_resource_mappings" ADD CONSTRAINT "internal_resource_mappings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_resource_mappings" ADD CONSTRAINT "internal_resource_mappings_tenant_id_resource_id_fkey" FOREIGN KEY ("tenant_id", "resource_id") REFERENCES "external_resources"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gsc_properties" ADD CONSTRAINT "gsc_properties_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gsc_properties" ADD CONSTRAINT "gsc_properties_tenant_id_resource_id_fkey" FOREIGN KEY ("tenant_id", "resource_id") REFERENCES "external_resources"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gsc_pages" ADD CONSTRAINT "gsc_pages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gsc_pages" ADD CONSTRAINT "gsc_pages_tenant_id_property_id_fkey" FOREIGN KEY ("tenant_id", "property_id") REFERENCES "gsc_properties"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gsc_queries" ADD CONSTRAINT "gsc_queries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gsc_queries" ADD CONSTRAINT "gsc_queries_tenant_id_property_id_fkey" FOREIGN KEY ("tenant_id", "property_id") REFERENCES "gsc_properties"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gsc_daily_property_totals" ADD CONSTRAINT "gsc_daily_property_totals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gsc_daily_property_totals" ADD CONSTRAINT "gsc_daily_property_totals_tenant_id_property_id_fkey" FOREIGN KEY ("tenant_id", "property_id") REFERENCES "gsc_properties"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gsc_daily_device_metrics" ADD CONSTRAINT "gsc_daily_device_metrics_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gsc_daily_device_metrics" ADD CONSTRAINT "gsc_daily_device_metrics_tenant_id_property_id_fkey" FOREIGN KEY ("tenant_id", "property_id") REFERENCES "gsc_properties"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gsc_daily_country_metrics" ADD CONSTRAINT "gsc_daily_country_metrics_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gsc_daily_country_metrics" ADD CONSTRAINT "gsc_daily_country_metrics_tenant_id_property_id_fkey" FOREIGN KEY ("tenant_id", "property_id") REFERENCES "gsc_properties"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gsc_daily_page_metrics" ADD CONSTRAINT "gsc_daily_page_metrics_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gsc_daily_page_metrics" ADD CONSTRAINT "gsc_daily_page_metrics_tenant_id_property_id_fkey" FOREIGN KEY ("tenant_id", "property_id") REFERENCES "gsc_properties"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gsc_daily_page_metrics" ADD CONSTRAINT "gsc_daily_page_metrics_tenant_id_page_id_fkey" FOREIGN KEY ("tenant_id", "page_id") REFERENCES "gsc_pages"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gsc_daily_query_metrics" ADD CONSTRAINT "gsc_daily_query_metrics_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gsc_daily_query_metrics" ADD CONSTRAINT "gsc_daily_query_metrics_tenant_id_property_id_fkey" FOREIGN KEY ("tenant_id", "property_id") REFERENCES "gsc_properties"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gsc_daily_query_metrics" ADD CONSTRAINT "gsc_daily_query_metrics_tenant_id_query_id_fkey" FOREIGN KEY ("tenant_id", "query_id") REFERENCES "gsc_queries"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gbp_daily_metrics" ADD CONSTRAINT "gbp_daily_metrics_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gbp_daily_metrics" ADD CONSTRAINT "gbp_daily_metrics_tenant_id_location_id_fkey" FOREIGN KEY ("tenant_id", "location_id") REFERENCES "locations"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_runs" ADD CONSTRAINT "sync_runs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_cursors" ADD CONSTRAINT "sync_cursors_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;




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
    'audit_logs'
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

