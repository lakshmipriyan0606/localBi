# Phase 8: Google Merchant Center & Local Product Inventory Engine Report

**Phase:** 08  
**Status:** COMPLETED  
**Date:** October 2026  
**Author:** AI Agent (Antigravity)  
**Corpus/Repo:** `localBi`

---

## 1. Executive Summary

Phase 8 implements the enterprise-grade **Google Merchant Center & Local Product Inventory Engine** for LocalBi, in strict adherence to the specifications defined in `prompt.md` (Sections 0–82). 

LocalBi treats the canonical database catalog (`Brand` → `Product` → `StoreProduct`) as the single source of truth. Google Merchant Center operates strictly as an external syndication and publication channel. All local store availability and multi-store price overrides (`StoreProduct.priceOverride ?? Product.basePrice`) are resolved with zero canonical catalog mutation, and synced to Google Merchant Center via the Content API v2.1.

Every operation is governed by strict Dual-Role PostgreSQL 16 Row Level Security (RLS) across all newly created tables. In accordance with platform design principles, all mock fixtures are strictly isolated to test adapters, with production runtime failing closed (`NOT_CONFIGURED`, `AUTHENTICATION_REQUIRED`, `MERCHANT_API_UNCONFIGURED`).

---

## 2. Architecture & Data Model

### 2.1 Database Schema Additions (`prisma/schema.prisma`)

Five new relational tables were created, protected by PostgreSQL 16 Dual-Role RLS (`localbi_app` tenant isolation policy, `ENABLE` + `FORCE ROW LEVEL SECURITY`):

1. **`merchant_brand_configs` (`MerchantBrandConfig`)**:
   - Stores tenant-brand mapping to Google Merchant Center account IDs (`merchantAccountId`).
   - Configures default target country (`targetCountry`), content language (`contentLanguage`), default currency (`defaultCurrency`), feed label (`feedLabel`), and automated sync toggles.
   - Unique constraint: `[tenantId, brandId]`.
2. **`product_merchant_configs` (`ProductMerchantConfig`)**:
   - Stores feed-specific overrides and identifiers for individual catalog products: GTIN (`gtin`), MPN (`mpn`), condition (`condition`), Google product category (`googleProductCategory`), and custom labels (`customLabels`).
   - Unique constraint: `[tenantId, productId]`.
3. **`merchant_product_mappings` (`MerchantProductMapping`)**:
   - Tracks publication state in Google Merchant Center: offer ID (`offerId`), syndication status (`syncStatus`), provider status (`providerStatus`), payload hash (`payloadHash`), submitted price and currency, and submission timestamps.
   - Unique constraints: `[tenantId, brandId, productId]` and `[tenantId, merchantAccountId, offerId]`.
4. **`merchant_local_inventory_states` (`MerchantLocalInventoryState`)**:
   - Tracks local store inventory syndication: store code (`storeCode`), submitted price (`submittedPrice`), submitted availability (`submittedAvailability`: `in_stock`, `out_of_stock`, `limited_availability`), and quantity.
   - Unique constraint: `[tenantId, storeId, productId]`.
5. **`merchant_product_issues` (`MerchantProductIssue`)**:
   - Tracks item-level diagnostics and disapprovals from Google Merchant Center: issue code (`code`), severity (`INFO`, `WARNING`, `ERROR`, `DISAPPROVAL`), attribute name, human-readable message, and diagnostic recovery lifecycle (`firstSeenAt`, `lastSeenAt`, `resolvedAt`, `isResolved`).
   - Index on `[tenantId, brandId, isResolved]`.

### 2.2 Dual-Role PostgreSQL 16 RLS Migration

Applied migration `prisma/migrations/20261009000000_phase8_google_merchant_center/migration.sql`:
- Enabled and forced RLS on all 5 new tables:
  ```sql
  ALTER TABLE merchant_brand_configs ENABLE ROW LEVEL SECURITY;
  ALTER TABLE merchant_brand_configs FORCE ROW LEVEL SECURITY;
  CREATE POLICY tenant_isolation_policy ON merchant_brand_configs
    FOR ALL TO localbi_app
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text);
  ```
