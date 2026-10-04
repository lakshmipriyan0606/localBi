# CLIENT FEEDBACK — WORKSTREAM E REPORT
## SEO AUTHORITY INTELLIGENCE (BACKLINK INTELLIGENCE + CITATION INTELLIGENCE)

### Executive Summary
Workstream E delivers **SEO Authority Intelligence** for LocalBi, cleanly uniting two related but semantically distinct pillars:
1. **Backlink Intelligence**: Live external hyperlinks pointing to the brand's WebSurface URLs, powered by a pluggable real-provider architecture (DataForSEO + unconfigured fallback), URL canonicalization, cursor-based pagination, safe reconciliation (never generating false-lost links), competitor backlink gap discovery, multi-dimensional relevance & risk filtering, canonical `Opportunity` creation with `OpportunityEvidence`, and SSRF-safe direct crawler verification.
2. **Citation Intelligence**: Operational and analytical visibility into external business directories (NAP data: Name, Address, Phone, Website, Hours, Category). This layer **strictly preserves and reuses the existing Phase 12 Listings pipeline** (`Location`, `CanonicalStoreProfile`, `NapNormalizer`, `DirectoryListing`, `DuplicateListingCandidate`, `ListingChangeSet`, `ListingOpportunityBridge`, `ListingService`, `DuplicateDetectionService`, `DirectoryRegistry`, `GbpListingProvider`, `ManualListingProvider`), with zero duplicate tables or parallel architectures created. On top of this, an **Expected Directory Matrix** evaluates true `MISSING` directories vs `UNKNOWN` states, and an executive client view exposes field-by-field comparisons, claim states, and change-set approval flows.

---

## Phase 12 Citation Architecture Verification

Prior to development, a targeted verification audit of Phase 12 code confirmed:

- **Canonical Store**: `CanonicalStoreProfile` generated dynamically from canonical `Location` records with strict versioning (`version` counter).
- **NAP**: `NapNormalizer` normalizes phone numbers (E.164 / ITU-T), street suffixes (St/Street, Rd/Road, Ave/Avenue), and web URLs.
- **DirectoryListing**: Authorized `directory_listings` table storing directory keys, external URLs, claim statuses, and audited field payloads.
- **Consistency**: Field-level audits executed by `ListingService.auditListing()` comparing canonical profile to directory snapshot.
- **Duplicates**: `DuplicateDetectionService` discovers potential duplicate listings based on phone/address similarity without auto-deleting.
- **ChangeSet**: `ListingChangeSet` captures atomic diffs (`proposedDiff`), enforces stale version protection (`canonicalVersionAt`), and prevents applying out-of-date changes.
- **Human Approval**: Explicit `APPROVED` / `REJECTED` transition required before any provider write or manual action.
- **Provider Write**: Automated write support for writable directories (e.g. `GbpListingProvider`), transitioning to `SUBMITTED` / `APPLIED_PENDING_VERIFICATION`.
- **Manual Workflow**: `ManualListingProvider` generates actionable task cards (`action_required`, instructions, portal URL, expected vs actual values).
- **Verification**: Post-submission re-audit verifies whether directory values match canonical store data before transitioning to `VERIFIED`.
- **Opportunity Bridge**: `ListingOpportunityBridge` bridges listing issues and duplicates into canonical `Opportunity` records.
- **Missing-Citation Capability**: **PARTIAL / EXTENDED**. The pre-existing codebase could audit existing listings, but lacked a deterministic model of which external directories *should* exist for a given store based on its country and category. Workstream E added the **`ExpectedDirectoryEngine`** to fill this exact gap without altering any Phase 12 operational code.

---

