-- AlterTable internal_resource_mappings
ALTER TABLE "internal_resource_mappings" ADD COLUMN IF NOT EXISTS "brand_id" TEXT;
ALTER TABLE "internal_resource_mappings" ADD COLUMN IF NOT EXISTS "web_surface_id" TEXT;
ALTER TABLE "internal_resource_mappings" ADD COLUMN IF NOT EXISTS "filter_strategy" TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "internal_resource_mappings" ADD COLUMN IF NOT EXISTS "hostname_filter" TEXT;
ALTER TABLE "internal_resource_mappings" ADD COLUMN IF NOT EXISTS "url_prefix_filter" TEXT;
ALTER TABLE "internal_resource_mappings" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "internal_resource_mappings" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_resource_mapping_surface" ON "internal_resource_mappings"("tenant_id", "web_surface_id");
CREATE INDEX IF NOT EXISTS "idx_resource_mapping_brand" ON "internal_resource_mappings"("tenant_id", "brand_id");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'internal_resource_mappings_brand_id_fkey'
    ) THEN
        ALTER TABLE "internal_resource_mappings" ADD CONSTRAINT "internal_resource_mappings_brand_id_fkey" FOREIGN KEY ("tenant_id", "brand_id") REFERENCES "brands"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'internal_resource_mappings_web_surface_id_fkey'
    ) THEN
        ALTER TABLE "internal_resource_mappings" ADD CONSTRAINT "internal_resource_mappings_web_surface_id_fkey" FOREIGN KEY ("tenant_id", "web_surface_id") REFERENCES "web_surfaces"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateTable ga4_daily_metrics
CREATE TABLE IF NOT EXISTS "ga4_daily_metrics" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "web_surface_id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "active_users" INTEGER NOT NULL DEFAULT 0,
    "new_users" INTEGER NOT NULL DEFAULT 0,
    "sessions" INTEGER NOT NULL DEFAULT 0,
    "engaged_sessions" INTEGER NOT NULL DEFAULT 0,
    "event_count" INTEGER NOT NULL DEFAULT 0,
    "key_events" INTEGER NOT NULL DEFAULT 0,
    "screen_page_views" INTEGER NOT NULL DEFAULT 0,
    "avg_engagement_time" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "freshness_timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ga4_daily_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "uq_ga4_daily_metric" ON "ga4_daily_metrics"("tenant_id", "web_surface_id", "date", "resource_id");
CREATE INDEX IF NOT EXISTS "idx_ga4_daily_metric_brand_date" ON "ga4_daily_metrics"("tenant_id", "brand_id", "date");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ga4_daily_metrics_tenant_id_fkey'
    ) THEN
        ALTER TABLE "ga4_daily_metrics" ADD CONSTRAINT "ga4_daily_metrics_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ga4_daily_metrics_tenant_id_brand_id_fkey'
    ) THEN
        ALTER TABLE "ga4_daily_metrics" ADD CONSTRAINT "ga4_daily_metrics_tenant_id_brand_id_fkey" FOREIGN KEY ("tenant_id", "brand_id") REFERENCES "brands"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ga4_daily_metrics_tenant_id_web_surface_id_fkey'
    ) THEN
        ALTER TABLE "ga4_daily_metrics" ADD CONSTRAINT "ga4_daily_metrics_tenant_id_web_surface_id_fkey" FOREIGN KEY ("tenant_id", "web_surface_id") REFERENCES "web_surfaces"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Enable and Force RLS on ga4_daily_metrics
ALTER TABLE "ga4_daily_metrics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ga4_daily_metrics" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ga4_daily_metrics_tenant_isolation" ON "ga4_daily_metrics";
CREATE POLICY "ga4_daily_metrics_tenant_isolation" ON "ga4_daily_metrics"
    FOR ALL
    TO localbi_app
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

-- Grant table and sequence permissions to localbi_app
GRANT SELECT, INSERT, UPDATE, DELETE ON "ga4_daily_metrics" TO localbi_app;
GRANT USAGE, SELECT ON SEQUENCE "ga4_daily_metrics_id_seq" TO localbi_app;
