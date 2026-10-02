# Phase 4 Implementation Report

## Objective
Implement Phase 4: Web-Surface Analytics Isolation. Ensure Google Analytics 4 (GA4) and Google Search Console (GSC) metrics for LocalBi microsites (`locate.brand.com`) are strictly separated from client root domains (`brand.com`). LocalBi dashboards default to showing LocalBi-only performance, with options to view Original root domain performance and a side-by-side un-aggregated comparison view.

## Pre-Implementation Audit
Prior to Phase 4, GA4 and GSC reporting fetched whole-property aggregate metrics without filtering by hostname or URL prefix. If a client shared a single GA4 property or GSC domain property between their main website (`brand.com`) and their LocalBi site (`locate.brand.com`), root domain traffic leaked into LocalBi dashboards, polluting ROI attribution.

## Existing Code Reused
- `src/modules/integrations/resource-mapping-service.ts`: Extended existing `InternalResourceMapping` to include `webSurfaceId`, `brandId`, `filterStrategy`, `hostnameFilter`, and `urlPrefixFilter`.
- `src/modules/reports/reporting-service.ts`: Reused GSC aggregation pipeline while injecting prefix filtering for domain properties.
- `src/features/reports/components/website-analytics-view.tsx`: Preserved existing chart cards and metrics display while integrating `SurfaceSelector` and `SurfaceCompareView`.

## Architecture Decisions
1. **GA4 Dimension Filtering by Hostname:** Configured `GA4Service` to inject an exact `hostName` `dimensionFilter` on Google Analytics Data API v1beta requests when querying LocalBi or Original surfaces.
2. **GSC Domain Property URL Prefix Isolation:** For GSC domain properties (`sc-domain:brand.com`), the reporting engine queries granular page-level metrics (`gscDailyPageMetric`) and filters by `page.fullUrl.startsWith(urlPrefixFilter)` rather than querying whole-property totals.
3. **Dual Surface Compare Mode:** Built `SurfaceCompareView` rendering side-by-side metric tables and performance breakdowns. Cross-surface totals are explicitly marked non-additive to prevent misrepresenting user sessions or SEO impressions.
4. **Surface-Scoped Cache Keys:** Redis/memory cache keys incorporate `brandId`, `webSurfaceId`, and `hostnameFilter` (e.g. `ga4:report:{tenantId}:{brandId}:{webSurfaceId}:{propertyId}:{hostname}:{startDate}:{endDate}`), completely preventing cache collision across surfaces.
5. **Client Tracker Injection Guard & PII Sanitizer:** `LocalBiTracker` ensures single GA4 script injection (`window.__localbi_ga_initialized`) and strips sensitive parameters (phone numbers, email addresses, passwords, auth tokens) before sending events.

## Files Added
- `prisma/migrations/20261005000000_phase4_web_surface_analytics/migration.sql`
- `src/features/reports/components/surface-compare-view.tsx`
- `src/features/reports/components/surface-selector.tsx`
- `src/modules/analytics/localbi-tracker.tsx`
- `src/modules/analytics/url-normalizer.ts`
- `tests/phase4-surface-analytics.test.ts`

## Files Modified
- `prisma/schema.prisma`
- `src/app/api/tenants/[tenantSlug]/integrations/google/mappings/route.ts`
- `src/app/api/tenants/[tenantSlug]/reports/dimensions/route.ts`
- `src/app/api/tenants/[tenantSlug]/reports/drilldown/route.ts`
- `src/app/api/tenants/[tenantSlug]/reports/ga4/route.ts`
- `src/app/api/tenants/[tenantSlug]/reports/summary/route.ts`
- `src/app/api/tenants/[tenantSlug]/reports/timeseries/route.ts`
- `src/app/client/[tenantSlug]/reports/ga4/page.tsx`
- `src/features/reports/components/website-analytics-view.tsx`
- `src/features/reports/hooks/use-reports.ts`
- `src/modules/analytics/ga4-service.ts`
- `src/modules/integrations/google/google-api-client.ts`
- `src/modules/integrations/resource-mapping-service.ts`
- `src/modules/reports/report-context-service.ts`
- `src/modules/reports/reporting-service.ts`
- `tests/live-rls.test.ts`
- `tests/overview-service.test.ts`
- `tests/sync-pipeline.test.ts`
- `tests/unit/http-client.test.ts`

## Database / Migration Changes
- Migration `20261005000000_phase4_web_surface_analytics` applied.
- Table `ga4_daily_metrics` created with composite indexes on `(tenant_id, brand_id, web_surface_id, date)`.
- PostgreSQL 16 dual-role RLS enabled and forced for `localbi_app` on `ga4_daily_metrics`. Total protected tenant tables: 42.

## Security / Tenant Isolation
- Verified via `tests/live-rls.test.ts`: 42/42 tables enforced with fail-closed RLS policies for `localbi_app`.
- Tenant context enforced on all mapping and analytics endpoints.
- PII sanitizer strips email, phone, and tokens prior to analytics dispatch.

## Performance Changes
- Hostname dimension filtering pushes analytics aggregation to Google's backend.
- Surface cache prevents duplicate API calls.
- Fast Next.js RSC compilation (3.5s).

## UI / UX Changes
- Surface selector tabs (`LocalBi Pages`, `Original Website`, `Side-by-Side Compare`).
- Clear indicators of isolated vs shared Google properties.
- Contextual warning badges when viewing domain-level properties.

## Tests Added
- `tests/phase4-surface-analytics.test.ts`: 15 exhaustive tests covering hostname filtering, GSC URL prefix aggregation, cache isolation, surface compare calculations, and PII sanitization.
- `tests/live-rls.test.ts`: System catalog audit validating 42/42 tables have RLS enabled and forced.

## Verification Results
- Prisma schema validate: PASS
- Prisma migration status: PASS (11 migrations applied, up to date)
- TypeScript (`tsc --noEmit`): PASS (0 errors)
- Next.js Production Build (`next build`): PASS (Compiled in 3.5s, 17/17 static pages generated)
- Phase 4 Unit & Integration Tests: PASS (15/15)
- Live RLS Security Tests: PASS (20/20)

## Known Limitations
- When a client has not mapped a dedicated GA4 property or measurement ID, metrics default to empty state (no fake mock numbers generated, respecting zero-mock policy).

## Deferred Work
- Conversion & lead attribution (Calls, WhatsApp, Directions, Form fills) is deferred to Phase 5.

## Acceptance Criteria
- [x] Hostname dimension filtering on GA4 API requests
- [x] GSC URL prefix aggregation for domain-level properties
- [x] WebSurface-aware cache keys preventing cross-surface collision
- [x] Single tracker script injection guard & PII sanitization
- [x] Dual surface comparison view with non-additive safeguards
- [x] Database migration and dual-role RLS on all 42 tenant tables
- [x] Zero TypeScript errors and clean production build
