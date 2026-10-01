-- =============================================================================
-- Migration: 20261002000000_reconcile_microsites_and_gbp_tables
-- Reconciles schema drift for Microsite, Visitor, and GBP tables,
-- enforces dual-role RLS and grants permissions to localbi_app.
-- =============================================================================

-- 1. Create Tables (Safe if already created)
CREATE TABLE IF NOT EXISTS "microsites" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "brand_id" TEXT,
    "brand_name" TEXT NOT NULL,
    "location_id" TEXT,
    "location_name" TEXT,
    "tagline" TEXT,
    "about_story" TEXT,
    "primary_color" TEXT NOT NULL DEFAULT '#4F46E5',
    "secondary_color" TEXT,
    "font" TEXT NOT NULL DEFAULT 'Inter',
    "phone" TEXT NOT NULL DEFAULT '',
    "whatsapp" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "state" TEXT,
    "postal_code" TEXT,
    "hours" TEXT NOT NULL DEFAULT '9:00 AM - 9:00 PM',
    "google_rating" DOUBLE PRECISION NOT NULL DEFAULT 4.9,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "google_maps_url" TEXT NOT NULL DEFAULT '',
    "hero_image_url" TEXT NOT NULL DEFAULT '',
    "menu_items" JSONB NOT NULL DEFAULT '[]',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "custom_domain" TEXT,
    "custom_domain_status" TEXT NOT NULL DEFAULT 'NOT_CONNECTED',
    "industry" TEXT,
    "template_id" TEXT NOT NULL DEFAULT 'restaurant',
    "theme" JSONB,
    "pages" JSONB,
    "sections" JSONB,
    "draft_data" JSONB,
    "published_data" JSONB,
    "last_published_at" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "microsites_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "microsite_visitors" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "microsite_id" TEXT,
    "tenant_slug" TEXT NOT NULL,
    "device_fingerprint" TEXT NOT NULL,
    "is_identified" BOOLEAN NOT NULL DEFAULT false,
    "identified_user" JSONB,
    "intent_level" TEXT NOT NULL DEFAULT 'LOW',
    "page_views" JSONB NOT NULL DEFAULT '[]',
    "device_info" JSONB NOT NULL,
    "traffic_source" JSONB NOT NULL,
    "conversions" JSONB NOT NULL DEFAULT '[]',
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "microsite_visitors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "gbp_reviews" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "reviewer_name" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "replyComment" TEXT,
    "reply_updated_at" TIMESTAMP(3),
    "create_time" TIMESTAMP(3) NOT NULL,
    "update_time" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gbp_reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "gbp_location_aggregates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "average_rating" DOUBLE PRECISION,
    "total_review_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gbp_location_aggregates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "gbp_posts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "topic_type" TEXT NOT NULL,
    "language_code" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "call_to_action" JSONB,
    "event" JSONB,
    "offer" JSONB,
    "state" TEXT NOT NULL,
    "create_time" TIMESTAMP(3) NOT NULL,
    "update_time" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gbp_posts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "gbp_media" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "media_key" TEXT NOT NULL,
    "media_format" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "category" TEXT NOT NULL,
    "create_time" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gbp_media_pkey" PRIMARY KEY ("id")
);

-- 2. Create Unique Constraints & Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "uq_microsite_subdomain" ON "microsites"("tenant_id", "subdomain");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_microsite_tenant_id" ON "microsites"("tenant_id", "id");
CREATE INDEX IF NOT EXISTS "idx_microsites_tenant_published" ON "microsites"("tenant_id", "published");
CREATE INDEX IF NOT EXISTS "idx_microsites_custom_domain" ON "microsites"("custom_domain");

CREATE UNIQUE INDEX IF NOT EXISTS "uq_visitor_fingerprint" ON "microsite_visitors"("tenant_id", "device_fingerprint");
CREATE INDEX IF NOT EXISTS "idx_visitors_tenant_intent" ON "microsite_visitors"("tenant_id", "intent_level");
CREATE INDEX IF NOT EXISTS "idx_visitors_tenant_last_seen" ON "microsite_visitors"("tenant_id", "last_seen_at" DESC);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_gbp_review" ON "gbp_reviews"("tenant_id", "review_id");
CREATE INDEX IF NOT EXISTS "idx_gbp_reviews_location_updated" ON "gbp_reviews"("tenant_id", "location_id", "update_time" DESC);
CREATE INDEX IF NOT EXISTS "idx_gbp_reviews_location_rating" ON "gbp_reviews"("tenant_id", "location_id", "rating");

