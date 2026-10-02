-- DropForeignKey
ALTER TABLE "call_events" DROP CONSTRAINT "fk_call_events_call";

-- DropForeignKey
ALTER TABLE "call_events" DROP CONSTRAINT "fk_call_events_tenant";

-- DropForeignKey
ALTER TABLE "calls" DROP CONSTRAINT "fk_calls_brand";

-- DropForeignKey
ALTER TABLE "calls" DROP CONSTRAINT "fk_calls_lead";

-- DropForeignKey
ALTER TABLE "calls" DROP CONSTRAINT "fk_calls_store";

-- DropForeignKey
ALTER TABLE "calls" DROP CONSTRAINT "fk_calls_surface";

-- DropForeignKey
ALTER TABLE "calls" DROP CONSTRAINT "fk_calls_tenant";

-- DropForeignKey
ALTER TABLE "calls" DROP CONSTRAINT "fk_calls_vnumber";

-- DropForeignKey
ALTER TABLE "competitors" DROP CONSTRAINT "fk_competitors_tenant";

-- DropForeignKey
ALTER TABLE "content_authors" DROP CONSTRAINT "fk_content_author_brand";

-- DropForeignKey
ALTER TABLE "content_authors" DROP CONSTRAINT "fk_content_author_tenant";

-- DropForeignKey
ALTER TABLE "content_briefs" DROP CONSTRAINT "fk_content_brief_brand";

-- DropForeignKey
ALTER TABLE "content_briefs" DROP CONSTRAINT "fk_content_brief_kw";

-- DropForeignKey
ALTER TABLE "content_briefs" DROP CONSTRAINT "fk_content_brief_opp";

-- DropForeignKey
ALTER TABLE "content_briefs" DROP CONSTRAINT "fk_content_brief_tenant";

-- DropForeignKey
ALTER TABLE "content_categories" DROP CONSTRAINT "fk_content_category_brand";

-- DropForeignKey
ALTER TABLE "content_categories" DROP CONSTRAINT "fk_content_category_tenant";

-- DropForeignKey
ALTER TABLE "content_items" DROP CONSTRAINT "fk_content_item_author";

-- DropForeignKey
ALTER TABLE "content_items" DROP CONSTRAINT "fk_content_item_brand";

-- DropForeignKey
ALTER TABLE "content_items" DROP CONSTRAINT "fk_content_item_brief";

-- DropForeignKey
ALTER TABLE "content_items" DROP CONSTRAINT "fk_content_item_cat";

-- DropForeignKey
ALTER TABLE "content_items" DROP CONSTRAINT "fk_content_item_surface";

-- DropForeignKey
ALTER TABLE "content_items" DROP CONSTRAINT "fk_content_item_tenant";

-- DropForeignKey
ALTER TABLE "content_relations" DROP CONSTRAINT "fk_content_relation_item";

-- DropForeignKey
ALTER TABLE "content_relations" DROP CONSTRAINT "fk_content_relation_tenant";

-- DropForeignKey
ALTER TABLE "content_versions" DROP CONSTRAINT "fk_content_version_item";

-- DropForeignKey
ALTER TABLE "content_versions" DROP CONSTRAINT "fk_content_version_tenant";

-- DropForeignKey
ALTER TABLE "gbp_search_terms" DROP CONSTRAINT "fk_gbp_search_term_location";

-- DropForeignKey
ALTER TABLE "gbp_search_terms" DROP CONSTRAINT "fk_gbp_search_term_tenant";

-- DropForeignKey
ALTER TABLE "keywords" DROP CONSTRAINT "fk_keywords_brand";

-- DropForeignKey
ALTER TABLE "keywords" DROP CONSTRAINT "fk_keywords_tenant";

-- DropForeignKey
ALTER TABLE "merchant_brand_configs" DROP CONSTRAINT "fk_merchant_brand_configs_brand";

-- DropForeignKey
ALTER TABLE "merchant_brand_configs" DROP CONSTRAINT "fk_merchant_brand_configs_tenant";

-- DropForeignKey
ALTER TABLE "merchant_local_inventory_states" DROP CONSTRAINT "fk_merchant_local_inv_brand";

-- DropForeignKey
ALTER TABLE "merchant_local_inventory_states" DROP CONSTRAINT "fk_merchant_local_inv_mapping";

-- DropForeignKey
ALTER TABLE "merchant_local_inventory_states" DROP CONSTRAINT "fk_merchant_local_inv_prod";

-- DropForeignKey
ALTER TABLE "merchant_local_inventory_states" DROP CONSTRAINT "fk_merchant_local_inv_store";

-- DropForeignKey
ALTER TABLE "merchant_local_inventory_states" DROP CONSTRAINT "fk_merchant_local_inv_tenant";

