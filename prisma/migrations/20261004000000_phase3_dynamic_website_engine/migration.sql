-- =============================================================================
-- Phase 3: Dynamic Website Engine, Puck Template Builder, Page Context & SSR
-- Migration: 20261004000000_phase3_dynamic_website_engine
-- Non-destructive additive migration establishing relational templates, versions,
-- web surfaces, domains, brand themes, pages, and SEO configurations.
-- =============================================================================

-- 1. Create web_surfaces table
CREATE TABLE IF NOT EXISTS "web_surfaces" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'LOCALBI',
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "web_surfaces_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'web_surfaces_tenant_id_fkey') THEN
        ALTER TABLE "web_surfaces" ADD CONSTRAINT "web_surfaces_tenant_id_fkey"
            FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'web_surfaces_tenant_id_brand_id_fkey') THEN
        ALTER TABLE "web_surfaces" ADD CONSTRAINT "web_surfaces_tenant_id_brand_id_fkey"
            FOREIGN KEY ("tenant_id", "brand_id") REFERENCES "brands"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "web_surfaces_tenant_id_id_key" ON "web_surfaces"("tenant_id", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "web_surfaces_tenant_id_brand_id_id_key" ON "web_surfaces"("tenant_id", "brand_id", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "web_surfaces_tenant_id_brand_id_type_key" ON "web_surfaces"("tenant_id", "brand_id", "type");
CREATE INDEX IF NOT EXISTS "idx_web_surfaces_brand" ON "web_surfaces"("tenant_id", "brand_id", "status");

-- 2. Create domains table
CREATE TABLE IF NOT EXISTS "domains" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "web_surface_id" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "ssl_status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "domains_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'domains_tenant_id_fkey') THEN
        ALTER TABLE "domains" ADD CONSTRAINT "domains_tenant_id_fkey"
            FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'domains_tenant_id_brand_id_fkey') THEN
        ALTER TABLE "domains" ADD CONSTRAINT "domains_tenant_id_brand_id_fkey"
            FOREIGN KEY ("tenant_id", "brand_id") REFERENCES "brands"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'domains_tenant_id_web_surface_id_fkey') THEN
        ALTER TABLE "domains" ADD CONSTRAINT "domains_tenant_id_web_surface_id_fkey"
            FOREIGN KEY ("tenant_id", "web_surface_id") REFERENCES "web_surfaces"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "domains_hostname_key" ON "domains"("hostname");
CREATE UNIQUE INDEX IF NOT EXISTS "domains_tenant_id_id_key" ON "domains"("tenant_id", "id");
CREATE INDEX IF NOT EXISTS "idx_domains_surface" ON "domains"("tenant_id", "brand_id", "web_surface_id");

-- 3. Create brand_themes table
CREATE TABLE IF NOT EXISTS "brand_themes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "primary_color" TEXT NOT NULL DEFAULT '#4F46E5',
    "secondary_color" TEXT NOT NULL DEFAULT '#0F172A',
    "accent_color" TEXT NOT NULL DEFAULT '#F59E0B',
    "background_color" TEXT NOT NULL DEFAULT '#FFFFFF',
    "text_color" TEXT NOT NULL DEFAULT '#0F172A',
    "font_heading" TEXT NOT NULL DEFAULT 'Inter, sans-serif',
    "font_body" TEXT NOT NULL DEFAULT 'Inter, sans-serif',
    "button_radius" TEXT NOT NULL DEFAULT '0.5rem',
    "card_radius" TEXT NOT NULL DEFAULT '0.75rem',
    "custom_css" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_themes_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'brand_themes_tenant_id_fkey') THEN
        ALTER TABLE "brand_themes" ADD CONSTRAINT "brand_themes_tenant_id_fkey"
            FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'brand_themes_tenant_id_brand_id_fkey') THEN
        ALTER TABLE "brand_themes" ADD CONSTRAINT "brand_themes_tenant_id_brand_id_fkey"
            FOREIGN KEY ("tenant_id", "brand_id") REFERENCES "brands"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "brand_themes_brand_id_key" ON "brand_themes"("brand_id");