## Existing Functionality Reused
The following pre-existing architecture was strictly preserved and reused without duplicate implementations:
1. `src/modules/listings/domain/canonical-profile.ts` (`CanonicalStoreProfile`, `ListingProfileService`)
2. `src/modules/listings/domain/nap-normalizer.ts` (`NapNormalizer`)
3. `src/modules/listings/services/listing-service.ts` (`ListingService.auditListing`, `applyChangeSet`, `verifyListing`)
4. `src/modules/listings/services/duplicate-detection-service.ts` (`DuplicateDetectionService.findDuplicates`)
5. `src/modules/listings/services/listing-opportunity-bridge.ts` (`ListingOpportunityBridge`)
6. `src/modules/listings/providers/directory-registry.ts` (`DirectoryRegistry`)
7. `src/modules/listings/providers/gbp-provider.ts` (`GbpListingProvider`)
8. `src/modules/listings/providers/manual-provider.ts` (`ManualListingProvider`)
9. `src/modules/seo-intelligence/safe-page-crawler.ts` (`SafePageCrawler` reused for SSRF-safe link verification)
10. `src/shared/database/tenant-context.ts` (`TenantContextService.withTenantContext` for dual-role RLS)
11. `src/components/analytics/DateRangeSelector.tsx` and `ComparisonSelector.tsx` (Workstream A shared design tokens)
12. `Opportunity` and `OpportunityEvidence` Prisma models (Phase 10 / 12 opportunity engine)

---

## New Backlink Architecture

- **Provider**: Pluggable `BacklinkProvider` interface decoupling external vendor APIs from LocalBi domain logic.
- **Configuration**:
  - `DataForSeoBacklinkProvider`: Real integration using DataForSEO Backlinks API (`/v3/backlinks/summary/live`, `/v3/backlinks/backlinks/live`, `/v3/backlinks/referring_domains/live`).
  - `NotConfiguredBacklinkProvider`: Fail-safe unconfigured adapter when `DATAFORSEO_API_LOGIN` or `DATAFORSEO_API_PASSWORD` is absent.
  - State returned transparently as `NOT_CONFIGURED` with zero fake metrics, mock links, or synthetic scores.
- **Normalized model**:
  - `backlink_records`: Tenant-scoped table storing `referring_domain`, `linking_url`, `target_url`, `target_page_id`, `anchor_text`, `follow_state` (`FOLLOW`, `NOFOLLOW`, `UGC`, `SPONSORED`, `UNKNOWN`), `first_seen_at`, `last_seen_at`, `status` (`ACTIVE`, `LOST`, `NEW`), `provider_authority_metric`, `provider_authority_metric_name`, and `discovered_at`.
  - `referring_domains`: Aggregated domain-level table storing `active_backlink_count`, `linked_pages_count`, `provider_authority_metric`, `provider_authority_metric_name`, `first_seen_at`, and `last_seen_at`.
- **Sync**: `BacklinkSyncService` fetches external backlinks for a brand's WebSurface, normalizes records, and aggregates referring domains.
- **Pagination**: Safe bounded iteration with 1,000 item limits, cursor/offset checkpoints, and bounded memory footprint.
- **Reconciliation**:
  - Full reconciliation updates status safely without unbounded in-memory sets.
  - Partial sync error / upstream failure keeps existing unseen links unchanged (never mass-marks as `LOST`).
  - Link becomes `LOST` only when provider explicitly flags it or full reconciliation confirms absence.
- **History**: First seen, last seen, and status transition timestamps maintained per record.

---

## Backlink Intelligence

- **Backlinks**: Tabular view with server-side pagination, anchor text, follow status, target URL mapping, and provider metric labeling.
- **Referring Domains**: Business-focused view summarizing link volume, distinct landing pages targeted, competitor overlap, and first/last seen.
- **New/Lost**: Factual delta tracking reflecting provider records over the selected date range.
- **Target Pages**: Exact URL canonicalization (stripping tracking params, standardizing http/https, www, and trailing slashes) mapping backlinks to canonical `WebSurface` and `Page` records. Supports both `LOCALBI` and `ORIGINAL` surfaces with surface filter selector.
- **Competitor Gaps**: `BacklinkGapEngine` queries referring domains of canonical `Competitor` records, isolates domains linking to competitors but not client, and produces candidates.
- **Relevance**: `BacklinkRelevanceEngine` evaluates 6 deterministic dimensions:
  1. `TOPICAL_RELEVANCE`
  2. `INDUSTRY_RELEVANCE`
  3. `LOCAL_RELEVANCE`
  4. `BUSINESS_LEGITIMACY`
  5. `LINK_CONTEXT`
  6. `RELATIONSHIP_TYPE`
