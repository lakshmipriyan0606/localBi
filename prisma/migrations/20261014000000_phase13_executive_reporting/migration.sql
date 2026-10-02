-- CreateTable
CREATE TABLE "report_snapshots" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "report_type" TEXT NOT NULL DEFAULT 'EXECUTIVE',
    "report_version" TEXT NOT NULL DEFAULT '1.0.0',
    "date_range" JSONB NOT NULL,
    "comparison_range" JSONB,
    "filter_config" JSONB NOT NULL,
    "payload" JSONB NOT NULL,
    "partial" BOOLEAN NOT NULL DEFAULT false,
    "unavailable_modules" JSONB NOT NULL DEFAULT '[]',
    "data_freshness" JSONB NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_schedules" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'WEEKLY',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "day_of_week" INTEGER,
    "day_of_month" INTEGER,
    "hour_of_day" INTEGER NOT NULL DEFAULT 9,
    "recipients" JSONB NOT NULL DEFAULT '[]',
    "format" TEXT NOT NULL DEFAULT 'PDF',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "filter_config" JSONB NOT NULL DEFAULT '{}',
    "next_run_at" TIMESTAMP(3),
    "last_run_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_deliveries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "snapshot_id" TEXT,
    "period_key" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'PDF',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sent_at" TIMESTAMP(3),
    "error_code" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_presets" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'BRAND',
    "filter_config" JSONB NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_presets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_report_snapshot_brand_gen" ON "report_snapshots"("tenant_id", "brand_id", "generated_at" DESC);
CREATE INDEX "idx_report_snapshot_type_gen" ON "report_snapshots"("tenant_id", "report_type", "generated_at" DESC);
CREATE UNIQUE INDEX "report_snapshots_tenant_id_id_key" ON "report_snapshots"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "idx_report_schedule_status_next_run" ON "report_schedules"("tenant_id", "status", "next_run_at");
CREATE INDEX "idx_report_schedule_brand" ON "report_schedules"("tenant_id", "brand_id");
CREATE UNIQUE INDEX "report_schedules_tenant_id_id_key" ON "report_schedules"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "idx_report_delivery_schedule_created" ON "report_deliveries"("tenant_id", "schedule_id", "created_at" DESC);
CREATE INDEX "idx_report_delivery_status" ON "report_deliveries"("tenant_id", "status");
CREATE UNIQUE INDEX "report_deliveries_tenant_id_schedule_id_period_key_recipient_key" ON "report_deliveries"("tenant_id", "schedule_id", "period_key", "recipient");

-- CreateIndex
CREATE INDEX "idx_report_preset_brand_default" ON "report_presets"("tenant_id", "brand_id", "is_default");
CREATE UNIQUE INDEX "report_presets_tenant_id_id_key" ON "report_presets"("tenant_id", "id");

-- AddForeignKey
ALTER TABLE "report_snapshots" ADD CONSTRAINT "report_snapshots_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "report_snapshots" ADD CONSTRAINT "report_snapshots_tenant_id_brand_id_fkey" FOREIGN KEY ("tenant_id", "brand_id") REFERENCES "brands"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "report_schedules" ADD CONSTRAINT "report_schedules_tenant_id_brand_id_fkey" FOREIGN KEY ("tenant_id", "brand_id") REFERENCES "brands"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_deliveries" ADD CONSTRAINT "report_deliveries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "report_deliveries" ADD CONSTRAINT "report_deliveries_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "report_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "report_deliveries" ADD CONSTRAINT "report_deliveries_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "report_snapshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_presets" ADD CONSTRAINT "report_presets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "report_presets" ADD CONSTRAINT "report_presets_tenant_id_brand_id_fkey" FOREIGN KEY ("tenant_id", "brand_id") REFERENCES "brands"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row Level Security (RLS) for Phase 13 tables
ALTER TABLE "report_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "report_snapshots" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "report_snapshots";
CREATE POLICY tenant_isolation_policy ON "report_snapshots"
  FOR ALL
  TO localbi_app
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text);

ALTER TABLE "report_schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "report_schedules" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "report_schedules";
CREATE POLICY tenant_isolation_policy ON "report_schedules"
  FOR ALL
  TO localbi_app
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text);

ALTER TABLE "report_deliveries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "report_deliveries" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "report_deliveries";
CREATE POLICY tenant_isolation_policy ON "report_deliveries"
  FOR ALL
  TO localbi_app
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text);

ALTER TABLE "report_presets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "report_presets" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "report_presets";
CREATE POLICY tenant_isolation_policy ON "report_presets"
  FOR ALL
  TO localbi_app
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text);

-- Grant DML permissions to localbi_app
GRANT SELECT, INSERT, UPDATE, DELETE ON "report_snapshots" TO localbi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "report_schedules" TO localbi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "report_deliveries" TO localbi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON "report_presets" TO localbi_app;