CREATE UNIQUE INDEX IF NOT EXISTS "uq_gbp_location_aggregate" ON "gbp_location_aggregates"("tenant_id", "location_id");

CREATE UNIQUE INDEX IF NOT EXISTS "uq_gbp_post" ON "gbp_posts"("tenant_id", "post_id");
CREATE INDEX IF NOT EXISTS "idx_gbp_posts_location_updated" ON "gbp_posts"("tenant_id", "location_id", "update_time" DESC);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_gbp_media" ON "gbp_media"("tenant_id", "media_key");
CREATE INDEX IF NOT EXISTS "idx_gbp_media_location" ON "gbp_media"("tenant_id", "location_id");

-- 3. Foreign Key Constraints (Idempotent via DO block)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'microsites_tenant_id_fkey') THEN
    ALTER TABLE "microsites" ADD CONSTRAINT "microsites_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'microsite_visitors_tenant_id_fkey') THEN
    ALTER TABLE "microsite_visitors" ADD CONSTRAINT "microsite_visitors_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'microsite_visitors_microsite_id_fkey') THEN
    ALTER TABLE "microsite_visitors" ADD CONSTRAINT "microsite_visitors_microsite_id_fkey"
      FOREIGN KEY ("microsite_id") REFERENCES "microsites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gbp_reviews_tenant_id_fkey') THEN
    ALTER TABLE "gbp_reviews" ADD CONSTRAINT "gbp_reviews_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gbp_reviews_location_fkey') THEN
    ALTER TABLE "gbp_reviews" ADD CONSTRAINT "gbp_reviews_location_fkey"
      FOREIGN KEY ("tenant_id", "location_id") REFERENCES "locations"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gbp_location_aggregates_tenant_id_fkey') THEN
    ALTER TABLE "gbp_location_aggregates" ADD CONSTRAINT "gbp_location_aggregates_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gbp_location_aggregates_location_fkey') THEN
    ALTER TABLE "gbp_location_aggregates" ADD CONSTRAINT "gbp_location_aggregates_location_fkey"
      FOREIGN KEY ("tenant_id", "location_id") REFERENCES "locations"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gbp_posts_tenant_id_fkey') THEN
    ALTER TABLE "gbp_posts" ADD CONSTRAINT "gbp_posts_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gbp_posts_location_fkey') THEN
    ALTER TABLE "gbp_posts" ADD CONSTRAINT "gbp_posts_location_fkey"
      FOREIGN KEY ("tenant_id", "location_id") REFERENCES "locations"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gbp_media_tenant_id_fkey') THEN
    ALTER TABLE "gbp_media" ADD CONSTRAINT "gbp_media_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gbp_media_location_fkey') THEN
    ALTER TABLE "gbp_media" ADD CONSTRAINT "gbp_media_location_fkey"
      FOREIGN KEY ("tenant_id", "location_id") REFERENCES "locations"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 4. Grants to Runtime Application Role (localbi_app)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "microsites" TO localbi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "microsite_visitors" TO localbi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "gbp_reviews" TO localbi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "gbp_location_aggregates" TO localbi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "gbp_posts" TO localbi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "gbp_media" TO localbi_app;

-- 5. Row-Level Security Enforcement & Policies
DO $$
DECLARE
  tbl text;
  tenant_tables text[] := ARRAY[
    'microsites',
    'microsite_visitors',
    'gbp_reviews',
    'gbp_location_aggregates',
    'gbp_posts',
    'gbp_media'
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

  -- Specialized public read policy for published storefronts
  DROP POLICY IF EXISTS microsites_public_select ON "microsites";
  CREATE POLICY microsites_public_select ON "microsites"
    FOR SELECT TO localbi_app
    USING (
      NULLIF(current_setting('app.public_read_scope', true), '') = 'published_only'
      AND published = true
    );
END $$;