CREATE UNIQUE INDEX IF NOT EXISTS "brand_themes_tenant_id_id_key" ON "brand_themes"("tenant_id", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "brand_themes_tenant_id_brand_id_key" ON "brand_themes"("tenant_id", "brand_id");

-- 4. Create page_templates table
CREATE TABLE IF NOT EXISTS "page_templates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "web_surface_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'STORE',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "active_version_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_templates_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'page_templates_tenant_id_fkey') THEN
        ALTER TABLE "page_templates" ADD CONSTRAINT "page_templates_tenant_id_fkey"
            FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'page_templates_tenant_id_brand_id_fkey') THEN
        ALTER TABLE "page_templates" ADD CONSTRAINT "page_templates_tenant_id_brand_id_fkey"
            FOREIGN KEY ("tenant_id", "brand_id") REFERENCES "brands"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'page_templates_tenant_id_web_surface_id_fkey') THEN
        ALTER TABLE "page_templates" ADD CONSTRAINT "page_templates_tenant_id_web_surface_id_fkey"
            FOREIGN KEY ("tenant_id", "web_surface_id") REFERENCES "web_surfaces"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "page_templates_tenant_id_id_key" ON "page_templates"("tenant_id", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "page_templates_tenant_brand_surface_type_name_key" ON "page_templates"("tenant_id", "brand_id", "web_surface_id", "type", "name");
CREATE INDEX IF NOT EXISTS "idx_page_templates_lookup" ON "page_templates"("tenant_id", "brand_id", "web_surface_id", "type");

-- 5. Create page_template_versions table
CREATE TABLE IF NOT EXISTS "page_template_versions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "page_template_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "puck_data" JSONB NOT NULL DEFAULT '{"content":[],"root":{"props":{"title":""}}}',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_by" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_template_versions_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'page_template_versions_tenant_id_fkey') THEN
        ALTER TABLE "page_template_versions" ADD CONSTRAINT "page_template_versions_tenant_id_fkey"
            FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'page_template_versions_page_template_id_fkey') THEN
        ALTER TABLE "page_template_versions" ADD CONSTRAINT "page_template_versions_page_template_id_fkey"
            FOREIGN KEY ("page_template_id") REFERENCES "page_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "page_template_versions_tenant_id_id_key" ON "page_template_versions"("tenant_id", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "page_template_versions_template_version_key" ON "page_template_versions"("page_template_id", "version");
CREATE INDEX IF NOT EXISTS "idx_page_template_versions_status" ON "page_template_versions"("tenant_id", "page_template_id", "status");