-- DropForeignKey
ALTER TABLE "merchant_product_issues" DROP CONSTRAINT "fk_merchant_issue_brand";

-- DropForeignKey
ALTER TABLE "merchant_product_issues" DROP CONSTRAINT "fk_merchant_issue_mapping";

-- DropForeignKey
ALTER TABLE "merchant_product_issues" DROP CONSTRAINT "fk_merchant_issue_prod";

-- DropForeignKey
ALTER TABLE "merchant_product_issues" DROP CONSTRAINT "fk_merchant_issue_store";

-- DropForeignKey
ALTER TABLE "merchant_product_issues" DROP CONSTRAINT "fk_merchant_issue_tenant";

-- DropForeignKey
ALTER TABLE "merchant_product_mappings" DROP CONSTRAINT "fk_merchant_prod_mapping_brand";

-- DropForeignKey
ALTER TABLE "merchant_product_mappings" DROP CONSTRAINT "fk_merchant_prod_mapping_prod";

-- DropForeignKey
ALTER TABLE "merchant_product_mappings" DROP CONSTRAINT "fk_merchant_prod_mapping_tenant";

-- DropForeignKey
ALTER TABLE "opportunities" DROP CONSTRAINT "fk_opportunities_brand";

-- DropForeignKey
ALTER TABLE "opportunities" DROP CONSTRAINT "fk_opportunities_category";

-- DropForeignKey
ALTER TABLE "opportunities" DROP CONSTRAINT "fk_opportunities_keyword";

-- DropForeignKey
ALTER TABLE "opportunities" DROP CONSTRAINT "fk_opportunities_page";

-- DropForeignKey
ALTER TABLE "opportunities" DROP CONSTRAINT "fk_opportunities_product";

-- DropForeignKey
ALTER TABLE "opportunities" DROP CONSTRAINT "fk_opportunities_store";

-- DropForeignKey
ALTER TABLE "opportunities" DROP CONSTRAINT "fk_opportunities_surface";

-- DropForeignKey
ALTER TABLE "opportunities" DROP CONSTRAINT "fk_opportunities_tenant";

-- DropForeignKey
ALTER TABLE "opportunity_evidence" DROP CONSTRAINT "fk_opp_evidence_opp";

-- DropForeignKey
ALTER TABLE "opportunity_evidence" DROP CONSTRAINT "fk_opp_evidence_tenant";

-- DropForeignKey
ALTER TABLE "product_merchant_configs" DROP CONSTRAINT "fk_prod_merchant_cfg_brand";

-- DropForeignKey
ALTER TABLE "product_merchant_configs" DROP CONSTRAINT "fk_prod_merchant_cfg_prod";

-- DropForeignKey
ALTER TABLE "product_merchant_configs" DROP CONSTRAINT "fk_prod_merchant_cfg_tenant";

-- DropForeignKey
ALTER TABLE "rank_grid_configs" DROP CONSTRAINT "fk_rank_grid_configs_store";

-- DropForeignKey
ALTER TABLE "rank_grid_configs" DROP CONSTRAINT "fk_rank_grid_configs_tenant";

-- DropForeignKey
ALTER TABLE "rank_observations" DROP CONSTRAINT "fk_rank_observations_rank_run";

-- DropForeignKey
ALTER TABLE "rank_observations" DROP CONSTRAINT "fk_rank_observations_tenant";

-- DropForeignKey
ALTER TABLE "rank_run_summaries" DROP CONSTRAINT "fk_rank_run_summaries_rank_run";

-- DropForeignKey
ALTER TABLE "rank_run_summaries" DROP CONSTRAINT "fk_rank_run_summaries_tenant";

-- DropForeignKey
ALTER TABLE "rank_runs" DROP CONSTRAINT "fk_rank_runs_brand";

-- DropForeignKey
ALTER TABLE "rank_runs" DROP CONSTRAINT "fk_rank_runs_grid_config";

-- DropForeignKey
ALTER TABLE "rank_runs" DROP CONSTRAINT "fk_rank_runs_keyword";

-- DropForeignKey
ALTER TABLE "rank_runs" DROP CONSTRAINT "fk_rank_runs_store";

-- DropForeignKey
ALTER TABLE "rank_runs" DROP CONSTRAINT "fk_rank_runs_tenant";

-- DropForeignKey
ALTER TABLE "redirects" DROP CONSTRAINT "fk_redirect_surface";

-- DropForeignKey
ALTER TABLE "redirects" DROP CONSTRAINT "fk_redirect_tenant";

-- DropForeignKey
ALTER TABLE "store_competitors" DROP CONSTRAINT "fk_store_competitors_competitor";

-- DropForeignKey
ALTER TABLE "store_competitors" DROP CONSTRAINT "fk_store_competitors_store";

-- DropForeignKey
ALTER TABLE "store_competitors" DROP CONSTRAINT "fk_store_competitors_tenant";

