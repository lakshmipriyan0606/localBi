-- Phase 11: Content & Growth Engine
-- Blog CMS + SEO Content + Editorial Workflow + Internal Linking + Redirects
--
-- Creates tables for Content Authors, Categories, Briefs, Items, Versions, Relations, and Redirects
-- with strict Dual-Role PostgreSQL 16 Row Level Security (RLS).

-- ============================================================
-- 1. Content Authors Table
-- ============================================================

CREATE TABLE IF NOT EXISTS content_authors (
  id           TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  tenant_id    TEXT        NOT NULL,
  brand_id     TEXT        NOT NULL,
  name         TEXT        NOT NULL,
  slug         TEXT        NOT NULL,
  bio          TEXT,
  role         TEXT,
  avatar_url   TEXT,
  social_links JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_content_authors PRIMARY KEY (id),
  CONSTRAINT uq_content_author_tenant_id UNIQUE (tenant_id, id),
  CONSTRAINT uq_content_author_brand_slug UNIQUE (tenant_id, brand_id, slug),
  CONSTRAINT fk_content_author_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_content_author_brand  FOREIGN KEY (tenant_id, brand_id) REFERENCES brands(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_content_authors_brand
  ON content_authors (tenant_id, brand_id);

-- ============================================================
-- 2. Content Categories Table
-- ============================================================

CREATE TABLE IF NOT EXISTS content_categories (
  id          TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  tenant_id   TEXT        NOT NULL,
  brand_id    TEXT        NOT NULL,
  name        TEXT        NOT NULL,
  slug        TEXT        NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_content_categories PRIMARY KEY (id),
  CONSTRAINT uq_content_category_tenant_id UNIQUE (tenant_id, id),
  CONSTRAINT uq_content_category_brand_slug UNIQUE (tenant_id, brand_id, slug),
  CONSTRAINT fk_content_category_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_content_category_brand  FOREIGN KEY (tenant_id, brand_id) REFERENCES brands(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_content_categories_brand
  ON content_categories (tenant_id, brand_id);

-- ============================================================
-- 3. Content Briefs Table
-- ============================================================

CREATE TABLE IF NOT EXISTS content_briefs (
  id                   TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  tenant_id            TEXT        NOT NULL,
  brand_id             TEXT        NOT NULL,
  keyword_id           TEXT,
  opportunity_id       TEXT,
  working_title        TEXT        NOT NULL,
  primary_topic        TEXT        NOT NULL,
  primary_keyword      TEXT,
  secondary_keywords   JSONB,
  intent               TEXT        NOT NULL DEFAULT 'INFORMATIONAL', -- INFORMATIONAL, COMMERCIAL, LOCAL, TRANSACTIONAL
  target_audience      TEXT,
  related_product_ids  JSONB,
  related_store_ids    JSONB,
  related_category_ids JSONB,
  required_topics      JSONB,
  notes                TEXT,
  status               TEXT        NOT NULL DEFAULT 'DRAFT', -- DRAFT, READY, ASSIGNED, IN_PROGRESS, COMPLETED, DISCARDED
  created_by           TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_content_briefs PRIMARY KEY (id),
  CONSTRAINT uq_content_brief_tenant_id UNIQUE (tenant_id, id),
  CONSTRAINT fk_content_brief_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_content_brief_brand  FOREIGN KEY (tenant_id, brand_id) REFERENCES brands(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_content_brief_opp    FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE SET NULL,
  CONSTRAINT fk_content_brief_kw     FOREIGN KEY (keyword_id) REFERENCES keywords(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_content_briefs_status
  ON content_briefs (tenant_id, brand_id, status);

CREATE INDEX IF NOT EXISTS idx_content_briefs_opportunity
  ON content_briefs (tenant_id, opportunity_id);

-- ============================================================
-- 4. Content Items Table
-- ============================================================

CREATE TABLE IF NOT EXISTS content_items (
  id                     TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  tenant_id              TEXT        NOT NULL,
  brand_id               TEXT        NOT NULL,
  web_surface_id         TEXT,
  brief_id               TEXT,
  author_id              TEXT,
  category_id            TEXT,
  type                   TEXT        NOT NULL DEFAULT 'ARTICLE', -- ARTICLE, BLOG, GUIDE, FAQ_CONTENT, CUSTOM
  title                  TEXT        NOT NULL,
  slug                   TEXT        NOT NULL,
  excerpt                TEXT,
  status                 TEXT        NOT NULL DEFAULT 'DRAFT', -- DRAFT, IN_REVIEW, APPROVED, PUBLISHED, ARCHIVED
  featured_image_url     TEXT,
  featured_image_alt     TEXT,
  current_version_number INT         NOT NULL DEFAULT 1,
  published_version_id   TEXT,
  published_at           TIMESTAMPTZ,
  scheduled_at           TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_content_items PRIMARY KEY (id),
  CONSTRAINT uq_content_item_tenant_id UNIQUE (tenant_id, id),
  CONSTRAINT uq_content_item_brand_slug UNIQUE (tenant_id, brand_id, slug),
  CONSTRAINT fk_content_item_tenant  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_content_item_brand   FOREIGN KEY (tenant_id, brand_id) REFERENCES brands(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_content_item_surface FOREIGN KEY (web_surface_id) REFERENCES web_surfaces(id) ON DELETE SET NULL,
  CONSTRAINT fk_content_item_brief   FOREIGN KEY (brief_id) REFERENCES content_briefs(id) ON DELETE SET NULL,
  CONSTRAINT fk_content_item_author  FOREIGN KEY (author_id) REFERENCES content_authors(id) ON DELETE SET NULL,
  CONSTRAINT fk_content_item_cat     FOREIGN KEY (category_id) REFERENCES content_categories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_content_items_status
  ON content_items (tenant_id, brand_id, status);

CREATE INDEX IF NOT EXISTS idx_content_items_surface
  ON content_items (tenant_id, web_surface_id, status);

-- ============================================================
-- 5. Content Versions Table
-- ============================================================

CREATE TABLE IF NOT EXISTS content_versions (
  id              TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  tenant_id       TEXT        NOT NULL,
  content_item_id TEXT        NOT NULL,
  version         INT         NOT NULL,
  title           TEXT        NOT NULL,
  slug            TEXT        NOT NULL,
  excerpt         TEXT,
  content         JSONB       NOT NULL DEFAULT '{"blocks":[]}'::jsonb,
  seo_title       TEXT,
  seo_description TEXT,
  canonical_url   TEXT,
  og_image_url    TEXT,
  status          TEXT        NOT NULL DEFAULT 'DRAFT', -- DRAFT, IN_REVIEW, APPROVED, PUBLISHED, ARCHIVED
  origin          TEXT        NOT NULL DEFAULT 'HUMAN', -- HUMAN, AI_ASSISTED, AI_GENERATED_DRAFT
  ai_audit        JSONB,
  change_summary  TEXT,
  created_by      TEXT,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_content_versions PRIMARY KEY (id),
  CONSTRAINT uq_content_version_tenant_id UNIQUE (tenant_id, id),
  CONSTRAINT uq_content_version_number UNIQUE (content_item_id, version),
  CONSTRAINT fk_content_version_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_content_version_item   FOREIGN KEY (tenant_id, content_item_id) REFERENCES content_items(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_content_versions_status
  ON content_versions (tenant_id, content_item_id, status);

-- ============================================================
-- 6. Content Relations Table
-- ============================================================

CREATE TABLE IF NOT EXISTS content_relations (
  id              TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  tenant_id       TEXT        NOT NULL,
  content_item_id TEXT        NOT NULL,
  target_type     TEXT        NOT NULL, -- PRODUCT, STORE, CATEGORY, KEYWORD, CONTENT
  target_id       TEXT        NOT NULL,
  sort_order      INT         NOT NULL DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_content_relations PRIMARY KEY (id),
  CONSTRAINT uq_content_relation_tenant_id UNIQUE (tenant_id, id),
  CONSTRAINT uq_content_relation_target UNIQUE (content_item_id, target_type, target_id),
  CONSTRAINT fk_content_relation_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_content_relation_item   FOREIGN KEY (tenant_id, content_item_id) REFERENCES content_items(tenant_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_content_relations_item
  ON content_relations (tenant_id, content_item_id);

-- ============================================================
-- 7. Redirects Table
-- ============================================================

CREATE TABLE IF NOT EXISTS redirects (
  id             TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  tenant_id      TEXT        NOT NULL,
  web_surface_id TEXT,
  from_path      TEXT        NOT NULL,
  to_path        TEXT        NOT NULL,
  status_code    INT         NOT NULL DEFAULT 301,
  reason         TEXT,
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_redirects PRIMARY KEY (id),
  CONSTRAINT uq_redirect_tenant_id UNIQUE (tenant_id, id),
  CONSTRAINT uq_redirect_from_path UNIQUE (tenant_id, from_path),
  CONSTRAINT fk_redirect_tenant  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_redirect_surface FOREIGN KEY (web_surface_id) REFERENCES web_surfaces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_redirects_lookup
  ON redirects (tenant_id, from_path, is_active);

-- ============================================================
-- 8. Row Level Security (RLS) Policies
-- ============================================================

-- Table 1: content_authors
ALTER TABLE content_authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_authors FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON content_authors;
CREATE POLICY tenant_isolation_policy ON content_authors
  FOR ALL
  TO localbi_app
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text);

-- Table 2: content_categories
ALTER TABLE content_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_categories FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON content_categories;
CREATE POLICY tenant_isolation_policy ON content_categories
  FOR ALL
  TO localbi_app
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text);

-- Table 3: content_briefs
ALTER TABLE content_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_briefs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON content_briefs;
CREATE POLICY tenant_isolation_policy ON content_briefs
  FOR ALL
  TO localbi_app
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text);

-- Table 4: content_items
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON content_items;
CREATE POLICY tenant_isolation_policy ON content_items
  FOR ALL
  TO localbi_app
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text);

-- Table 5: content_versions
ALTER TABLE content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_versions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON content_versions;
CREATE POLICY tenant_isolation_policy ON content_versions
  FOR ALL
  TO localbi_app
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text);

-- Table 6: content_relations
ALTER TABLE content_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_relations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON content_relations;
CREATE POLICY tenant_isolation_policy ON content_relations
  FOR ALL
  TO localbi_app
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text);

-- Table 7: redirects
ALTER TABLE redirects ENABLE ROW LEVEL SECURITY;
ALTER TABLE redirects FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON redirects;
CREATE POLICY tenant_isolation_policy ON redirects
  FOR ALL
  TO localbi_app
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text);

-- ============================================================
-- 9. Permissions Grants to localbi_app
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON content_authors TO localbi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON content_categories TO localbi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON content_briefs TO localbi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON content_items TO localbi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON content_versions TO localbi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON content_relations TO localbi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON redirects TO localbi_app;
