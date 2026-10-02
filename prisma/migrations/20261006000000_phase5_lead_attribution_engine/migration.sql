-- CreateEnum AttributionEventType
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AttributionEventType') THEN
        CREATE TYPE "AttributionEventType" AS ENUM (
            'PAGE_VIEW',
            'CALL_CLICK',
            'WHATSAPP_CLICK',
            'DIRECTIONS_CLICK',
            'FORM_START',
            'FORM_SUBMIT',
            'BOOKING_START',
            'BOOKING_COMPLETE',
            'CTA_CLICK'
        );
    END IF;
END $$;

-- CreateEnum LeadType
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LeadType') THEN
        CREATE TYPE "LeadType" AS ENUM ('FORM', 'CALL', 'WHATSAPP', 'BOOKING');
    END IF;
END $$;

-- CreateEnum LeadStatus
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LeadStatus') THEN
        CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'CLOSED', 'SPAM');
    END IF;
END $$;

-- CreateTable attribution_events
CREATE TABLE IF NOT EXISTS "attribution_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "web_surface_id" TEXT NOT NULL,
    "page_id" TEXT,
    "page_type" TEXT,
    "store_id" TEXT,
    "product_id" TEXT,
    "category_id" TEXT,
    "visitor_id" TEXT,
    "session_id" TEXT,
    "event_type" "AttributionEventType" NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'direct',
    "medium" TEXT NOT NULL DEFAULT 'none',
    "campaign" TEXT,
    "landing_path" TEXT,
    "current_path" TEXT,
    "referrer" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "utm_content" TEXT,
    "utm_term" TEXT,
    "gclid" TEXT,
    "metadata" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attribution_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable leads
CREATE TABLE IF NOT EXISTS "leads" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "web_surface_id" TEXT NOT NULL,
    "page_id" TEXT,
    "store_id" TEXT,
    "product_id" TEXT,
    "visitor_id" TEXT,
    "session_id" TEXT,
    "type" "LeadType" NOT NULL DEFAULT 'FORM',
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "message" TEXT,
    "source_event_id" TEXT,
    "idempotency_key" TEXT,
    "first_touch_source" TEXT,
    "first_touch_medium" TEXT,
    "first_touch_campaign" TEXT,
    "first_touch_landing_page" TEXT,
    "last_touch_source" TEXT,
    "last_touch_medium" TEXT,
    "last_touch_campaign" TEXT,
    "last_touch_page" TEXT,
    "provider" TEXT,
    "provider_interaction_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable visitor_sessions
CREATE TABLE IF NOT EXISTS "visitor_sessions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "visitor_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "brand_id" TEXT,
    "web_surface_id" TEXT,
    "first_touch_source" TEXT,
    "first_touch_medium" TEXT,
    "first_touch_campaign" TEXT,
    "first_touch_landing_page" TEXT,
    "last_touch_source" TEXT,
    "last_touch_medium" TEXT,
    "last_touch_campaign" TEXT,
    "last_touch_page" TEXT,
    "device_platform" TEXT,
    "browser" TEXT,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitor_sessions_pkey" PRIMARY KEY ("id")
);