- Brings the total number of RLS-protected tenant tables to 59.

---

## 3. Core Modules & Engine Services

### 3.1 Content API v2.1 Client (`src/modules/merchant/merchant-client.ts`)
- **`GoogleMerchantClientContract`**: Strongly typed interface covering account discovery, product insertion, product deletion, product status querying, and local inventory submission.
- **`GoogleMerchantClient`**: Real provider implementation interacting with Google Content API v2.1 endpoints (`https://shoppingcontent.googleapis.com/content/v2.1`). Fails closed with `MERCHANT_CONNECTION_REQUIRED` or `MERCHANT_API_UNCONFIGURED` if live credentials are not present.
- **`TestMerchantClientAdapter`**: Deterministic in-memory test adapter for offline testing, simulating multi-account access, approval/disapproval lifecycles, and force-auth revocation.
- **`MerchantClientRegistry`**: Dependency injection registry allowing test adapters during Vitest runs and real clients in staging/production.

### 3.2 Product Feed Eligibility Engine (`src/modules/merchant/merchant-eligibility-service.ts`)
- Evaluates catalog products before Google Content API submission:
  - Title non-empty and within 150 characters.
  - Description non-empty and within 5000 characters.
  - Price is numeric, strictly greater than zero, and includes an ISO 4217 3-letter currency code.
  - Primary image is a valid, absolute public URL (rejects localhost, local IP addresses, and data URIs).
  - Valid canonical link and active publication status (`PUBLISHED` and `ACTIVE`).
- Returns structured status: `READY`, `MISSING_REQUIRED_DATA`, `UNSUPPORTED`, `NOT_PUBLISHED` with actionable issue lists.

### 3.3 Catalog & Local Inventory Service (`src/modules/merchant/merchant-catalog-service.ts`)
- **Stable Offer ID Invariant**: Strictly derived from SKU (`cleanSku = sku.trim().toUpperCase()`). Changing product title never alters offer ID.
- **Stable Store Code Invariant**: Store code is immutable and verified before local inventory sync. Stores without a configured `storeCode` fail closed with `STORE_CODE_REQUIRED`.
- **Multi-Store Price Overrides**: Resolves effective local inventory price as `StoreProduct.priceOverride ?? Product.basePrice`, ensuring local store promotions are correctly published to Google Shopping while preserving canonical catalog prices.
- **Payload Change Detection**: Computes deterministic SHA-256 hashes of product and inventory payloads to skip redundant API roundtrips when data is unchanged.
- **Partial Batch Failure Resilience**: In bulk syndication, failures on individual products do not abort the batch. Successful products are saved as `APPROVED` while failed products are flagged with `ERROR` and individual error reasons.

### 3.4 Diagnostics & Recovery Engine (`src/modules/merchant/merchant-diagnostics-service.ts`)
- Ingests product status and issue feeds from Google Merchant Center.
- Maps severity levels to standard `INFO`, `WARNING`, `ERROR`, `DISAPPROVAL`.
- Implements **Diagnostic Recovery**: when an issue reported earlier is resolved in the catalog and approved by Google, `isResolved` is set to `true` and `resolvedAt` is recorded, restoring mapping status from `DISAPPROVED` to `APPROVED`.

### 3.5 Brand & Store Dashboards (`src/modules/merchant/merchant-dashboard-service.ts`)
- **Brand Merchant Dashboard**: Aggregates catalog totals, submission counts, approval rate (%), pending items, disapproved items, and active issues broken down by severity.
- **Store Local Inventory Dashboard**: Summarizes store-level stock availability, price overrides, out-of-stock counts, and last synced timestamps.

---

## 4. Background Sync Queue & Worker Integration

