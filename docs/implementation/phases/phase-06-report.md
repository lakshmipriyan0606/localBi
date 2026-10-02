# Phase 6 Implementation Report

## Objective
Implement Phase 6: Google Business Profile Operations. Track per-location GBP sync state, implement profile completeness scoring (labeled "LocalBi Profile Completeness" with disclosed formula), keyword search terms tracking with strict provenance (`source: 'GOOGLE_BUSINESS_PROFILE'`, strictly distinct from GSC queries), brand-wide GBP dashboard aggregates, performant API routes for summaries, daily performance metrics, and search terms, alongside worker support for asynchronous GBP profile sync snapshots.

## Pre-Implementation Audit
- Prior state: GBP integration infrastructure existed for accounts, location discovery, reviews, posts, and performance metrics, but lacked:
  1. Per-location GBP sync status tracking (`gbpSyncStatus`, `gbpSyncedAt`, `gbpSyncError` on `Location`).
  2. GBP keyword search term data store (`GbpSearchTerm` table with strict provenance label).
  3. Profile completeness formula disclosing that it is calculated by LocalBi rather than provided by Google.
  4. Brand-wide GBP dashboard aggregation service and clean REST API routes.
  5. Asynchronous worker task for `GBP_PROFILE_SYNC`.
  6. Fake default rating bug in `Microsite.googleRating` (`@default(4.9)` instead of `@default(0.0)`).

## Existing Code Reused
- `src/modules/integrations/google/google-api-client.ts` & `resource-mapping-service.ts`: Google Business Profile account and location mapping.
- `src/modules/integrations/google/google-connection-resolver.ts`: Connection token resolution.
- `src/modules/integrations/google/gbp-write-client.ts`: Google Business Profile write client.
- `src/modules/sync/sync-worker.ts`: BullMQ background sync worker.
- `src/shared/database/tenant-context.ts`: TenantContextService for dual-role RLS isolation.

## Architecture Decisions
1. **Per-Location GBP Sync State Machine:**
   - Added `gbpSyncStatus`, `gbpSyncedAt`, and `gbpSyncError` to `Location` model.
   - States: `ACTIVE`, `SYNCING`, `SYNCED`, `STALE`, `ERROR`, `REAUTH_REQUIRED`, `RESOURCE_UNAVAILABLE`.
   - `SYNCED` updates `gbpSyncedAt` timestamp; `ERROR` / `REAUTH_REQUIRED` persist readable error messages without breaking tenant data isolation.
2. **Transparent Profile Completeness Formula:**
   - Built a 6-field transparent profile completeness formula: phone, website, business hours, primary category, storefront address lines, and description (> 10 chars).
   - Explicitly labeled: `"LocalBi Profile Completeness"`.
   - Clear disclosure note: `"Score based on: phone, website, business hours, primary category, address, and description. Calculated by LocalBi — not provided by Google."`
3. **Keyword Search Terms & Strict Provenance:**
   - Dedicated `gbp_search_terms` table with Dual-Role PostgreSQL 16 RLS.
   - Enforces `source: 'GOOGLE_BUSINESS_PROFILE'` on all rows.
   - Transparent handling of current Google Business Profile Performance API limitation (Performance API does not currently expose raw keyword queries — returns empty list with explicit disclaimer rather than fabricating fake search keywords).
4. **Brand-Wide Aggregation & Isolation:**
   - `GbpLocationService.getBrandGbpDashboard` computes totals across all brand stores (total stores, mapped stores, unmapped stores, total reviews, unanswered reviews, average rating, sync errors, reauth requirements).
   - Validates that the requested brand belongs to the authorized tenant context; prevents cross-tenant data leaks.
5. **Worker Task Extension:**
   - Added `GBP_PROFILE_SYNC` job type to `SyncQueueService` and `SyncWorker`.
   - Worker takes a Google→LocalBi snapshot without public page latency, aborts cleanly if OAuth connection is `REVOKED`.
6. **Bug Fix: Fake Rating Removal:**
   - Fixed `Microsite.googleRating` from `@default(4.9)` to `@default(0.0)`. Synced from real `GbpLocationAggregate`.

## Files Added
- `prisma/migrations/20261007000000_phase6_gbp_operations/migration.sql`
- `src/modules/reports/gbp-location-service.ts`
- `src/modules/reports/gbp-search-term-service.ts`
- `src/app/api/tenants/[tenantSlug]/reports/gbp/summary/route.ts`
- `src/app/api/tenants/[tenantSlug]/reports/gbp/performance/route.ts`
- `src/app/api/tenants/[tenantSlug]/reports/gbp/search-terms/route.ts`
- `tests/phase6-gbp-operations.test.ts`
- `docs/implementation/phases/phase-06-report.md`

## Files Modified
- `prisma/schema.prisma`
- `src/modules/sync/sync-queue.ts`
- `src/modules/sync/sync-worker.ts`
- `docs/implementation/PHASE_TRACKER.md`

## Database / Migration Changes
- Added columns `gbp_sync_status`, `gbp_synced_at`, `gbp_sync_error` to `locations`.
- Created table `gbp_search_terms` with unique constraint `(tenant_id, location_id, term, period_start)`.
- Applied Dual-Role PostgreSQL 16 RLS (`localbi_app` tenant isolation policy + table permissions) on `gbp_search_terms`. Total protected tenant tables increased to 46.
- Altered `microsites.google_rating` default from 4.9 to 0.0.

## Verification & Test Results
- `tests/phase6-gbp-operations.test.ts`: **24/24 passing (100%)**
  - Section 1: Profile Completeness Formula (0%, 17%, 50%, 83%, 100%, description length check, LocalBi label disclosure)
  - Section 2: Location Sync Status & RLS Context (SYNCING, SYNCED + timestamp, ERROR, REAUTH_REQUIRED, cross-tenant update rejection)
  - Section 3: Brand GBP Dashboard Aggregates (store counts, review counts, unanswered reviews, average rating, cross-tenant brand query rejection)
  - Section 4: Performance Metrics Provenance (explicit `source: 'GOOGLE_BUSINESS_PROFILE'`, daily breakdown, aggregate totals, tenant isolation)
  - Section 5: GBP Search Terms & Distinction from GSC Queries (`source: 'GOOGLE_BUSINESS_PROFILE'`, upsert idempotency, brand listing, RLS cross-tenant rejection, honest API zero-sync)
  - Section 6: Reviews Upsert Idempotency & Data Safety (idempotent upsert by `reviewId`, partial sync safety preserving reviews on error)
  - Section 7: Sync Queue Service GBP Profile Sync Scheduling (`scheduleGbpProfileSync`)
- Regression tests:
  - `tests/phase5-lead-attribution.test.ts`: **13/13 passing (100%)**
  - `tests/brand-wise-mapping.test.ts`: **3/3 passing (100%)**
- TypeScript check (`node --max-old-space-size=4096 node_modules/typescript/bin/tsc --noEmit`): **0 errors (100% clean)**
- Next.js production build: **Passed cleanly**