-- Indexes for attribution_events
CREATE INDEX IF NOT EXISTS "idx_attr_event_tenant_occurred" ON "attribution_events"("tenant_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "idx_attr_event_tenant_brand_occurred" ON "attribution_events"("tenant_id", "brand_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "idx_attr_event_tenant_surface_occurred" ON "attribution_events"("tenant_id", "web_surface_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "idx_attr_event_tenant_store_occurred" ON "attribution_events"("tenant_id", "store_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "idx_attr_event_tenant_product_occurred" ON "attribution_events"("tenant_id", "product_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "idx_attr_event_tenant_type_occurred" ON "attribution_events"("tenant_id", "event_type", "occurred_at");
CREATE INDEX IF NOT EXISTS "idx_attr_event_tenant_session" ON "attribution_events"("tenant_id", "session_id");

-- Indexes for leads
CREATE UNIQUE INDEX IF NOT EXISTS "uq_lead_tenant_idempotency" ON "leads"("tenant_id", "idempotency_key");
CREATE INDEX IF NOT EXISTS "idx_leads_tenant_created" ON "leads"("tenant_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_leads_tenant_status_created" ON "leads"("tenant_id", "status", "created_at");
CREATE INDEX IF NOT EXISTS "idx_leads_tenant_store_created" ON "leads"("tenant_id", "store_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_leads_tenant_brand_created" ON "leads"("tenant_id", "brand_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_leads_tenant_surface_created" ON "leads"("tenant_id", "web_surface_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_leads_tenant_type_created" ON "leads"("tenant_id", "type", "created_at");

-- Indexes for visitor_sessions
CREATE UNIQUE INDEX IF NOT EXISTS "uq_visitor_session_tenant_session" ON "visitor_sessions"("tenant_id", "session_id");
CREATE INDEX IF NOT EXISTS "idx_visitor_session_visitor" ON "visitor_sessions"("tenant_id", "visitor_id");

-- Foreign Keys for attribution_events
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attribution_events_tenant_id_fkey') THEN
        ALTER TABLE "attribution_events" ADD CONSTRAINT "attribution_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attribution_events_brand_id_fkey') THEN
        ALTER TABLE "attribution_events" ADD CONSTRAINT "attribution_events_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attribution_events_web_surface_id_fkey') THEN
        ALTER TABLE "attribution_events" ADD CONSTRAINT "attribution_events_web_surface_id_fkey" FOREIGN KEY ("web_surface_id") REFERENCES "web_surfaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attribution_events_store_id_fkey') THEN
        ALTER TABLE "attribution_events" ADD CONSTRAINT "attribution_events_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attribution_events_product_id_fkey') THEN
        ALTER TABLE "attribution_events" ADD CONSTRAINT "attribution_events_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attribution_events_category_id_fkey') THEN
        ALTER TABLE "attribution_events" ADD CONSTRAINT "attribution_events_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Foreign Keys for leads
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_tenant_id_fkey') THEN
        ALTER TABLE "leads" ADD CONSTRAINT "leads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_brand_id_fkey') THEN
        ALTER TABLE "leads" ADD CONSTRAINT "leads_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_web_surface_id_fkey') THEN
        ALTER TABLE "leads" ADD CONSTRAINT "leads_web_surface_id_fkey" FOREIGN KEY ("web_surface_id") REFERENCES "web_surfaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_store_id_fkey') THEN
        ALTER TABLE "leads" ADD CONSTRAINT "leads_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_product_id_fkey') THEN
        ALTER TABLE "leads" ADD CONSTRAINT "leads_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Foreign Keys for visitor_sessions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'visitor_sessions_tenant_id_fkey') THEN
        ALTER TABLE "visitor_sessions" ADD CONSTRAINT "visitor_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'visitor_sessions_brand_id_fkey') THEN
        ALTER TABLE "visitor_sessions" ADD CONSTRAINT "visitor_sessions_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'visitor_sessions_web_surface_id_fkey') THEN
        ALTER TABLE "visitor_sessions" ADD CONSTRAINT "visitor_sessions_web_surface_id_fkey" FOREIGN KEY ("web_surface_id") REFERENCES "web_surfaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Enable and Force RLS on all 3 new tables
ALTER TABLE "attribution_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attribution_events" FORCE ROW LEVEL SECURITY;

ALTER TABLE "leads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "leads" FORCE ROW LEVEL SECURITY;

ALTER TABLE "visitor_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "visitor_sessions" FORCE ROW LEVEL SECURITY;

-- Tenant Isolation Policies for localbi_app
DROP POLICY IF EXISTS "attribution_events_tenant_isolation" ON "attribution_events";
CREATE POLICY "attribution_events_tenant_isolation" ON "attribution_events"
    FOR ALL
    TO localbi_app
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS "leads_tenant_isolation" ON "leads";
CREATE POLICY "leads_tenant_isolation" ON "leads"
    FOR ALL
    TO localbi_app
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

DROP POLICY IF EXISTS "visitor_sessions_tenant_isolation" ON "visitor_sessions";
CREATE POLICY "visitor_sessions_tenant_isolation" ON "visitor_sessions"
    FOR ALL
    TO localbi_app
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

-- Grant table permissions to localbi_app
GRANT SELECT, INSERT, UPDATE, DELETE ON "attribution_events" TO localbi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "leads" TO localbi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "visitor_sessions" TO localbi_app;