-- 6. Create pages (dynamic route catalog) table
CREATE TABLE IF NOT EXISTS "pages" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "web_surface_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "page_type" TEXT NOT NULL DEFAULT 'STORE',
    "slug" TEXT NOT NULL,
    "city_slug" TEXT,
    "store_id" TEXT,
    "category_id" TEXT,
    "product_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "canonical_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pages_tenant_id_fkey') THEN
        ALTER TABLE "pages" ADD CONSTRAINT "pages_tenant_id_fkey"
            FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pages_tenant_id_brand_id_fkey') THEN
        ALTER TABLE "pages" ADD CONSTRAINT "pages_tenant_id_brand_id_fkey"
            FOREIGN KEY ("tenant_id", "brand_id") REFERENCES "brands"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pages_tenant_id_web_surface_id_fkey') THEN
        ALTER TABLE "pages" ADD CONSTRAINT "pages_tenant_id_web_surface_id_fkey"
            FOREIGN KEY ("tenant_id", "web_surface_id") REFERENCES "web_surfaces"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pages_template_id_fkey') THEN
        ALTER TABLE "pages" ADD CONSTRAINT "pages_template_id_fkey"
            FOREIGN KEY ("template_id") REFERENCES "page_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pages_store_id_fkey') THEN
        ALTER TABLE "pages" ADD CONSTRAINT "pages_store_id_fkey"
            FOREIGN KEY ("store_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pages_category_id_fkey') THEN
        ALTER TABLE "pages" ADD CONSTRAINT "pages_category_id_fkey"
            FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pages_product_id_fkey') THEN
        ALTER TABLE "pages" ADD CONSTRAINT "pages_product_id_fkey"
            FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "pages_tenant_id_id_key" ON "pages"("tenant_id", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "pages_tenant_brand_surface_slug_key" ON "pages"("tenant_id", "brand_id", "web_surface_id", "slug");
CREATE INDEX IF NOT EXISTS "idx_pages_resolution" ON "pages"("tenant_id", "web_surface_id", "page_type", "slug");
CREATE INDEX IF NOT EXISTS "idx_pages_store" ON "pages"("tenant_id", "store_id");
CREATE INDEX IF NOT EXISTS "idx_pages_product" ON "pages"("tenant_id", "product_id");

-- 7. Create seo_configs table
CREATE TABLE IF NOT EXISTS "seo_configs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "web_surface_id" TEXT,
    "page_type" TEXT,
    "title_template" TEXT NOT NULL,
    "description_template" TEXT NOT NULL,
    "keywords" TEXT,
    "robots_policy" TEXT NOT NULL DEFAULT 'index, follow',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seo_configs_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'seo_configs_tenant_id_fkey') THEN
        ALTER TABLE "seo_configs" ADD CONSTRAINT "seo_configs_tenant_id_fkey"
            FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'seo_configs_tenant_id_brand_id_fkey') THEN
        ALTER TABLE "seo_configs" ADD CONSTRAINT "seo_configs_tenant_id_brand_id_fkey"
            FOREIGN KEY ("tenant_id", "brand_id") REFERENCES "brands"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'seo_configs_tenant_id_web_surface_id_fkey') THEN
        ALTER TABLE "seo_configs" ADD CONSTRAINT "seo_configs_tenant_id_web_surface_id_fkey"
            FOREIGN KEY ("tenant_id", "web_surface_id") REFERENCES "web_surfaces"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "seo_configs_tenant_id_id_key" ON "seo_configs"("tenant_id", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "seo_configs_tenant_brand_surface_pagetype_key" ON "seo_configs"("tenant_id", "brand_id", "web_surface_id", "page_type");
CREATE INDEX IF NOT EXISTS "idx_seo_configs_lookup" ON "seo_configs"("tenant_id", "brand_id", "page_type");

-- 8. Row Level Security (RLS) Configuration for runtime localbi_app role
ALTER TABLE "web_surfaces" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "web_surfaces" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "web_surfaces_tenant_isolation" ON "web_surfaces";
CREATE POLICY "web_surfaces_tenant_isolation" ON "web_surfaces"
    FOR ALL
    TO localbi_app
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

ALTER TABLE "domains" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "domains" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "domains_tenant_isolation" ON "domains";
CREATE POLICY "domains_tenant_isolation" ON "domains"
    FOR ALL
    TO localbi_app
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

ALTER TABLE "brand_themes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "brand_themes" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brand_themes_tenant_isolation" ON "brand_themes";
CREATE POLICY "brand_themes_tenant_isolation" ON "brand_themes"
    FOR ALL
    TO localbi_app
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

ALTER TABLE "page_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "page_templates" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "page_templates_tenant_isolation" ON "page_templates";
CREATE POLICY "page_templates_tenant_isolation" ON "page_templates"
    FOR ALL
    TO localbi_app
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

ALTER TABLE "page_template_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "page_template_versions" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "page_template_versions_tenant_isolation" ON "page_template_versions";
CREATE POLICY "page_template_versions_tenant_isolation" ON "page_template_versions"
    FOR ALL
    TO localbi_app
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

ALTER TABLE "pages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pages" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pages_tenant_isolation" ON "pages";
CREATE POLICY "pages_tenant_isolation" ON "pages"
    FOR ALL
    TO localbi_app
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

ALTER TABLE "seo_configs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "seo_configs" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seo_configs_tenant_isolation" ON "seo_configs";
CREATE POLICY "seo_configs_tenant_isolation" ON "seo_configs"
    FOR ALL
    TO localbi_app
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

-- Grant permissions to localbi_app
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE 
    "web_surfaces", "domains", "brand_themes", "page_templates", 
    "page_template_versions", "pages", "seo_configs" 
TO localbi_app;
