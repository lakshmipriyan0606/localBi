# Phase 7 Implementation Report

## Objective
Implement Phase 7: Hyper Rank / Local Search Visibility Engine (Keywords + Geo-Grid Rank Tracking + Competitor Intelligence). Build multi-point geodesic geo-grid generation, keyword management with strict multi-source provenance, vendor-neutral rank provider abstraction with deterministic test adapters, transparent SERP metrics without black-box scores, competitor intelligence with Google Place ID deduplication, asynchronous worker job processing, and an interactive client Geo-Grid visualization explorer.

## Pre-Implementation Audit
- Prior state:
  1. No geo-grid rank tracking models existed in `schema.prisma`.
  2. `Location` table lacked `latitude`, `longitude`, and `googlePlaceId` fields for geodesic coordinate grids.
  3. No keyword tracking or store-keyword mapping existed.
  4. No SERP rank observation, run summary, or historical trend data store existed.
  5. No competitor identification or visibility tracking existed.
  6. No background worker queue job existed for scheduled or on-demand rank scans.
  7. No visual Geo-Grid UI existed for client exploration.

## Existing Code Reused
- `src/shared/database/tenant-context.ts`: TenantContextService for dual-role PostgreSQL RLS context switching.
- `src/modules/sync/sync-queue.ts` & `sync-worker.ts`: BullMQ asynchronous task scheduling and execution pipeline.
- `src/modules/reports/report-context-service.ts`: Tenant, brand, and store resolution for scoped reporting.
- `src/components/layout/sidebar-nav-config.ts`: Client portal navigation structure.
- `src/components/ui/button.tsx`, `card.tsx`, `badge.tsx`, `dialog.tsx`: Design system UI primitives.

## Architecture Decisions
1. **Deterministic Geodesic Geo-Grid Generation:**
   - Implemented in `src/modules/rank/geo-grid-service.ts`.
   - Generates an $N \times N$ matrix (odd dimensions $3 \times 3$ to $9 \times 9$, default $5 \times 5$) centered exactly on the store's verified latitude and longitude.
   - Computes node latitude/longitude using spherical trigonometry / Haversine-derived coordinate offsets ($\Delta \text{lat} = \frac{d_y}{R}$, $\Delta \text{lon} = \frac{d_x}{R \cos(\text{lat})}$).
   - Cardinal edges (North, South, East, West) sit exactly at radius distance $R$ (default 5 km), with corner nodes at $R \times \sqrt{2}$.
   - Stores without verified coordinates fail-closed with an actionable `STORE_COORDINATES_REQUIRED` error.
2. **Keyword Normalization & Strict Provenance:**
   - Implemented in `src/modules/rank/keyword-service.ts`.
   - String normalization trims leading/trailing spaces, collapses multiple consecutive whitespace characters, indexes via lowercase for uniqueness, and preserves display casing.
   - Strict provenance tagging: `MANUAL`, `GSC_IMPORT`, `GBP_IMPORT`, `COMPETITOR_DISCOVERY`. GSC queries, GBP search terms, and manual keywords are never blended without source metadata.
   - Multi-tenant isolation: Keywords are scoped to Brand. Cross-brand store assignment is strictly forbidden and rejected with `CROSS_BRAND_ASSIGNMENT_FORBIDDEN`.
   - Safe bulk import deduplication via PostgreSQL upsert transactions.
3. **Pluggable Rank Provider Abstraction:**
   - Defined `LocalRankProvider` contract in `src/modules/rank/rank-provider.ts`.
   - `ExternalVendorRankProvider`: Real-world vendor adapter (e.g. DataForSEO / BrightLocal) returning transparent `UNCONFIGURED` diagnostics when API credentials are not provisioned in environment variables. Zero simulated or fabricated rankings in production paths.
   - `TestRankProviderAdapter`: Isolated deterministic test fixture implementing realistic distance-decay ranking algorithms for CI/CD and offline verification without external network requests.
   - `RankProviderRegistry`: Allows dynamic adapter registration and lookup.
4. **Transparent Local SERP Metrics (No Proprietary Black-Box Scores):**
   - Implemented in `src/modules/rank/rank-run-service.ts`.
   - Unranked grid nodes store `rank: null` and `found: false` (strictly never `0`).
   - Disclosed formulas:
     - **Local 3-Pack Coverage:** $\frac{\text{nodes with rank} \le 3}{\text{total grid nodes}} \times 100\%$
     - **Top 10 First-Page Coverage:** $\frac{\text{nodes with rank} \le 10}{\text{total grid nodes}} \times 100\%$
     - **Average Found Rank:** $\frac{\sum \text{ranks of found nodes}}{\text{total found nodes}}$
     - **SERP Share of Voice:** $\frac{\sum \text{weight}(\text{rank})}{\text{total grid nodes} \times 100} \times 100\%$ (where weights are standard SERP click-probability weights: rank 1 = 100, 2 = 70, 3 = 50, 4-10 = 25, 11-20 = 10, unranked = 0).
5. **Competitor Intelligence with Place ID Deduplication:**
   - Implemented in `src/modules/rank/competitor-service.ts`.
   - Stores competitor name, Google Place ID, address, phone, rating, reviews count, and website domain.
   - Enforces unique constraint on `(tenantId, googlePlaceId)`.
   - Tracks `StoreCompetitor` relationship with `presenceCount` incrementing when competitors appear in local grid scans.