-- DropForeignKey
ALTER TABLE "store_keywords" DROP CONSTRAINT "fk_store_keywords_keyword";

-- DropForeignKey
ALTER TABLE "store_keywords" DROP CONSTRAINT "fk_store_keywords_store";

-- DropForeignKey
ALTER TABLE "store_keywords" DROP CONSTRAINT "fk_store_keywords_tenant";

-- DropForeignKey
ALTER TABLE "virtual_numbers" DROP CONSTRAINT "fk_virtual_numbers_brand";

-- DropForeignKey
ALTER TABLE "virtual_numbers" DROP CONSTRAINT "fk_virtual_numbers_store";

-- DropForeignKey
ALTER TABLE "virtual_numbers" DROP CONSTRAINT "fk_virtual_numbers_surface";

-- DropForeignKey
ALTER TABLE "virtual_numbers" DROP CONSTRAINT "fk_virtual_numbers_tenant";

-- DropIndex
DROP INDEX "idx_gbp_daily_metrics_location_metric_date";

-- AlterTable
ALTER TABLE "brand_themes" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "call_events" RENAME CONSTRAINT "pk_call_events" TO "call_events_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "occurred_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "calls" RENAME CONSTRAINT "pk_calls" TO "calls_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "started_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "answered_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "ended_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "categories" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "competitors" RENAME CONSTRAINT "pk_competitors" TO "competitors_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "content_authors" RENAME CONSTRAINT "pk_content_authors" TO "content_authors_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "content_briefs" RENAME CONSTRAINT "pk_content_briefs" TO "content_briefs_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "content_categories" RENAME CONSTRAINT "pk_content_categories" TO "content_categories_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "content_items" RENAME CONSTRAINT "pk_content_items" TO "content_items_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "published_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "scheduled_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "content_relations" RENAME CONSTRAINT "pk_content_relations" TO "content_relations_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "content_versions" RENAME CONSTRAINT "pk_content_versions" TO "content_versions_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "content" DROP DEFAULT,
ALTER COLUMN "published_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "domains" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ga4_daily_metrics" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "gbp_search_terms" RENAME CONSTRAINT "pk_gbp_search_terms" TO "gbp_search_terms_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "synced_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "keywords" RENAME CONSTRAINT "pk_keywords" TO "keywords_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "leads" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "locations" ALTER COLUMN "gbp_sync_status" SET DATA TYPE TEXT,
ALTER COLUMN "gbp_synced_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "merchant_brand_configs" RENAME CONSTRAINT "pk_merchant_brand_configs" TO "merchant_brand_configs_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "last_reconciled_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "merchant_local_inventory_states" RENAME CONSTRAINT "pk_merchant_local_inventory_states" TO "merchant_local_inventory_states_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "last_submitted_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "last_checked_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "merchant_product_issues" RENAME CONSTRAINT "pk_merchant_product_issues" TO "merchant_product_issues_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "first_seen_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "last_seen_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "resolved_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "merchant_product_mappings" RENAME CONSTRAINT "pk_merchant_product_mappings" TO "merchant_product_mappings_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "last_submitted_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "last_successful_sync_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "last_checked_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "opportunities" RENAME CONSTRAINT "pk_opportunities" TO "opportunities_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "detected_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "last_evaluated_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "resolved_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "dismissed_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "accepted_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "opportunity_evidence" RENAME CONSTRAINT "pk_opportunity_evidence" TO "opportunity_evidence_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "captured_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "page_templates" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "pages" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "product_merchant_configs" RENAME CONSTRAINT "pk_product_merchant_configs" TO "product_merchant_configs_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "rank_grid_configs" RENAME CONSTRAINT "pk_rank_grid_configs" TO "rank_grid_configs_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "rank_observations" RENAME CONSTRAINT "pk_rank_observations" TO "rank_observations_pkey",
ALTER COLUMN "observed_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "rank_run_summaries" RENAME CONSTRAINT "pk_rank_run_summaries" TO "rank_run_summaries_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "rank_runs" RENAME CONSTRAINT "pk_rank_runs" TO "rank_runs_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "started_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "completed_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "redirects" RENAME CONSTRAINT "pk_redirects" TO "redirects_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "seo_configs" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "store_competitors" RENAME CONSTRAINT "pk_store_competitors" TO "store_competitors_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "last_observed_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "store_keywords" RENAME CONSTRAINT "pk_store_keywords" TO "store_keywords_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "store_products" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "virtual_numbers" RENAME CONSTRAINT "pk_virtual_numbers" TO "virtual_numbers_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "activated_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "released_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "web_surfaces" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "listing_store_hours" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "open_time" TEXT,
    "close_time" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listing_store_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "directory_listings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "external_listing_id" TEXT,
    "provider_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_CHECKED',
    "match_status" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "match_confidence" TEXT,
    "match_evidence_summary" TEXT,
    "snapshot_name" TEXT,
    "snapshot_phone" TEXT,
    "snapshot_address" TEXT,
    "snapshot_website" TEXT,
    "snapshot_hours" JSONB,
    "snapshot_categories" TEXT[],
    "snapshot_extra" JSONB,
    "nap_name_status" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "nap_phone_status" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "nap_address_status" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "nap_website_status" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "nap_hours_status" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "nap_overall_status" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "last_discovered_at" TIMESTAMP(3),
    "last_synced_at" TIMESTAMP(3),
    "last_verified_at" TIMESTAMP(3),
    "sync_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "directory_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "duplicate_listing_candidates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "listing_a_id" TEXT NOT NULL,
    "listing_b_id" TEXT NOT NULL,
    "confidence" TEXT NOT NULL DEFAULT 'MEDIUM',
    "evidence_summary" TEXT NOT NULL,
    "shared_phone" BOOLEAN NOT NULL DEFAULT false,
    "shared_address" BOOLEAN NOT NULL DEFAULT false,
    "shared_place_id" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "resolution_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "duplicate_listing_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_change_sets" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "proposed_changes" JSONB NOT NULL,
    "canonical_version_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "requested_by" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_note" TEXT,
    "executed_at" TIMESTAMP(3),
    "provider_result" TEXT,
    "provider_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listing_change_sets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_listing_hours_store" ON "listing_store_hours"("tenant_id", "store_id");