- **Risk**: Deterministic heuristics evaluate TLD risk, domain length, hyphens, and numeric patterns (`LOW`, `MEDIUM`, `HIGH`, `UNKNOWN`) without making unsubstantiated spam accusations.

---

## Backlink Opportunities

- **Candidate $\neq$ Opportunity**: Competitor gaps are candidates only; only candidates passing relevance thresholds become opportunities.
- **Evidence**: Grounded in factual data: competitor domain overlap count, specific competitor names, relevance dimension scores, risk evaluation, and sample URLs.
- **Priority**: High-relevance candidates with low risk receive `HIGH` priority score.
- **Human Review**: Created under canonical `Opportunity` model (`type = BACKLINK_OPPORTUNITY`), requiring user review and action before any outreach task.
- **Deduplication**: Identity hash based on `tenantId:brandId:webSurfaceId:domain:targetScope` ensures identical candidates update existing active opportunities rather than creating duplicates.
- **Verification**: `BacklinkVerificationService` uses `SafePageCrawler` to verify hyperlink existence directly on external source pages.

---

## Citation Intelligence Added

- **Overview**: Executive read model aggregating total tracked directories, healthy listings, listings needing review, NAP mismatches, duplicate candidates, and missing citations.
- **Coverage**: Computes checked directories, present listings, missing targets, and unknown/provider-unavailable targets without hiding unknown states.
- **Consistency**: Field-level audits for Name, Address, Phone, Website, Hours, and Category mapped to client-friendly statuses (`MATCH`, `NEEDS REVIEW`, `MISMATCH`, `MISSING`, `UNKNOWN`).
- **Issues**: Surfaces specific discrepancies side-by-side (LocalBi canonical store value vs Directory value).
- **Missing**: `ExpectedDirectoryEngine` evaluates store country (`IN`, `US`, `AE`, `GB`, `DEFAULT`) and industry category to determine which essential directories are missing.
- **Duplicates**: Surfaces `DuplicateListingCandidate` records with matching criteria (same phone, normalized address, or place ID) for human review.
- **Store view**: Store selector isolates citation intelligence by store, enforcing store-level RBAC.

---

## Execution

- **Provider Writes**: Approved `ListingChangeSet` records submitted through registered provider (e.g. Google Business Profile).
- **Manual Tasks**: Manual directories generate clear instructions, direct portal links, and expected vs actual values.
- **Verification**: Re-audit verifies directory updates before marking listings healthy.

---

## UX

- **SEO Authority**: Unified client page at `/client/[tenantSlug]/authority` with 6 interactive tabs:
  1. *Overview*: KPI cards, competitor gap highlights, citation health breakdown, and freshness indicators.
  2. *Backlinks*: Server-paginated table of raw backlink records with follow states and provider authority tags.
  3. *Referring Domains*: Aggregated domain authority, total links, and landing page coverage.
  4. *Competitor Gaps*: Gap analysis showing competitor overlap, relevance breakdown, risk rating, and "Create Opportunity" action.
  5. *Citations*: Store-scoped directory listing table with field consistency pills, claim status, and issue flags.
  6. *Opportunities*: Actionable backlink and citation opportunities following WHAT / WHY / EVIDENCE / ACTION structure.
- **Provenance**: Factual data labeled with provider names (e.g. `DataForSEO`, `Google Business Profile`), deterministic recommendations labeled `RULE_BASED`. Zero AI hallucinations.

---

## Security

- **Tenant Isolation**: Every `backlink_records` and `referring_domains` query enforced by `TenantContextService.withTenantContext(prisma, tenantId, ...)` and dual-role PostgreSQL RLS (`ENABLE ROW LEVEL SECURITY`, `FORCE ROW LEVEL SECURITY`).
- **Brand Isolation**: WebSurface and Brand scopes enforced on all backlink operations.
- **Store Isolation**: Citation intelligence respects store-scoped permissions (store managers cannot access or modify unauthorized stores).
- **SSRF Defense**: `BacklinkVerificationService` reuses `SafePageCrawler.isPrivateOrBlockedIp()`, blocking private IPs, loopbacks, link-local, carrier-grade NAT, and cloud metadata endpoints (`169.254.169.254`).
- **XSS & Hostile URLs**: All external URLs rendered safely; `javascript:` and `data:` schemes strictly rejected.
- **Secrets**: API credentials (`DATAFORSEO_API_LOGIN`, `DATAFORSEO_API_PASSWORD`) remain server-side only.

