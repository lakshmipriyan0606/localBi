-- =============================================================================
-- Phase 2: Relational Product, Category & Store-Product Catalog Engine
-- Migration: 20261003000000_phase2_catalog_engine
-- Non-destructive additive migration establishing canonical relational catalog
-- =============================================================================

-- 1. Create categories table
CREATE TABLE IF NOT EXISTS "categories" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- Foreign keys for categories
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_tenant_id_fkey') THEN
        ALTER TABLE "categories" ADD CONSTRAINT "categories_tenant_id_fkey"
            FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_tenant_id_brand_id_fkey') THEN
        ALTER TABLE "categories" ADD CONSTRAINT "categories_tenant_id_brand_id_fkey"
            FOREIGN KEY ("tenant_id", "brand_id") REFERENCES "brands"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_parent_id_fkey') THEN
        ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey"
            FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Indexes for categories
CREATE UNIQUE INDEX IF NOT EXISTS "categories_tenant_id_id_key" ON "categories"("tenant_id", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "categories_tenant_id_brand_id_id_key" ON "categories"("tenant_id", "brand_id", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "categories_tenant_id_brand_id_slug_key" ON "categories"("tenant_id", "brand_id", "slug");
CREATE INDEX IF NOT EXISTS "idx_categories_brand_sort" ON "categories"("tenant_id", "brand_id", "sort_order");
CREATE INDEX IF NOT EXISTS "idx_categories_parent" ON "categories"("tenant_id", "parent_id");

-- 2. Extend products table with canonical catalog columns
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "category_id" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "slug" TEXT NOT NULL DEFAULT '';
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "short_description" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "base_price" DECIMAL(10,2);
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'INR';
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "publish_status" TEXT NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "featured" BOOLEAN NOT NULL DEFAULT false;

-- Backfill slug for any existing products without one
UPDATE "products"
SET "slug" = LOWER(REGEXP_REPLACE("name", '[^a-zA-Z0-9]+', '-', 'g'))
WHERE "slug" = '' OR "slug" IS NULL;

-- Product foreign keys and indexes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_category_id_fkey') THEN
        ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey"
            FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "products_tenant_id_brand_id_slug_key" ON "products"("tenant_id", "brand_id", "slug");
CREATE INDEX IF NOT EXISTS "idx_products_brand_category" ON "products"("tenant_id", "brand_id", "category_id");
CREATE INDEX IF NOT EXISTS "idx_products_brand_status" ON "products"("tenant_id", "brand_id", "status", "publish_status");

-- 3. Create canonical store_products many-to-many table
CREATE TABLE IF NOT EXISTS "store_products" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "price_override" DECIMAL(10,2),
    "quantity" INTEGER DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_products_pkey" PRIMARY KEY ("id")
);

-- StoreProduct constraints ensuring store and product belong to exact same tenant and brand
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'store_products_tenant_id_fkey') THEN
        ALTER TABLE "store_products" ADD CONSTRAINT "store_products_tenant_id_fkey"
            FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'store_products_tenant_id_brand_id_fkey') THEN
        ALTER TABLE "store_products" ADD CONSTRAINT "store_products_tenant_id_brand_id_fkey"
            FOREIGN KEY ("tenant_id", "brand_id") REFERENCES "brands"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'store_products_store_fkey') THEN
        ALTER TABLE "store_products" ADD CONSTRAINT "store_products_store_fkey"
            FOREIGN KEY ("tenant_id", "brand_id", "store_id") REFERENCES "locations"("tenant_id", "brand_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'store_products_product_fkey') THEN
        ALTER TABLE "store_products" ADD CONSTRAINT "store_products_product_fkey"
            FOREIGN KEY ("tenant_id", "brand_id", "product_id") REFERENCES "products"("tenant_id", "brand_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "store_products_tenant_id_id_key" ON "store_products"("tenant_id", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "store_products_tenant_id_brand_id_id_key" ON "store_products"("tenant_id", "brand_id", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "store_products_store_id_product_id_key" ON "store_products"("store_id", "product_id");
CREATE UNIQUE INDEX IF NOT EXISTS "store_products_tenant_id_brand_id_store_id_product_id_key" ON "store_products"("tenant_id", "brand_id", "store_id", "product_id");
CREATE INDEX IF NOT EXISTS "idx_store_products_store" ON "store_products"("tenant_id", "brand_id", "store_id");
CREATE INDEX IF NOT EXISTS "idx_store_products_product" ON "store_products"("tenant_id", "brand_id", "product_id");
CREATE INDEX IF NOT EXISTS "idx_store_products_availability" ON "store_products"("tenant_id", "is_available");

-- 4. Create product_media table
CREATE TABLE IF NOT EXISTS "product_media" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt_text" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "type" TEXT NOT NULL DEFAULT 'IMAGE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_media_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_media_tenant_id_fkey') THEN
        ALTER TABLE "product_media" ADD CONSTRAINT "product_media_tenant_id_fkey"
            FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_media_tenant_id_product_id_fkey') THEN
        ALTER TABLE "product_media" ADD CONSTRAINT "product_media_tenant_id_product_id_fkey"
            FOREIGN KEY ("tenant_id", "product_id") REFERENCES "products"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "product_media_tenant_id_id_key" ON "product_media"("tenant_id", "id");
CREATE INDEX IF NOT EXISTS "idx_product_media_product_sort" ON "product_media"("tenant_id", "product_id", "sort_order");

-- 5. Row-Level Security (RLS) Configuration for runtime localbi_app role
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_tenant_isolation" ON "categories";
CREATE POLICY "categories_tenant_isolation" ON "categories"
    FOR ALL
    TO localbi_app
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

ALTER TABLE "store_products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "store_products" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_products_tenant_isolation" ON "store_products";
CREATE POLICY "store_products_tenant_isolation" ON "store_products"
    FOR ALL
    TO localbi_app
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

ALTER TABLE "product_media" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_media" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_media_tenant_isolation" ON "product_media";
CREATE POLICY "product_media_tenant_isolation" ON "product_media"
    FOR ALL
    TO localbi_app
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

-- Ensure products table has strict RLS policy
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "products" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_tenant_isolation" ON "products";
CREATE POLICY "products_tenant_isolation" ON "products"
    FOR ALL
    TO localbi_app
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

-- Grant permissions to localbi_app
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "categories", "products", "store_products", "product_media" TO localbi_app;
