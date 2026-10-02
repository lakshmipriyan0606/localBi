-- Phase 7: Hyper Rank / Local Search Visibility Engine
-- Keywords + Geo-Grid Rank Tracking + Competitor Intelligence
--
-- Adds coordinates to locations, creates keyword management tables,
-- geo-grid configuration, rank runs, historical observations, summaries,
-- and competitor intelligence tracking tables with Dual-Role PostgreSQL 16 RLS.

-- ============================================================
-- 1. Location Coordinates & Place ID
-- ============================================================

ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS google_place_id TEXT;

-- ============================================================
-- 2. Keywords Table
-- ============================================================

CREATE TABLE IF NOT EXISTS keywords (
  id              TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  tenant_id       TEXT        NOT NULL,
  brand_id        TEXT        NOT NULL,
  term            TEXT        NOT NULL,
  normalized_term TEXT        NOT NULL,
  source          TEXT        NOT NULL DEFAULT 'MANUAL', -- MANUAL, GSC, GBP, IMPORT
  status          TEXT        NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, PAUSED
  locale          TEXT        NOT NULL DEFAULT 'en',
  country         TEXT        NOT NULL DEFAULT 'IN',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_keywords PRIMARY KEY (id),
  CONSTRAINT uq_keyword_tenant_brand_term UNIQUE (tenant_id, brand_id, normalized_term),
  CONSTRAINT fk_keywords_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_keywords_brand  FOREIGN KEY (brand_id)  REFERENCES brands(id)  ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_keywords_tenant_brand_status
  ON keywords (tenant_id, brand_id, status);

-- ============================================================
-- 3. Store Keywords Table (M:N Store ↔ Keyword)
-- ============================================================

CREATE TABLE IF NOT EXISTS store_keywords (
  id               TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  tenant_id        TEXT        NOT NULL,
  store_id         TEXT        NOT NULL,
  keyword_id       TEXT        NOT NULL,
  tracking_enabled BOOLEAN     NOT NULL DEFAULT true,
  priority         INT         NOT NULL DEFAULT 1,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_store_keywords PRIMARY KEY (id),
  CONSTRAINT uq_store_keyword UNIQUE (tenant_id, store_id, keyword_id),
  CONSTRAINT fk_store_keywords_tenant  FOREIGN KEY (tenant_id)  REFERENCES tenants(id)   ON DELETE CASCADE,
  CONSTRAINT fk_store_keywords_store   FOREIGN KEY (store_id)   REFERENCES locations(id) ON DELETE CASCADE,
  CONSTRAINT fk_store_keywords_keyword FOREIGN KEY (keyword_id) REFERENCES keywords(id)  ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_store_keywords_tenant_store
  ON store_keywords (tenant_id, store_id, tracking_enabled);

CREATE INDEX IF NOT EXISTS idx_store_keywords_tenant_keyword
  ON store_keywords (tenant_id, keyword_id);

-- ============================================================
-- 4. Rank Grid Configs Table
-- ============================================================

CREATE TABLE IF NOT EXISTS rank_grid_configs (
  id               TEXT             NOT NULL DEFAULT gen_random_uuid()::text,
  tenant_id        TEXT             NOT NULL,
  store_id         TEXT             NOT NULL,
  grid_size        INT              NOT NULL DEFAULT 7,
  radius_km        DOUBLE PRECISION NOT NULL DEFAULT 5.0,
  center_latitude  DOUBLE PRECISION NOT NULL,
  center_longitude DOUBLE PRECISION NOT NULL,
  status           TEXT             NOT NULL DEFAULT 'ACTIVE',
  created_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_rank_grid_configs PRIMARY KEY (id),
  CONSTRAINT uq_rank_grid_config UNIQUE (tenant_id, store_id, grid_size, radius_km),
  CONSTRAINT fk_rank_grid_configs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)   ON DELETE CASCADE,
  CONSTRAINT fk_rank_grid_configs_store  FOREIGN KEY (store_id)  REFERENCES locations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rank_grid_config_tenant_store
  ON rank_grid_configs (tenant_id, store_id, status);

-- ============================================================
-- 5. Rank Runs Table
-- ============================================================

CREATE TABLE IF NOT EXISTS rank_runs (
  id             TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  tenant_id      TEXT        NOT NULL,
  brand_id       TEXT        NOT NULL,
  store_id       TEXT        NOT NULL,
  keyword_id     TEXT        NOT NULL,
  grid_config_id TEXT        NOT NULL,
  provider       TEXT        NOT NULL DEFAULT 'LOCAL_RANK_PROVIDER',
  status         TEXT        NOT NULL DEFAULT 'QUEUED', -- QUEUED, RUNNING, PARTIAL, COMPLETED, FAILED, CANCELLED
  business_key   TEXT        NOT NULL,
  scheduled_date DATE        NOT NULL,
  started_at     TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  error_code     TEXT,
  error_message  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_rank_runs PRIMARY KEY (id),
  CONSTRAINT uq_rank_run_business_key UNIQUE (tenant_id, business_key),
  CONSTRAINT fk_rank_runs_tenant      FOREIGN KEY (tenant_id)      REFERENCES tenants(id)           ON DELETE CASCADE,
  CONSTRAINT fk_rank_runs_brand       FOREIGN KEY (brand_id)       REFERENCES brands(id)            ON DELETE CASCADE,
  CONSTRAINT fk_rank_runs_store       FOREIGN KEY (store_id)       REFERENCES locations(id)         ON DELETE CASCADE,
  CONSTRAINT fk_rank_runs_keyword     FOREIGN KEY (keyword_id)     REFERENCES keywords(id)          ON DELETE CASCADE,
  CONSTRAINT fk_rank_runs_grid_config FOREIGN KEY (grid_config_id) REFERENCES rank_grid_configs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rank_runs_tenant_store_kw_date
  ON rank_runs (tenant_id, store_id, keyword_id, scheduled_date DESC);

CREATE INDEX IF NOT EXISTS idx_rank_runs_tenant_status
  ON rank_runs (tenant_id, status);

-- ============================================================
-- 6. Rank Observations Table (Time-Series Local Observations)
-- ============================================================

CREATE TABLE IF NOT EXISTS rank_observations (
  id              BIGSERIAL        NOT NULL,
  tenant_id       TEXT             NOT NULL,
  rank_run_id     TEXT             NOT NULL,
  point_index     INT              NOT NULL,
  grid_row        INT              NOT NULL,
  grid_col        INT              NOT NULL,
  latitude        DOUBLE PRECISION NOT NULL,
  longitude       DOUBLE PRECISION NOT NULL,
  distance_km     DOUBLE PRECISION NOT NULL,
  rank            INT,             -- 1..20, or NULL if not found. Never 0!
  found           BOOLEAN          NOT NULL DEFAULT false,
  checked_depth   INT              NOT NULL DEFAULT 20,
  result_type     TEXT             NOT NULL DEFAULT 'LOCAL_PACK',
  top_competitors JSONB,
  observed_at     TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_rank_observations PRIMARY KEY (id),
  CONSTRAINT uq_rank_observation_point UNIQUE (tenant_id, rank_run_id, point_index),
  CONSTRAINT fk_rank_observations_tenant   FOREIGN KEY (tenant_id)   REFERENCES tenants(id)   ON DELETE CASCADE,
  CONSTRAINT fk_rank_observations_rank_run FOREIGN KEY (rank_run_id) REFERENCES rank_runs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rank_obs_tenant_run
  ON rank_observations (tenant_id, rank_run_id);

CREATE INDEX IF NOT EXISTS idx_rank_obs_tenant_observed
  ON rank_observations (tenant_id, observed_at DESC);

-- ============================================================
-- 7. Rank Run Summaries Table
-- ============================================================

CREATE TABLE IF NOT EXISTS rank_run_summaries (
  id                   TEXT             NOT NULL DEFAULT gen_random_uuid()::text,
  tenant_id            TEXT             NOT NULL,
  rank_run_id          TEXT             NOT NULL UNIQUE,
  store_id             TEXT             NOT NULL,
  keyword_id           TEXT             NOT NULL,
  total_points         INT              NOT NULL,
  valid_checked_points INT              NOT NULL,
  found_points         INT              NOT NULL,
  top3_count           INT              NOT NULL,
  top10_count          INT              NOT NULL,
  average_found_rank   DOUBLE PRECISION,
  top3_coverage        DOUBLE PRECISION NOT NULL,
  top10_coverage       DOUBLE PRECISION NOT NULL,
  share_of_voice       DOUBLE PRECISION NOT NULL,
  created_at           TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_rank_run_summaries PRIMARY KEY (id),
  CONSTRAINT fk_rank_run_summaries_tenant   FOREIGN KEY (tenant_id)   REFERENCES tenants(id)   ON DELETE CASCADE,
  CONSTRAINT fk_rank_run_summaries_rank_run FOREIGN KEY (rank_run_id) REFERENCES rank_runs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rank_summary_tenant_store
  ON rank_run_summaries (tenant_id, store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rank_summary_tenant_keyword
  ON rank_run_summaries (tenant_id, keyword_id, created_at DESC);

-- ============================================================
-- 8. Competitors Table
-- ============================================================

CREATE TABLE IF NOT EXISTS competitors (
  id                TEXT             NOT NULL DEFAULT gen_random_uuid()::text,
  tenant_id         TEXT             NOT NULL,
  name              TEXT             NOT NULL,
  external_place_id TEXT,
  domain            TEXT,
  category          TEXT,
  latitude          DOUBLE PRECISION,
  longitude         DOUBLE PRECISION,
  source            TEXT             NOT NULL DEFAULT 'OBSERVED',
  created_at        TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_competitors PRIMARY KEY (id),
  CONSTRAINT uq_competitor_place_id UNIQUE (tenant_id, external_place_id),
  CONSTRAINT fk_competitors_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_competitor_tenant_name
  ON competitors (tenant_id, name);

-- ============================================================
-- 9. Store Competitors Table (M:N Store ↔ Competitor)
-- ============================================================

CREATE TABLE IF NOT EXISTS store_competitors (
  id                 TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  tenant_id          TEXT        NOT NULL,
  store_id           TEXT        NOT NULL,
  competitor_id      TEXT        NOT NULL,
  observed_frequency INT         NOT NULL DEFAULT 1,
  last_observed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_store_competitors PRIMARY KEY (id),
  CONSTRAINT uq_store_competitor UNIQUE (tenant_id, store_id, competitor_id),
  CONSTRAINT fk_store_competitors_tenant     FOREIGN KEY (tenant_id)     REFERENCES tenants(id)     ON DELETE CASCADE,
  CONSTRAINT fk_store_competitors_store      FOREIGN KEY (store_id)      REFERENCES locations(id)   ON DELETE CASCADE,
  CONSTRAINT fk_store_competitors_competitor FOREIGN KEY (competitor_id) REFERENCES competitors(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_store_competitors_freq
  ON store_competitors (tenant_id, store_id, observed_frequency DESC);

-- ============================================================
-- 10. Enable & Force Row-Level Security on All 8 New Tables
-- ============================================================

ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE keywords FORCE ROW LEVEL SECURITY;

ALTER TABLE store_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_keywords FORCE ROW LEVEL SECURITY;

ALTER TABLE rank_grid_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rank_grid_configs FORCE ROW LEVEL SECURITY;

ALTER TABLE rank_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rank_runs FORCE ROW LEVEL SECURITY;

ALTER TABLE rank_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rank_observations FORCE ROW LEVEL SECURITY;

ALTER TABLE rank_run_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE rank_run_summaries FORCE ROW LEVEL SECURITY;

ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitors FORCE ROW LEVEL SECURITY;

ALTER TABLE store_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_competitors FORCE ROW LEVEL SECURITY;

-- ============================================================
-- 11. Dual-Role Tenant Isolation Policies for localbi_app
-- ============================================================

DROP POLICY IF EXISTS keywords_tenant_isolation ON keywords;
CREATE POLICY keywords_tenant_isolation ON keywords
  FOR ALL TO localbi_app
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS store_keywords_tenant_isolation ON store_keywords;
CREATE POLICY store_keywords_tenant_isolation ON store_keywords
  FOR ALL TO localbi_app
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS rank_grid_configs_tenant_isolation ON rank_grid_configs;
CREATE POLICY rank_grid_configs_tenant_isolation ON rank_grid_configs
  FOR ALL TO localbi_app
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS rank_runs_tenant_isolation ON rank_runs;
CREATE POLICY rank_runs_tenant_isolation ON rank_runs
  FOR ALL TO localbi_app
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS rank_observations_tenant_isolation ON rank_observations;
CREATE POLICY rank_observations_tenant_isolation ON rank_observations
  FOR ALL TO localbi_app
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS rank_run_summaries_tenant_isolation ON rank_run_summaries;
CREATE POLICY rank_run_summaries_tenant_isolation ON rank_run_summaries
  FOR ALL TO localbi_app
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS competitors_tenant_isolation ON competitors;
CREATE POLICY competitors_tenant_isolation ON competitors
  FOR ALL TO localbi_app
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS store_competitors_tenant_isolation ON store_competitors;
CREATE POLICY store_competitors_tenant_isolation ON store_competitors
  FOR ALL TO localbi_app
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

-- ============================================================
-- 12. Permissions Grant to localbi_app
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON keywords TO localbi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON store_keywords TO localbi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON rank_grid_configs TO localbi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON rank_runs TO localbi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON rank_observations TO localbi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON rank_run_summaries TO localbi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON competitors TO localbi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON store_competitors TO localbi_app;
GRANT USAGE, SELECT ON SEQUENCE rank_observations_id_seq TO localbi_app;