6. **Asynchronous Worker Queue Integration:**
   - Added `RANK_SCAN` job type to `SyncQueueService` and `SyncWorker`.
   - Runs under `PLATFORM_SUPER_ADMIN` context, bypassing external Google OAuth checks since rank scanning is geo-SERP based.
   - Enforces idempotency via deterministic `businessKey`, with on-demand force-rescan support to preserve historical time-series observations.
7. **Interactive Client Geo-Grid Visualizer:**
   - Built `RankExplorer` in `src/features/rank/components/rank-explorer.tsx`.
   - Color bands: Ranks 1-3 (Emerald / Green), 4-10 (Blue), 11-20 (Amber / Yellow), 20+ (Rose / Red), Unranked (Dashed Slate).
   - Center store pin badge, interactive coordinate inspector drawer showing competitor rankings per pin, KPI cards for all 4 transparent metrics, competitor leaderboard, and keyword management modals.

## Files Added
- `prisma/migrations/20261008000000_phase7_hyper_rank_engine/migration.sql`
- `src/modules/rank/geo-grid-service.ts`
- `src/modules/rank/keyword-service.ts`
- `src/modules/rank/rank-provider.ts`
- `src/modules/rank/competitor-service.ts`
- `src/modules/rank/rank-run-service.ts`
- `src/app/api/tenants/[tenantSlug]/rank/keywords/route.ts`
- `src/app/api/tenants/[tenantSlug]/rank/stores/[storeId]/keywords/route.ts`
- `src/app/api/tenants/[tenantSlug]/rank/stores/[storeId]/grid-config/route.ts`
- `src/app/api/tenants/[tenantSlug]/rank/runs/route.ts`
- `src/app/api/tenants/[tenantSlug]/rank/dashboard/store/[storeId]/route.ts`
- `src/app/api/tenants/[tenantSlug]/rank/dashboard/brand/[brandId]/route.ts`
- `src/app/api/tenants/[tenantSlug]/rank/stores/[storeId]/competitors/route.ts`
- `src/app/client/[tenantSlug]/rank/page.tsx`
- `src/features/rank/components/rank-explorer.tsx`
- `tests/phase7-hyper-rank.test.ts`
- `docs/implementation/phases/phase-07-report.md`

## Files Modified
- `prisma/schema.prisma`
- `src/components/layout/sidebar-nav-config.ts`
- `src/modules/sync/sync-queue.ts`
- `src/modules/sync/sync-worker.ts`
- `docs/implementation/PHASE_TRACKER.md`

## Database / Migration Changes
- Added columns `latitude`, `longitude`, `google_place_id` to `locations` table.
- Created 8 new tables:
  1. `keywords`: Brand-scoped keywords with `source` enum (`MANUAL`, `GSC_IMPORT`, `GBP_IMPORT`, `COMPETITOR_DISCOVERY`), normalized lowercase key, casing preservation.
  2. `store_keywords`: Store-to-keyword tracking junction with `tracking_enabled`, `target_rank`, `priority`.
  3. `rank_grid_configs`: Store-specific geo-grid configuration (grid size $N \times N$, radius in km, center coordinates).
  4. `rank_runs`: Scheduled or on-demand rank scan execution log with status, keyword, store, provider, and duration.
  5. `rank_observations`: Individual node observation recording grid coordinate $(x, y)$, latitude, longitude, distance from store, rank (nullable), and top competitor place IDs.
  6. `rank_run_summaries`: Aggregate performance metrics per run (Local 3-Pack %, Top 10 %, Average Found Rank, SERP Share of Voice).
  7. `competitors`: Tenant-scoped competitors deduplicated by Google Place ID.
  8. `store_competitors`: Store-competitor proximity and presence tracking with historical frequency count.
- Applied Dual-Role PostgreSQL 16 RLS (`localbi_app` tenant isolation policy + table permissions) on all 8 tables. Total protected tenant tables increased from 46 to 54.

## Verification & Test Results
- `tests/phase7-hyper-rank.test.ts`: **14/14 passing (100%)**
  - Section 1: Geodesic Geo-Grid Generation (coordinates, dimension count, center point at index, cardinal edge radius, coordinate validation guard).
  - Section 2: Keyword Normalization & Provenance (whitespace collapse, casing preservation, unique per brand, distinct source provenance, cross-brand store assignment rejection).
  - Section 3: Vendor Provider Abstraction (transparent UNCONFIGURED handling, test adapter deterministic rankings, rank decay by distance).
  - Section 4: Transparent Metric Calculations (Local 3-Pack, Top 10, Average Found Rank, SERP Share of Voice, unranked nodes store rank null).
  - Section 5: Competitor Place ID Deduplication (deduplication by place ID, store competitor frequency tracking).
  - Section 6: End-to-End Rank Run Execution & Dashboards (trigger run, idempotent re-run, summary generation, store dashboard aggregation, brand rank dashboard).
  - Section 7: Queue Service Integration (scheduleRankScan enqueues RANK_SCAN job).
- Regression tests:
  - `tests/phase5-lead-attribution.test.ts`: **13/13 passing (100%)**
  - `tests/phase6-gbp-operations.test.ts`: **24/24 passing (100%)**
  - Total combined test suite: **51/51 passing (100%)**
- TypeScript check (`node --max-old-space-size=4096 node_modules/typescript/bin/tsc --noEmit`): **0 errors (100% clean)**
- Next.js production build (`npm run build`): **All 18 static/dynamic routes compiled cleanly**
