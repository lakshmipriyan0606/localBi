-- Phase 8: Google Merchant Center + Local Product Inventory
-- Products + Store Inventory + Feed Sync + Diagnostics
--
-- Creates tables for Google Merchant Center brand configuration, product merchant settings,
-- product publication mapping, store-level local inventory state, and diagnostic issues
-- with strict Dual-Role PostgreSQL 16 Row Level Security (RLS).

-- ============================================================
-- 1. Merchant Brand Config Table
-- ============================================================

CREATE TABLE IF NOT EXISTS merchant_brand_configs (
  id                   TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  tenant_id            TEXT        NOT NULL,
  brand_id             TEXT        NOT NULL,
  merchant_account_id  TEXT        NOT NULL,
  target_country       TEXT        NOT NULL DEFAULT 'IN',
  content_language     TEXT        NOT NULL DEFAULT 'en',
  default_currency     TEXT        NOT NULL DEFAULT 'INR',
  feed_label           TEXT,
  auto_sync_enabled    BOOLEAN     NOT NULL DEFAULT true,
  last_reconciled_at   TIMESTAMPTZ,
  last_sync_status     TEXT        NOT NULL DEFAULT 'IDLE', -- IDLE, SYNCING, SUCCESS, ERROR
  last_sync_error      TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_merchant_brand_configs PRIMARY KEY (id),
  CONSTRAINT uq_merchant_brand_config UNIQUE (tenant_id, brand_id),
  CONSTRAINT fk_merchant_brand_configs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_merchant_brand_configs_brand  FOREIGN KEY (tenant_id, brand_id) REFERENCES brands(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_merchant_brand_account
  ON merchant_brand_configs (tenant_id, merchant_account_id);

-- ============================================================
-- 2. Product Merchant Settings / Config Table
-- ============================================================

CREATE TABLE IF NOT EXISTS product_merchant_configs (
  id                       TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  tenant_id                TEXT        NOT NULL,
  brand_id                 TEXT        NOT NULL,
  product_id               TEXT        NOT NULL,
  enabled                  BOOLEAN     NOT NULL DEFAULT true,
  google_product_category  TEXT,
  product_type             TEXT,
  condition                TEXT        NOT NULL DEFAULT 'new', -- new, refurbished, used
  gtin                     TEXT,
  mpn                      TEXT,
  brand_name               TEXT,
  custom_label_0           TEXT,
  custom_label_1           TEXT,
  custom_label_2           TEXT,
  custom_label_3           TEXT,
  custom_label_4           TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_product_merchant_configs PRIMARY KEY (id),
  CONSTRAINT uq_product_merchant_config UNIQUE (tenant_id, product_id),
  CONSTRAINT uq_product_merchant_config_brand UNIQUE (tenant_id, brand_id, product_id),
  CONSTRAINT fk_prod_merchant_cfg_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_prod_merchant_cfg_brand  FOREIGN KEY (tenant_id, brand_id) REFERENCES brands(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_prod_merchant_cfg_prod   FOREIGN KEY (tenant_id, brand_id, product_id) REFERENCES products(tenant_id, brand_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_prod_merchant_cfg_enabled
  ON product_merchant_configs (tenant_id, brand_id, enabled);

-- ============================================================
-- 3. Merchant Product Mappings Table
-- ============================================================

CREATE TABLE IF NOT EXISTS merchant_product_mappings (
  id                       TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  tenant_id                TEXT        NOT NULL,
  brand_id                 TEXT        NOT NULL,
  product_id               TEXT        NOT NULL,
  merchant_account_id      TEXT        NOT NULL,
  offer_id                 TEXT        NOT NULL, -- Stable SKU or deterministic ID
  target_country           TEXT        NOT NULL DEFAULT 'IN',
  content_language         TEXT        NOT NULL DEFAULT 'en',
  feed_label               TEXT,
  channel                  TEXT        NOT NULL DEFAULT 'online_and_local', -- online, local, online_and_local
  sync_status              TEXT        NOT NULL DEFAULT 'NOT_ENABLED', -- NOT_ENABLED, QUEUED, SYNCING, SUBMITTED, PROCESSING, APPROVED, DISAPPROVED, ERROR, STALE, REMOVAL_PENDING, REMOVED
  provider_status          TEXT,       -- approved, disapproved, pending
  payload_hash             TEXT,       -- SHA-256 for change detection
  submitted_price          NUMERIC(10, 2),
  submitted_currency       TEXT,
  last_submitted_at        TIMESTAMPTZ,
  last_successful_sync_at  TIMESTAMPTZ,
  last_checked_at          TIMESTAMPTZ,
  last_error               TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_merchant_product_mappings PRIMARY KEY (id),
  CONSTRAINT uq_merchant_prod_mapping_brand UNIQUE (tenant_id, brand_id, product_id),
  CONSTRAINT uq_merchant_account_offer_id UNIQUE (tenant_id, merchant_account_id, offer_id),
  CONSTRAINT fk_merchant_prod_mapping_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_merchant_prod_mapping_brand  FOREIGN KEY (tenant_id, brand_id) REFERENCES brands(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_merchant_prod_mapping_prod   FOREIGN KEY (tenant_id, brand_id, product_id) REFERENCES products(tenant_id, brand_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_merchant_prod_mapping_status
  ON merchant_product_mappings (tenant_id, brand_id, sync_status);

-- ============================================================
-- 4. Merchant Local Inventory States Table
-- ============================================================

CREATE TABLE IF NOT EXISTS merchant_local_inventory_states (
  id                       TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  tenant_id                TEXT        NOT NULL,
  brand_id                 TEXT        NOT NULL,
  store_id                 TEXT        NOT NULL,
  product_id               TEXT        NOT NULL,
  mapping_id               TEXT        NOT NULL,
  store_code               TEXT        NOT NULL,
  submitted_price          NUMERIC(10, 2) NOT NULL,
  submitted_currency       TEXT        NOT NULL DEFAULT 'INR',
  submitted_availability   TEXT        NOT NULL, -- in_stock, out_of_stock, limited_availability, on_display_to_order
  submitted_quantity       INT,
  sync_status              TEXT        NOT NULL DEFAULT 'QUEUED', -- QUEUED, SYNCING, SYNCED, ERROR, REMOVED
  provider_status          TEXT,
  payload_hash             TEXT,
  last_submitted_at        TIMESTAMPTZ,
  last_checked_at          TIMESTAMPTZ,
  last_error               TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_merchant_local_inventory_states PRIMARY KEY (id),
  CONSTRAINT uq_merchant_local_inventory_store_prod UNIQUE (tenant_id, store_id, product_id),
  CONSTRAINT uq_merchant_local_inventory_tenant_brand_store_prod UNIQUE (tenant_id, brand_id, store_id, product_id),
  CONSTRAINT fk_merchant_local_inv_tenant  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_merchant_local_inv_brand   FOREIGN KEY (tenant_id, brand_id) REFERENCES brands(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_merchant_local_inv_store   FOREIGN KEY (tenant_id, brand_id, store_id) REFERENCES locations(tenant_id, brand_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_merchant_local_inv_prod    FOREIGN KEY (tenant_id, brand_id, product_id) REFERENCES products(tenant_id, brand_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_merchant_local_inv_mapping FOREIGN KEY (mapping_id) REFERENCES merchant_product_mappings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_merchant_local_inv_store_status
  ON merchant_local_inventory_states (tenant_id, store_id, sync_status);

CREATE INDEX IF NOT EXISTS idx_merchant_local_inv_brand_status
  ON merchant_local_inventory_states (tenant_id, brand_id, sync_status);

-- ============================================================
-- 5. Merchant Product Issues Table (Diagnostics)
-- ============================================================

CREATE TABLE IF NOT EXISTS merchant_product_issues (
  id                       TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  tenant_id                TEXT        NOT NULL,
  brand_id                 TEXT        NOT NULL,
  mapping_id               TEXT        NOT NULL,
  product_id               TEXT        NOT NULL,
  store_id                 TEXT,       -- Null for global product issues
  code                     TEXT        NOT NULL, -- missing_gtin, price_mismatch, etc.
  severity                 TEXT        NOT NULL, -- INFO, WARNING, ERROR, DISAPPROVAL
  attribute_name           TEXT,
  message                  TEXT        NOT NULL,
  detail                   TEXT,
  first_seen_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at              TIMESTAMPTZ,
  is_resolved              BOOLEAN     NOT NULL DEFAULT false,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_merchant_product_issues PRIMARY KEY (id),
  CONSTRAINT fk_merchant_issue_tenant  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_merchant_issue_brand   FOREIGN KEY (tenant_id, brand_id) REFERENCES brands(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_merchant_issue_mapping FOREIGN KEY (mapping_id) REFERENCES merchant_product_mappings(id) ON DELETE CASCADE,
  CONSTRAINT fk_merchant_issue_prod    FOREIGN KEY (tenant_id, brand_id, product_id) REFERENCES products(tenant_id, brand_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_merchant_issue_store   FOREIGN KEY (tenant_id, brand_id, store_id) REFERENCES locations(tenant_id, brand_id, id) ON DELETE CASCADE
);

-- Unique index treating NULL store_id as distinct or using NULLS NOT DISTINCT
CREATE UNIQUE INDEX IF NOT EXISTS uq_merchant_prod_issue
  ON merchant_product_issues (tenant_id, mapping_id, code, COALESCE(store_id, '__GLOBAL__'));

CREATE INDEX IF NOT EXISTS idx_merchant_issue_resolved
  ON merchant_product_issues (tenant_id, mapping_id, is_resolved);

CREATE INDEX IF NOT EXISTS idx_merchant_issue_severity
  ON merchant_product_issues (tenant_id, brand_id, severity);

-- ============================================================
-- 6. Enable and Force Row Level Security (Dual-Role PostgreSQL 16)
-- ============================================================

ALTER TABLE merchant_brand_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_brand_configs FORCE ROW LEVEL SECURITY;

ALTER TABLE product_merchant_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_merchant_configs FORCE ROW LEVEL SECURITY;

ALTER TABLE merchant_product_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_product_mappings FORCE ROW LEVEL SECURITY;

ALTER TABLE merchant_local_inventory_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_local_inventory_states FORCE ROW LEVEL SECURITY;

ALTER TABLE merchant_product_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_product_issues FORCE ROW LEVEL SECURITY;

-- ============================================================
-- 7. Tenant Isolation Policies for localbi_app
-- ============================================================

DROP POLICY IF EXISTS merchant_brand_configs_tenant_isolation ON merchant_brand_configs;
CREATE POLICY merchant_brand_configs_tenant_isolation ON merchant_brand_configs
  FOR ALL TO localbi_app
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS product_merchant_configs_tenant_isolation ON product_merchant_configs;
CREATE POLICY product_merchant_configs_tenant_isolation ON product_merchant_configs
  FOR ALL TO localbi_app
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS merchant_product_mappings_tenant_isolation ON merchant_product_mappings;
CREATE POLICY merchant_product_mappings_tenant_isolation ON merchant_product_mappings
  FOR ALL TO localbi_app
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS merchant_local_inventory_states_tenant_isolation ON merchant_local_inventory_states;
CREATE POLICY merchant_local_inventory_states_tenant_isolation ON merchant_local_inventory_states
  FOR ALL TO localbi_app
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS merchant_product_issues_tenant_isolation ON merchant_product_issues;
CREATE POLICY merchant_product_issues_tenant_isolation ON merchant_product_issues
  FOR ALL TO localbi_app
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

-- ============================================================
-- 8. Permissions Grant to localbi_app
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON merchant_brand_configs TO localbi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON product_merchant_configs TO localbi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON merchant_product_mappings TO localbi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON merchant_local_inventory_states TO localbi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON merchant_product_issues TO localbi_app;