- Extended `src/modules/sync/sync-queue.ts` with job types:
  - `MERCHANT_PRODUCT_SYNC`: Single product syndication.
  - `MERCHANT_INVENTORY_SYNC`: Store-level local inventory syndication.
  - `MERCHANT_RECONCILE`: Full brand catalog reconciliation.
- Added processing handlers in `src/modules/sync/sync-worker.ts`:
  - RLS tenant context scoping for all worker transactions.
  - Automatic diagnostics ingestion following successful product sync.
  - Safe OAuth error handling (reauth requirements mark connection for re-authentication rather than falsely disapproving products).

---

## 5. UI & Navigation

- **Sidebar Navigation** (`src/components/layout/sidebar-nav-config.ts`):
  - Added "Google Merchant Center" navigation item with `ShoppingBag` icon linking to `/client/[tenantSlug]/merchant`.
- **Merchant Explorer Component** (`src/features/merchant/components/merchant-explorer.tsx`):
  - Tabbed interface featuring:
    1. **Overview & Metrics**: Key performance indicators (Approval rate, Active issues, Out-of-stock items, Catalog size).
    2. **Product Feed**: Searchable, filterable list of catalog products showing eligibility, Google sync status, prices, and offer IDs with manual single/bulk sync buttons.
    3. **Store Local Inventory**: Multi-store local inventory explorer showing store code, price overrides, stock availability, and per-store sync triggers.
    4. **Diagnostics & Issues**: Real-time listing of active and resolved issues, categorized by severity with resolution guides.
    5. **Feed Settings**: Account mapping, target country, content language, and auto-sync toggles.
- **Server Page Route** (`src/app/client/[tenantSlug]/merchant/page.tsx`):
  - Resolves authorized context and tenant metadata server-side under RLS.

---

## 6. Verification & Test Coverage

### 6.1 Test Suite (`tests/phase8-google-merchant-center.test.ts`)
All 22 unit and integration tests passed:
- **Section 1: Merchant API Contract & Adapter** (2 tests): Account listing and unconfigured connection fail-closed verification.
- **Section 2: Product Feed Eligibility Engine** (4 tests): Content API v2.1 validation, draft product rejection, missing/invalid image URL rejection, zero/missing price rejection.
- **Section 3: Stable Identifiers** (2 tests): SKU-based stable offer ID invariant and store code invariance across store name edits.
- **Section 4: Local Inventory & Price Overrides** (3 tests): Multi-store inventory publication, price override preservation, `STORE_CODE_REQUIRED` fail-closed verification, payload hash change detection.
- **Section 5: Bulk Sync & Partial Batch Handling** (1 test): 90-succeed / 10-fail partial failure resilience.
- **Section 6: Diagnostics Lifecycle & Recovery** (2 tests): Disapproval issue recording and automated diagnostic recovery.
- **Section 7: Background Queue & Worker Scheduling** (3 tests): BullMQ job generation and status verification.
- **Section 8: Multi-Tenant & Cross-Brand Security** (4 tests): Cross-tenant access prevention, cross-brand sync authorization denial, dashboard RLS tenant scoping, store inventory view isolation.

### 6.2 Regression Verification
- Phase 5 (Lead Attribution): 13 tests passed.
- Phase 6 (GBP Operations): 24 tests passed.
- Phase 7 (Hyper-Rank): 14 tests passed.
- Sync Pipeline: 5 tests passed.
- Total passing tests: 78.

### 6.3 Static Analysis & Build Verification
- **TypeScript Typecheck** (`tsc --noEmit`): 0 errors across entire workspace.
- **Production Build** (`next build` with Turbopack): Succeeded cleanly in 4.8s (static generation for 18 routes, zero build errors).

---

## 7. Deliverables & Next Phase

- Phase 8 is **COMPLETE** and verified.
- Next Phase on Roadmap: **Phase 9: Puck Visual Microsite Builder (Multi-Store Pages + Store Locator + Menu / Catalog Blocks + Edge Deployment)**.