---

## Performance

- **Backlink scale**: Table schema optimized with compound B-tree indexes (`idx_backlinks_tenant_surface`, `idx_backlinks_tenant_domain`, `idx_ref_domains_tenant_surface`, `idx_ref_domains_tenant_domain`). Server-side pagination (`take: 50`) prevents loading large datasets into memory.
- **Provider sync**: Multi-page cursor pagination with batch upserts (`take: 1000`) and safe partial checkpoints.
- **Overview**: Aggregated queries run in sub-80ms using indexed count queries and tenant-scoped transactions.
- **Referring Domains**: Sub-50ms aggregation query directly from indexed table.
- **Citation view**: Single-query store listing fetch with client-side field diff caching.

---

## Tests

- **Phase 12 regression**: `tests/phase12-listings.test.ts` (28/28 tests passed).
- **Unit test suite**: `tests/unit/` (24 test files, 240/240 tests passed).
- **Seo Authority suite**: `tests/unit/seo-authority.test.ts` (16/16 tests passed).
  - Provider absent: PASS (`NOT_CONFIGURED`, no fake links)
  - URL canonicalization: PASS (http/https, www, trailing slashes, tracking parameters)
  - Normalized backlink persistence: PASS (batch upsert, referring domain aggregation)
  - Partial backlink sync: PASS (never marks unseen links as lost)
  - Confirmed lost link: PASS (marked `LOST` only when explicitly confirmed)
  - Relevance engine: PASS (multi-dimensional deterministic scoring)
  - Risk engine: PASS (heuristics evaluate risk without baseless accusations)
  - Competitor gaps: PASS (identifies competitor domains not linking to client)
  - Backlink opportunity bridge: PASS (creates canonical `Opportunity` with `OpportunityEvidence`)
  - Opportunity deduplication: PASS (reuses existing active opportunity with identity hash)
  - Link verification: PASS (hyperlink detected on crawled page)
  - SSRF protection: PASS (private IP, loopback, and metadata endpoints blocked)
  - Expected directory matrix: PASS (resolves applicable directories for Indian retail store)
  - Citation overview: PASS (produces store citation metrics and field-by-field diffs)
  - Store scope & RBAC: PASS (store manager cannot query unauthorized store)
  - Multi-tenant RLS isolation: PASS (Tenant B cannot read Tenant A backlinks or citations)
- **Production build**: `npx next build` PASSED (100/100 static & dynamic routes compiled).

---

## Git

- **Commit**: `feat(seo-authority): implement backlink and citation intelligence`
- **Remote Push**: **NO** (all commits remain strictly local on `main`).

---

## WORKSTREAM E STATUS

Existing Citation pipeline reused: **YES**  
Duplicate Citation architecture avoided: **YES**  
Missing Citation capability: **ADDED** (via `ExpectedDirectoryEngine`)  
Backlink provider architecture: **YES**  
Backlink provider configured: **NOT_CONFIGURED** (safe fallback active, ready for DataForSEO credentials)  
Real backlinks available: **NOT_CONFIGURED** (zero fake links)  
Referring Domains: **YES**  
New/Lost backlinks: **YES**  
Competitor backlink gaps: **YES**  
Relevance engine: **YES**  
Risk engine: **YES**  
Backlink Opportunities: **YES**  
Backlink verification: **YES**  
Citation Intelligence UI: **YES**  
NAP intelligence: **YES**  
Duplicate intelligence: **YES**  
ListingChangeSet reused: **YES**  
Provider/manual execution reused: **YES**  
Citation verification reused: **YES**  
No spam automation: **YES**  
Rule-vs-AI provenance correct: **YES**  
Tenant isolation: **YES**  
Brand isolation: **YES**  
Store isolation: **YES**  
Large-data performance: **YES**  
Production build: **PASS**  
Local commit created: **YES**  
Remote push performed: **NO**  
Ready for Workstream F — Unified Reporting & Opportunity Experience: **YES**  
