-- Phase 6: Google Business Profile Operations
-- Adds per-location GBP sync state tracking, GBP Search Terms table,
-- and fixes Microsite.google_rating fake default (4.9 → 0.0).
--
-- RLS: All new tenant tables have ENABLE ROW LEVEL SECURITY + FORCE ROW LEVEL SECURITY
-- enforced under the localbi_app role with fail-closed policies.

-- ============================================================
-- 1. Per-Location GBP Sync State Fields
-- ============================================================

ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS gbp_sync_status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS gbp_synced_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS gbp_sync_error  TEXT;

COMMENT ON COLUMN locations.gbp_sync_status IS
  'GBP sync state: ACTIVE | SYNCING | SYNCED | STALE | ERROR | REAUTH_REQUIRED | RESOURCE_UNAVAILABLE';

-- Index for finding locations that need sync attention
CREATE INDEX IF NOT EXISTS idx_locations_gbp_sync_status
  ON locations (tenant_id, gbp_sync_status)
  WHERE gbp_sync_status IS NOT NULL;

-- ============================================================
-- 2. GBP Search Terms Table (keyword impressions)
-- Distinct from GSC queries — source is always GOOGLE_BUSINESS_PROFILE
-- ============================================================

CREATE TABLE IF NOT EXISTS gbp_search_terms (
  id            TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  tenant_id     TEXT        NOT NULL,
  location_id   TEXT        NOT NULL,
  term          TEXT        NOT NULL,
  impressions   BIGINT      NOT NULL DEFAULT 0,
  period_start  DATE        NOT NULL,
  period_end    DATE        NOT NULL,
  source        TEXT        NOT NULL DEFAULT 'GOOGLE_BUSINESS_PROFILE',
  synced_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_gbp_search_terms PRIMARY KEY (id),
  CONSTRAINT uq_gbp_search_term  UNIQUE (tenant_id, location_id, term, period_start),
  CONSTRAINT fk_gbp_search_term_tenant   FOREIGN KEY (tenant_id)   REFERENCES tenants(id)   ON DELETE CASCADE,
  CONSTRAINT fk_gbp_search_term_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_gbp_search_term_location_period
  ON gbp_search_terms (tenant_id, location_id, period_start DESC);

-- ============================================================
-- 3. Row-Level Security for gbp_search_terms
-- ============================================================

ALTER TABLE gbp_search_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_search_terms FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_localbi_app ON gbp_search_terms;
DROP POLICY IF EXISTS gbp_search_terms_tenant_isolation ON gbp_search_terms;

CREATE POLICY gbp_search_terms_tenant_isolation ON gbp_search_terms
  FOR ALL
  TO localbi_app
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

GRANT SELECT, INSERT, UPDATE, DELETE ON gbp_search_terms TO localbi_app;

-- ============================================================
-- 4. Fix Microsite.google_rating fake default (4.9 → 0.0)
-- ============================================================

ALTER TABLE microsites
  ALTER COLUMN google_rating SET DEFAULT 0.0;

-- Back-fill rows that still carry the fake default 4.9 and have no real GBP data
-- (microsites with a linked location will get the real rating on next sync)
UPDATE microsites
  SET google_rating = 0.0
  WHERE google_rating = 4.9 AND location_id IS NULL;

-- ============================================================
-- 5. Additional index on gbp_daily_metrics for dashboard aggregation
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_gbp_daily_metrics_location_metric_date
  ON gbp_daily_metrics (tenant_id, location_id, metric_type, date DESC);