-- CreateIndex
CREATE UNIQUE INDEX "listing_store_hours_tenant_id_store_id_day_of_week_key" ON "listing_store_hours"("tenant_id", "store_id", "day_of_week");

-- CreateIndex
CREATE INDEX "idx_directory_listing_brand_status" ON "directory_listings"("tenant_id", "brand_id", "status");

-- CreateIndex
CREATE INDEX "idx_directory_listing_store_status" ON "directory_listings"("tenant_id", "store_id", "status");

-- CreateIndex
CREATE INDEX "idx_directory_listing_nap_status" ON "directory_listings"("tenant_id", "provider", "nap_overall_status");

-- CreateIndex
CREATE UNIQUE INDEX "directory_listings_tenant_id_store_id_provider_key" ON "directory_listings"("tenant_id", "store_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "directory_listings_tenant_id_provider_external_listing_id_key" ON "directory_listings"("tenant_id", "provider", "external_listing_id");

-- CreateIndex
CREATE INDEX "idx_duplicate_store_status" ON "duplicate_listing_candidates"("tenant_id", "store_id", "status");

-- CreateIndex
CREATE INDEX "idx_duplicate_provider_status" ON "duplicate_listing_candidates"("tenant_id", "provider", "status");

-- CreateIndex
CREATE UNIQUE INDEX "duplicate_listing_candidates_tenant_id_listing_a_id_listing_key" ON "duplicate_listing_candidates"("tenant_id", "listing_a_id", "listing_b_id");

-- CreateIndex
CREATE INDEX "idx_change_set_listing_status" ON "listing_change_sets"("tenant_id", "listing_id", "status");

-- CreateIndex
CREATE INDEX "idx_change_set_status_priority" ON "listing_change_sets"("tenant_id", "status", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "listing_change_sets_tenant_id_id_key" ON "listing_change_sets"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "leads_tenant_id_id_key" ON "leads"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_product_issues_tenant_id_mapping_id_code_store_id_key" ON "merchant_product_issues"("tenant_id", "mapping_id", "code", "store_id");

-- RenameForeignKey
ALTER TABLE "gbp_location_aggregates" RENAME CONSTRAINT "gbp_location_aggregates_location_fkey" TO "gbp_location_aggregates_tenant_id_location_id_fkey";

-- RenameForeignKey
ALTER TABLE "gbp_media" RENAME CONSTRAINT "gbp_media_location_fkey" TO "gbp_media_tenant_id_location_id_fkey";

-- RenameForeignKey
ALTER TABLE "gbp_posts" RENAME CONSTRAINT "gbp_posts_location_fkey" TO "gbp_posts_tenant_id_location_id_fkey";

-- RenameForeignKey
ALTER TABLE "gbp_reviews" RENAME CONSTRAINT "gbp_reviews_location_fkey" TO "gbp_reviews_tenant_id_location_id_fkey";

-- RenameForeignKey
ALTER TABLE "internal_resource_mappings" RENAME CONSTRAINT "internal_resource_mappings_brand_id_fkey" TO "internal_resource_mappings_tenant_id_brand_id_fkey";

-- RenameForeignKey
ALTER TABLE "internal_resource_mappings" RENAME CONSTRAINT "internal_resource_mappings_web_surface_id_fkey" TO "internal_resource_mappings_tenant_id_web_surface_id_fkey";

-- RenameForeignKey
ALTER TABLE "store_products" RENAME CONSTRAINT "store_products_product_fkey" TO "store_products_tenant_id_brand_id_product_id_fkey";

-- RenameForeignKey
ALTER TABLE "store_products" RENAME CONSTRAINT "store_products_store_fkey" TO "store_products_tenant_id_brand_id_store_id_fkey";

-- AddForeignKey
ALTER TABLE "gbp_search_terms" ADD CONSTRAINT "gbp_search_terms_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gbp_search_terms" ADD CONSTRAINT "gbp_search_terms_tenant_id_location_id_fkey" FOREIGN KEY ("tenant_id", "location_id") REFERENCES "locations"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keywords" ADD CONSTRAINT "keywords_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keywords" ADD CONSTRAINT "keywords_tenant_id_brand_id_fkey" FOREIGN KEY ("tenant_id", "brand_id") REFERENCES "brands"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_keywords" ADD CONSTRAINT "store_keywords_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_keywords" ADD CONSTRAINT "store_keywords_tenant_id_store_id_fkey" FOREIGN KEY ("tenant_id", "store_id") REFERENCES "locations"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_keywords" ADD CONSTRAINT "store_keywords_keyword_id_fkey" FOREIGN KEY ("keyword_id") REFERENCES "keywords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rank_grid_configs" ADD CONSTRAINT "rank_grid_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rank_grid_configs" ADD CONSTRAINT "rank_grid_configs_tenant_id_store_id_fkey" FOREIGN KEY ("tenant_id", "store_id") REFERENCES "locations"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rank_runs" ADD CONSTRAINT "rank_runs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rank_runs" ADD CONSTRAINT "rank_runs_tenant_id_brand_id_fkey" FOREIGN KEY ("tenant_id", "brand_id") REFERENCES "brands"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rank_runs" ADD CONSTRAINT "rank_runs_tenant_id_store_id_fkey" FOREIGN KEY ("tenant_id", "store_id") REFERENCES "locations"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rank_runs" ADD CONSTRAINT "rank_runs_keyword_id_fkey" FOREIGN KEY ("keyword_id") REFERENCES "keywords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rank_runs" ADD CONSTRAINT "rank_runs_grid_config_id_fkey" FOREIGN KEY ("grid_config_id") REFERENCES "rank_grid_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rank_observations" ADD CONSTRAINT "rank_observations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rank_observations" ADD CONSTRAINT "rank_observations_rank_run_id_fkey" FOREIGN KEY ("rank_run_id") REFERENCES "rank_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rank_run_summaries" ADD CONSTRAINT "rank_run_summaries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rank_run_summaries" ADD CONSTRAINT "rank_run_summaries_rank_run_id_fkey" FOREIGN KEY ("rank_run_id") REFERENCES "rank_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_competitors" ADD CONSTRAINT "store_competitors_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_competitors" ADD CONSTRAINT "store_competitors_tenant_id_store_id_fkey" FOREIGN KEY ("tenant_id", "store_id") REFERENCES "locations"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_competitors" ADD CONSTRAINT "store_competitors_competitor_id_fkey" FOREIGN KEY ("competitor_id") REFERENCES "competitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_brand_configs" ADD CONSTRAINT "merchant_brand_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_brand_configs" ADD CONSTRAINT "merchant_brand_configs_tenant_id_brand_id_fkey" FOREIGN KEY ("tenant_id", "brand_id") REFERENCES "brands"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_merchant_configs" ADD CONSTRAINT "product_merchant_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_merchant_configs" ADD CONSTRAINT "product_merchant_configs_tenant_id_brand_id_fkey" FOREIGN KEY ("tenant_id", "brand_id") REFERENCES "brands"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_merchant_configs" ADD CONSTRAINT "product_merchant_configs_tenant_id_brand_id_product_id_fkey" FOREIGN KEY ("tenant_id", "brand_id", "product_id") REFERENCES "products"("tenant_id", "brand_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_product_mappings" ADD CONSTRAINT "merchant_product_mappings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_product_mappings" ADD CONSTRAINT "merchant_product_mappings_tenant_id_brand_id_fkey" FOREIGN KEY ("tenant_id", "brand_id") REFERENCES "brands"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_product_mappings" ADD CONSTRAINT "merchant_product_mappings_tenant_id_brand_id_product_id_fkey" FOREIGN KEY ("tenant_id", "brand_id", "product_id") REFERENCES "products"("tenant_id", "brand_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_local_inventory_states" ADD CONSTRAINT "merchant_local_inventory_states_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_local_inventory_states" ADD CONSTRAINT "merchant_local_inventory_states_tenant_id_brand_id_fkey" FOREIGN KEY ("tenant_id", "brand_id") REFERENCES "brands"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_local_inventory_states" ADD CONSTRAINT "merchant_local_inventory_states_tenant_id_brand_id_store_i_fkey" FOREIGN KEY ("tenant_id", "brand_id", "store_id") REFERENCES "locations"("tenant_id", "brand_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_local_inventory_states" ADD CONSTRAINT "merchant_local_inventory_states_tenant_id_brand_id_product_fkey" FOREIGN KEY ("tenant_id", "brand_id", "product_id") REFERENCES "products"("tenant_id", "brand_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_local_inventory_states" ADD CONSTRAINT "merchant_local_inventory_states_mapping_id_fkey" FOREIGN KEY ("mapping_id") REFERENCES "merchant_product_mappings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_product_issues" ADD CONSTRAINT "merchant_product_issues_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_product_issues" ADD CONSTRAINT "merchant_product_issues_tenant_id_brand_id_fkey" FOREIGN KEY ("tenant_id", "brand_id") REFERENCES "brands"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_product_issues" ADD CONSTRAINT "merchant_product_issues_mapping_id_fkey" FOREIGN KEY ("mapping_id") REFERENCES "merchant_product_mappings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_product_issues" ADD CONSTRAINT "merchant_product_issues_tenant_id_brand_id_product_id_fkey" FOREIGN KEY ("tenant_id", "brand_id", "product_id") REFERENCES "products"("tenant_id", "brand_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_product_issues" ADD CONSTRAINT "merchant_product_issues_tenant_id_brand_id_store_id_fkey" FOREIGN KEY ("tenant_id", "brand_id", "store_id") REFERENCES "locations"("tenant_id", "brand_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "virtual_numbers" ADD CONSTRAINT "virtual_numbers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "virtual_numbers" ADD CONSTRAINT "virtual_numbers_tenant_id_brand_id_fkey" FOREIGN KEY ("tenant_id", "brand_id") REFERENCES "brands"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "virtual_numbers" ADD CONSTRAINT "virtual_numbers_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "virtual_numbers" ADD CONSTRAINT "virtual_numbers_web_surface_id_fkey" FOREIGN KEY ("web_surface_id") REFERENCES "web_surfaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_tenant_id_brand_id_fkey" FOREIGN KEY ("tenant_id", "brand_id") REFERENCES "brands"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_web_surface_id_fkey" FOREIGN KEY ("web_surface_id") REFERENCES "web_surfaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_virtual_number_id_fkey" FOREIGN KEY ("virtual_number_id") REFERENCES "virtual_numbers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_events" ADD CONSTRAINT "call_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_events" ADD CONSTRAINT "call_events_tenant_id_call_id_fkey" FOREIGN KEY ("tenant_id", "call_id") REFERENCES "calls"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_tenant_id_brand_id_fkey" FOREIGN KEY ("tenant_id", "brand_id") REFERENCES "brands"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_web_surface_id_fkey" FOREIGN KEY ("web_surface_id") REFERENCES "web_surfaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_keyword_id_fkey" FOREIGN KEY ("keyword_id") REFERENCES "keywords"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_evidence" ADD CONSTRAINT "opportunity_evidence_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_evidence" ADD CONSTRAINT "opportunity_evidence_tenant_id_opportunity_id_fkey" FOREIGN KEY ("tenant_id", "opportunity_id") REFERENCES "opportunities"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_authors" ADD CONSTRAINT "content_authors_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_authors" ADD CONSTRAINT "content_authors_tenant_id_brand_id_fkey" FOREIGN KEY ("tenant_id", "brand_id") REFERENCES "brands"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_categories" ADD CONSTRAINT "content_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_categories" ADD CONSTRAINT "content_categories_tenant_id_brand_id_fkey" FOREIGN KEY ("tenant_id", "brand_id") REFERENCES "brands"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_briefs" ADD CONSTRAINT "content_briefs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_briefs" ADD CONSTRAINT "content_briefs_tenant_id_brand_id_fkey" FOREIGN KEY ("tenant_id", "brand_id") REFERENCES "brands"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_briefs" ADD CONSTRAINT "content_briefs_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_briefs" ADD CONSTRAINT "content_briefs_keyword_id_fkey" FOREIGN KEY ("keyword_id") REFERENCES "keywords"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_tenant_id_brand_id_fkey" FOREIGN KEY ("tenant_id", "brand_id") REFERENCES "brands"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_web_surface_id_fkey" FOREIGN KEY ("web_surface_id") REFERENCES "web_surfaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_brief_id_fkey" FOREIGN KEY ("brief_id") REFERENCES "content_briefs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "content_authors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "content_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_tenant_id_content_item_id_fkey" FOREIGN KEY ("tenant_id", "content_item_id") REFERENCES "content_items"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_relations" ADD CONSTRAINT "content_relations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_relations" ADD CONSTRAINT "content_relations_tenant_id_content_item_id_fkey" FOREIGN KEY ("tenant_id", "content_item_id") REFERENCES "content_items"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redirects" ADD CONSTRAINT "redirects_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redirects" ADD CONSTRAINT "redirects_tenant_id_web_surface_id_fkey" FOREIGN KEY ("tenant_id", "web_surface_id") REFERENCES "web_surfaces"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_store_hours" ADD CONSTRAINT "listing_store_hours_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_store_hours" ADD CONSTRAINT "listing_store_hours_tenant_id_store_id_fkey" FOREIGN KEY ("tenant_id", "store_id") REFERENCES "locations"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directory_listings" ADD CONSTRAINT "directory_listings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directory_listings" ADD CONSTRAINT "directory_listings_tenant_id_brand_id_fkey" FOREIGN KEY ("tenant_id", "brand_id") REFERENCES "brands"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "directory_listings" ADD CONSTRAINT "directory_listings_tenant_id_store_id_fkey" FOREIGN KEY ("tenant_id", "store_id") REFERENCES "locations"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duplicate_listing_candidates" ADD CONSTRAINT "duplicate_listing_candidates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duplicate_listing_candidates" ADD CONSTRAINT "duplicate_listing_candidates_tenant_id_store_id_fkey" FOREIGN KEY ("tenant_id", "store_id") REFERENCES "locations"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duplicate_listing_candidates" ADD CONSTRAINT "duplicate_listing_candidates_listing_a_id_fkey" FOREIGN KEY ("listing_a_id") REFERENCES "directory_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duplicate_listing_candidates" ADD CONSTRAINT "duplicate_listing_candidates_listing_b_id_fkey" FOREIGN KEY ("listing_b_id") REFERENCES "directory_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_change_sets" ADD CONSTRAINT "listing_change_sets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_change_sets" ADD CONSTRAINT "listing_change_sets_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "directory_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "uq_call_event_provider_event" RENAME TO "call_events_tenant_id_provider_provider_event_id_key";

-- RenameIndex
ALTER INDEX "uq_call_event_tenant_id" RENAME TO "call_events_tenant_id_id_key";

-- RenameIndex
ALTER INDEX "uq_call_provider_call_id" RENAME TO "calls_tenant_id_provider_provider_call_id_key";

-- RenameIndex
ALTER INDEX "uq_call_tenant_id" RENAME TO "calls_tenant_id_id_key";

-- RenameIndex
ALTER INDEX "uq_competitor_place_id" RENAME TO "competitors_tenant_id_external_place_id_key";

-- RenameIndex
ALTER INDEX "uq_content_author_brand_slug" RENAME TO "content_authors_tenant_id_brand_id_slug_key";

-- RenameIndex
ALTER INDEX "uq_content_author_tenant_id" RENAME TO "content_authors_tenant_id_id_key";

-- RenameIndex
ALTER INDEX "uq_content_brief_tenant_id" RENAME TO "content_briefs_tenant_id_id_key";

-- RenameIndex
ALTER INDEX "uq_content_category_brand_slug" RENAME TO "content_categories_tenant_id_brand_id_slug_key";

-- RenameIndex
ALTER INDEX "uq_content_category_tenant_id" RENAME TO "content_categories_tenant_id_id_key";

-- RenameIndex
ALTER INDEX "uq_content_item_brand_slug" RENAME TO "content_items_tenant_id_brand_id_slug_key";

-- RenameIndex
ALTER INDEX "uq_content_item_tenant_id" RENAME TO "content_items_tenant_id_id_key";

-- RenameIndex
ALTER INDEX "uq_content_relation_target" RENAME TO "content_relations_content_item_id_target_type_target_id_key";

-- RenameIndex
ALTER INDEX "uq_content_relation_tenant_id" RENAME TO "content_relations_tenant_id_id_key";

-- RenameIndex
ALTER INDEX "uq_content_version_number" RENAME TO "content_versions_content_item_id_version_key";

-- RenameIndex
ALTER INDEX "uq_content_version_tenant_id" RENAME TO "content_versions_tenant_id_id_key";

-- RenameIndex
ALTER INDEX "uq_ga4_daily_metric" RENAME TO "ga4_daily_metrics_tenant_id_web_surface_id_date_resource_id_key";

-- RenameIndex
ALTER INDEX "uq_gbp_search_term" RENAME TO "gbp_search_terms_tenant_id_location_id_term_period_start_key";

-- RenameIndex
ALTER INDEX "uq_keyword_tenant_brand_term" RENAME TO "keywords_tenant_id_brand_id_normalized_term_key";

-- RenameIndex
ALTER INDEX "uq_lead_tenant_idempotency" RENAME TO "leads_tenant_id_idempotency_key_key";

-- RenameIndex
ALTER INDEX "uq_merchant_brand_config" RENAME TO "merchant_brand_configs_tenant_id_brand_id_key";

-- RenameIndex
ALTER INDEX "uq_merchant_local_inventory_store_prod" RENAME TO "merchant_local_inventory_states_tenant_id_store_id_product__key";

-- RenameIndex
ALTER INDEX "uq_merchant_local_inventory_tenant_brand_store_prod" RENAME TO "merchant_local_inventory_states_tenant_id_brand_id_store_id_key";

-- RenameIndex
ALTER INDEX "uq_merchant_account_offer_id" RENAME TO "merchant_product_mappings_tenant_id_merchant_account_id_off_key";

-- RenameIndex
ALTER INDEX "uq_merchant_prod_mapping_brand" RENAME TO "merchant_product_mappings_tenant_id_brand_id_product_id_key";

-- RenameIndex
ALTER INDEX "uq_opportunity_identity_hash" RENAME TO "opportunities_tenant_id_identity_hash_key";

-- RenameIndex
ALTER INDEX "uq_opportunity_tenant_id" RENAME TO "opportunities_tenant_id_id_key";

-- RenameIndex
ALTER INDEX "uq_opportunity_evidence_tenant_id" RENAME TO "opportunity_evidence_tenant_id_id_key";

-- RenameIndex
ALTER INDEX "page_template_versions_template_version_key" RENAME TO "page_template_versions_page_template_id_version_key";

-- RenameIndex
ALTER INDEX "page_templates_tenant_brand_surface_type_name_key" RENAME TO "page_templates_tenant_id_brand_id_web_surface_id_type_name_key";

-- RenameIndex
ALTER INDEX "pages_tenant_brand_surface_slug_key" RENAME TO "pages_tenant_id_brand_id_web_surface_id_slug_key";

-- RenameIndex
ALTER INDEX "uq_product_merchant_config" RENAME TO "product_merchant_configs_tenant_id_product_id_key";

-- RenameIndex
ALTER INDEX "uq_product_merchant_config_brand" RENAME TO "product_merchant_configs_tenant_id_brand_id_product_id_key";

-- RenameIndex
ALTER INDEX "uq_rank_grid_config" RENAME TO "rank_grid_configs_tenant_id_store_id_grid_size_radius_km_key";

-- RenameIndex
ALTER INDEX "uq_rank_observation_point" RENAME TO "rank_observations_tenant_id_rank_run_id_point_index_key";

-- RenameIndex
ALTER INDEX "uq_rank_run_business_key" RENAME TO "rank_runs_tenant_id_business_key_key";

-- RenameIndex
ALTER INDEX "uq_redirect_from_path" RENAME TO "redirects_tenant_id_from_path_key";

-- RenameIndex
ALTER INDEX "uq_redirect_tenant_id" RENAME TO "redirects_tenant_id_id_key";

-- RenameIndex
ALTER INDEX "seo_configs_tenant_brand_surface_pagetype_key" RENAME TO "seo_configs_tenant_id_brand_id_web_surface_id_page_type_key";

-- RenameIndex
ALTER INDEX "uq_store_competitor" RENAME TO "store_competitors_tenant_id_store_id_competitor_id_key";

-- RenameIndex
ALTER INDEX "uq_store_keyword" RENAME TO "store_keywords_tenant_id_store_id_keyword_id_key";

-- RenameIndex
ALTER INDEX "uq_virtual_number_phone" RENAME TO "virtual_numbers_tenant_id_phone_number_key";

-- RenameIndex
ALTER INDEX "uq_virtual_number_tenant_id" RENAME TO "virtual_numbers_tenant_id_id_key";

-- RenameIndex
ALTER INDEX "uq_visitor_session_tenant_session" RENAME TO "visitor_sessions_tenant_id_session_id_key";

-- Row Level Security (RLS) for Phase 12 tables
ALTER TABLE "listing_store_hours" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "listing_store_hours" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "listing_store_hours";
CREATE POLICY tenant_isolation_policy ON "listing_store_hours"
  FOR ALL
  TO localbi_app
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text);

ALTER TABLE "directory_listings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "directory_listings" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "directory_listings";
CREATE POLICY tenant_isolation_policy ON "directory_listings"
  FOR ALL
  TO localbi_app
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text);

ALTER TABLE "duplicate_listing_candidates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "duplicate_listing_candidates" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "duplicate_listing_candidates";
CREATE POLICY tenant_isolation_policy ON "duplicate_listing_candidates"
  FOR ALL
  TO localbi_app
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text);

ALTER TABLE "listing_change_sets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "listing_change_sets" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON "listing_change_sets";
CREATE POLICY tenant_isolation_policy ON "listing_change_sets"
  FOR ALL
  TO localbi_app
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text);

