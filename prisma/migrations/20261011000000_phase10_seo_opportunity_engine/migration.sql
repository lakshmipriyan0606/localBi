-- Phase 10: Keyword Intelligence + SEO Opportunity Engine
-- Factual Signals + Explainable Recommendations + Prioritization
--
-- Creates tables for Opportunities and Opportunity Evidence
-- with strict Dual-Role PostgreSQL 16 Row Level Security (RLS).

-- ============================================================
-- 1. Opportunities Table
-- ============================================================

CREATE TABLE IF NOT EXISTS opportunities (
  id                TEXT             NOT NULL DEFAULT gen_random_uuid()::text,
  tenant_id         TEXT             NOT NULL,
  brand_id          TEXT             NOT NULL,
  store_id          TEXT,
  web_surface_id    TEXT,
  page_id           TEXT,
  product_id        TEXT,
  category_id       TEXT,
  keyword_id        TEXT,

  type              TEXT             NOT NULL, -- HIGH_IMPRESSIONS_LOW_CTR, HIGH_DEMAND_LOW_RANK, HIGH_CONVERSION_LOW_VISIBILITY, PAGE_WITH_TRAFFIC_NO_CONVERSIONS, MISSING_LANDING_PAGE, GBP_PROFILE_INCOMPLETE, UNANSWERED_REVIEWS, MERCHANT_PRODUCT_ISSUE, LOCAL_RANK_DECLINE, SEARCH_DEMAND_GROWTH
  status            TEXT             NOT NULL DEFAULT 'OPEN', -- OPEN, IN_REVIEW, ACCEPTED, DISMISSED, COMPLETED, STALE
  priority          TEXT             NOT NULL DEFAULT 'MEDIUM', -- CRITICAL, HIGH, MEDIUM, LOW
  priority_score    DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  confidence        TEXT             NOT NULL DEFAULT 'MEDIUM', -- HIGH, MEDIUM, LOW

  title             TEXT             NOT NULL,
  summary           TEXT             NOT NULL,
  action_type       TEXT             NOT NULL, -- UPDATE_METADATA, IMPROVE_EXISTING_PAGE, CREATE_PAGE, ADD_PRODUCT_TO_STORE, FIX_GBP_PROFILE, RESPOND_TO_REVIEWS, FIX_MERCHANT_PRODUCT, INVESTIGATE_RANK_DECLINE, IMPROVE_CTA, ADD_KEYWORD_TRACKING
  action_payload    JSONB,

  rule_id           TEXT             NOT NULL,
  rule_version      TEXT             NOT NULL DEFAULT '1.0.0',
  identity_hash     TEXT             NOT NULL,

  detected_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  last_evaluated_at TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  resolved_at       TIMESTAMPTZ,
  dismissed_at      TIMESTAMPTZ,
  dismissal_reason  TEXT,
  dismissed_by      TEXT,
  accepted_at       TIMESTAMPTZ,
  accepted_by       TEXT,
  created_at        TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_opportunities PRIMARY KEY (id),
  CONSTRAINT uq_opportunity_tenant_id UNIQUE (tenant_id, id),
  CONSTRAINT uq_opportunity_identity_hash UNIQUE (tenant_id, identity_hash),
  CONSTRAINT fk_opportunities_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_opportunities_brand  FOREIGN KEY (tenant_id, brand_id) REFERENCES brands(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_opportunities_store  FOREIGN KEY (store_id) REFERENCES locations(id) ON DELETE SET NULL,
  CONSTRAINT fk_opportunities_surface FOREIGN KEY (web_surface_id) REFERENCES web_surfaces(id) ON DELETE SET NULL,
  CONSTRAINT fk_opportunities_page   FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE SET NULL,
  CONSTRAINT fk_opportunities_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  CONSTRAINT fk_opportunities_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  CONSTRAINT fk_opportunities_keyword FOREIGN KEY (keyword_id) REFERENCES keywords(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_opp_brand_status_priority
  ON opportunities (tenant_id, brand_id, status, priority_score DESC);

CREATE INDEX IF NOT EXISTS idx_opp_store_status
  ON opportunities (tenant_id, store_id, status);

CREATE INDEX IF NOT EXISTS idx_opp_type_status
  ON opportunities (tenant_id, type, status);

-- ============================================================
-- 2. Opportunity Evidence Table
-- ============================================================

CREATE TABLE IF NOT EXISTS opportunity_evidence (
  id                TEXT             NOT NULL DEFAULT gen_random_uuid()::text,
  tenant_id         TEXT             NOT NULL,
  opportunity_id    TEXT             NOT NULL,
  source            TEXT             NOT NULL, -- GSC, GBP, LOCAL_RANK, GA4, LOCALBI, MERCHANT
  metric            TEXT             NOT NULL, -- impressions, clicks, ctr, average_position, top3_coverage, top10_coverage, average_rank, conversions, call_count, unanswered_reviews, etc.
  value             DOUBLE PRECISION NOT NULL,
  comparison_value  DOUBLE PRECISION,
  formatted_value   TEXT,
  date_range        TEXT,
  entity_type       TEXT,                      -- KEYWORD, PAGE, LOCATION, PRODUCT
  entity_id         TEXT,
  entity_label      TEXT,
  details           JSONB,
  captured_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_opportunity_evidence PRIMARY KEY (id),
  CONSTRAINT uq_opportunity_evidence_tenant_id UNIQUE (tenant_id, id),
  CONSTRAINT fk_opp_evidence_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_opp_evidence_opp    FOREIGN KEY (tenant_id, opportunity_id) REFERENCES opportunities(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_opp_evidence_opportunity
  ON opportunity_evidence (tenant_id, opportunity_id);

-- ============================================================
-- 3. Row Level Security (RLS) Policies
-- ============================================================

-- Table 1: opportunities
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON opportunities;
CREATE POLICY tenant_isolation_policy ON opportunities
  FOR ALL
  TO localbi_app
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text);

-- Table 2: opportunity_evidence
ALTER TABLE opportunity_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_evidence FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON opportunity_evidence;
CREATE POLICY tenant_isolation_policy ON opportunity_evidence
  FOR ALL
  TO localbi_app
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text);

-- ============================================================
-- 4. Permissions Grant to localbi_app
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON opportunities TO localbi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON opportunity_evidence TO localbi_app;
