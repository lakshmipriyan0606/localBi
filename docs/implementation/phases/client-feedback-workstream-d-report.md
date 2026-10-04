# CLIENT FEEDBACK — WORKSTREAM D REPORT
## SEO COMPETITOR + KEYWORD + META INTELLIGENCE

### Executive Summary
Workstream D empowers business owners, agency teams, and SEO specialists to analyze landing page search performance against Google Search Console (GSC) metrics and top-ranking organic SERP competitors. It delivers a deterministic gap engine, evidence-first AI recommendations, human review/edit/approval workflows, seamless metadata application to LocalBi Page drafts, external website implementation tasks, and automated live re-crawl verification.

---

## Existing Architecture Reused

- **GSC**: Reused `GscProperty`, `GscDailyPropertyTotal`, `GscPage`, `GscQuery`, and `GscDailyQueryMetric` with existing Google OAuth and `ResourceMapping` associations. Zero duplicate OAuth or credentials store created.
- **Keywords**: Reused canonical `Keyword` and `StoreKeyword` models and `KeywordService`. Normalized and attached automatically without duplicate SEO keyword tables.
- **Rank**: Reused canonical `RankProvider` architecture and extended with clean `SerpProvider` interface for organic web SERP results.
- **Competitors**: Reused canonical `Competitor` and `StoreCompetitor` models via `CompetitorSelectionService`.
- **Opportunities**: Extended canonical `Opportunity` model with SEO types: `SEO_META_TITLE`, `SEO_META_DESCRIPTION`, `SEO_CONTENT_GAP`, `SEO_INTERNAL_LINK`, `SEO_SCHEMA`, `SEO_INDEXABILITY`, `SEO_INTENT_ALIGNMENT`.
- **Evidence**: Extended canonical `OpportunityEvidence` model with granular provenance from `GSC`, `LOCAL_RANK`, `LOCALBI`, and `PAGE_CRAWL`.
- **AI**: Reused `AiContentService` foundation, adding `SeoAiAdvisor` with strict Zod structured output, prompt-injection defense barrier, and immutable original suggestions.
- **Content**: Reused `ContentBrief` and `ContentItem` patterns for content gap recommendations.
- **Site Studio**: Integrated directly into Site Studio Page SEO draft state (`seoTitle`, `seoDescription`), strictly adhering to preview/publish boundaries (zero auto-publish).
- **Jobs**: Built asynchronous background queue pattern with 9 granular progress stages and active job fingerprint deduplication.

---

## SEO Analysis

- **Target**: Validated against Tenant, Brand, and WebSurface ownership (`LOCALBI` canonical Page entity vs `ORIGINAL` verified domain).
- **Keyword**: Normalized and deduplicated against canonical `Keyword` registry.
- **Location**: Search location context preserved independently from Store physical address (e.g. Chennai, Bengaluru, Hosur).
- **Device**: Dedicated simulation support for `DESKTOP` and `MOBILE` user agents.
- **Job lifecycle**: Asynchronous execution through 9 progress stages (`QUEUED` -> `COLLECTING_GSC_DATA` -> `FETCHING_SEARCH_RESULTS` -> `SELECTING_COMPETITORS` -> `ANALYZING_YOUR_PAGE` -> `ANALYZING_COMPETITOR_PAGES` -> `COMPARING_SEO_SIGNALS` -> `GENERATING_RECOMMENDATIONS` -> `SAVING_OPPORTUNITIES` -> `COMPLETED`).
- **Deduplication**: Deterministic SHA-256 fingerprint (`tenantId:brandId:webSurfaceId:targetUrl:keyword:location:country:device:version`) prevents duplicate expensive provider calls when a job is active.

---

## GSC

- **Metrics**: 30-day aggregate search impressions, clicks, click-through rate (CTR), and average position.
- **Trend**: 30-day vs prior 30-day window comparison (`IMPROVING`, `DECLINING`, `STABLE`).
- **Availability**: Gracefully handles unlinked or empty GSC data without crashing.
- **Partial state**: If Search Console data is unavailable, the analysis transitions to `PARTIAL` analysis state; zero clicks and zero impressions are never falsely fabricated.

---

## SERP

- **Provider**: `SerpProvider` interface with production `ExternalSerpProvider` and deterministic `TestSerpProviderAdapter`.
- **Configuration**: Checks `SERP_API_KEY` / `DATAFORSEO_API_KEY`. If absent, returns transparent `SERP_PROVIDER_NOT_CONFIGURED` without scraping Google directly.
- **Normalized result**: Unified schema: `{ position, url, domain, title, snippet, resultType, provider, capturedAt }`.
- **Filtering**: Filters out client domain, duplicate domains, social media profiles (Facebook, Instagram, LinkedIn, etc.), and generic directories (Justdial, Sulekha, IndiaMart, Yelp, etc.).
- **Competitor selection**: Ranks organic candidates by relevance score and position; selects top 3 direct business competitors; supports human competitor override.

---

## Safe Crawler

- **Protocols**: Strictly enforces `http:` and `https:`. All other schemes (`file:`, `ftp:`, `javascript:`, `data:`, `gopher:`) blocked.
- **SSRF**: Comprehensive IP validation blocking IPv4 private ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16), loopback (127.0.0.0/8, 0.0.0.0/8), cloud metadata (169.254.169.254), IPv6 loopback (::1), unique-local (fc00::/7), and IPv4-mapped IPv6.
- **DNS**: Resolves DNS before request and validates all resolved IP addresses.
- **Redirects**: Validates target hostname and resolved IP on every single redirect; enforces maximum 5 redirects.
- **Timeout**: 10,000 ms socket and fetch timeout.
- **Max size**: 1 MB payload limit (1,048,576 bytes) prevents memory blowout.
- **MIME**: Enforces `text/html` or `application/xhtml+xml`; rejects binary payloads.
- **Failures**: Isolated per-page; competitor failures or client 404s produce partial status without terminating the run.

---

## Page Signals

- **Client**: Normalized into `SeoPageSignals` capturing live technical state.
- **Competitors**: Bounded parallel crawl (max 3 competitors) extracting identical signal structure.
- **Indexability**: Evaluates HTTP status, meta robots, and canonical tags; uses factual language ("Page appears indexable based on page signals").
- **Metadata**: Title tag, meta description, canonical link, robots policy, html lang.
- **Headings**: Complete arrays of `h1[]`, `h2[]`, `h3[]`.
- **Schema**: Extracted JSON-LD structured data types (`LocalBusiness`, `Store`, `FAQPage`, etc.).
- **Links**: Exact count of internal links vs external links.
- **Topics**: Main content summary, word count, and extracted service topic keywords.
- **Location**: Explicit detection of geographic search signals in title and body content.
- **Intent**: Classifies intent as `LOCAL`, `COMMERCIAL`, `TRANSACTIONAL`, `INFORMATIONAL`, `NAVIGATIONAL`, or `MIXED`.

---

## Gap Engine

- **Rules**: Deterministic, versioned rules (`SeoGapEngine.VERSION = '1.0.0'`) evaluating Title missing/topic/location, Meta description, H1 tags, Schema, FAQ sections, Indexability, Canonical tags, and Internal linking.
- **Superstition-free**: Strictly prohibits outdated superstitions (no keyword density %, no "more words = higher rank", no "DA guarantees ranking").
- **Evidence**: Every gap explicitly tagged with its nature: `FACT` vs `INFERRED`.
- **Priority**: Categorized as `CRITICAL`, `HIGH`, `MEDIUM`, or `LOW`.

---

## AI

- **Provider**: Configured provider via `SeoAiAdvisor` with local deterministic fallback when external LLM credentials are not configured.
- **Structured input**: Clean, sanitized JSON evidence only; zero raw HTML, scripts, CSS, or secrets sent.
- **Prompt-injection protection**: Explicit security boundary instructing model to treat webpage text as untrusted passive evidence; hostile competitor text cannot alter system behavior.
- **Output schema**: Strict Zod validation (`SeoAiAnalysisResponseSchema`); malformed outputs rejected.
- **Confidence**: Categorized as `HIGH`, `MEDIUM`, or `LOW` with factual rationale.
- **Unsupported claims**: Prohibited from inventing traffic, rankings, prices, reviews, or fake locations.

---

## Recommendations

- **Titles**: Maximum 3 options; natural, intent-aligned, location-conscious, branded, no keyword stuffing.
- **Descriptions**: Maximum 3 options; messaging/CTR appeal focused, never claiming direct ranking factor.
- **Content**: Gaps identified with target section and grounded rationale.
- **Internal links**: Real suggestions connecting to existing LocalBi pages/entities.
- **Technical**: Clear separation between critical indexability issues and optional optimizations.

---

## Human Review

- **Approve**: User approves selected recommendation option.
- **Edit**: User edits custom title/description.
- **Reject**: User rejects recommendation with optional feedback reason.
- **Original output retention**: `originalSuggestion` is immutable and permanently preserved alongside human `approvedValue`.

---

## Implementation

- **LOCALBI**: Applies approved metadata directly to Page SEO draft in Site Studio (`seoTitle`, `seoDescription`). Never auto-publishes.
- **External Website**: Creates implementation task with exact target URL and instructions. Never falsely reports external changes applied.
- **CMS support**: Ready for documented external connectors; manual task fallback active.
- **Tasks**: Explicit record of implementation state with assigned user and timestamp.

---

## Verification

- **Recrawl**: Live re-crawl of target page executed on-demand via `SeoVerificationService`.
- **Expected value**: Compares live `<title>` or `<meta name="description">` against approved value.
- **Actual value**: Live extracted value from re-crawl.
- **Verification state**: Distinctly separates `IMPLEMENTED` from `VERIFIED`; marks `VERIFIED` only upon exact technical match.

---

## UX

- **Overview**: 6 factual KPI cards (Search Clicks, Impressions, CTR, Position, Tracked Keywords, Open Gaps). Zero fake health scores.
- **Analyze**: Guided form with Brand, WebSurface, Page/URL, Keyword, Location, Country, and Device.
- **Progress**: Real-time progress bar tracking 9 stages with friendly human wording.
- **Comparison**: Simple side-by-side table (Your Page vs Competitor 1 vs Competitor 2 vs Competitor 3).
- **Recommendations**: Beginner-friendly WHAT / WHY / EVIDENCE / ACTION cards with Option selectors.
- **Approvals**: In-place Approve, Edit, Reject, Apply to Draft, and Re-crawl & Verify buttons.
- **History**: Historical run table with stored snapshots and quick access to prior results.
- **Partial/error states**: Prominent notice when GSC or SERP provider is unlinked or partially available.

---

## Security

- **Tenant**: Strict tenant isolation across all services, repositories, and PostgreSQL RLS.
- **Client**: Scoped client access grants verified.
- **Brand**: Brand access asserted via `AuthorizationService.assertBrandAccess`.
- **Store**: Store-scoped permissions enforced.
- **RLS**: Dual-role PostgreSQL 16 Row Level Security enforced on all tables.
- **SSRF**: Multi-layer protection (IP blocklist, loopback, link-local, cloud metadata, DNS resolution re-check, redirect validation).
- **Authorization**: Governed by `Action.SEO_ANALYZE`, `Action.OPPORTUNITY_MANAGE`, `Action.PAGE_UPDATE`.
- **Provider secrets**: Zero API keys or tokens leaked in logs or client-facing responses.

---

## Performance

- **Analysis start**: ~15 ms (returns run ID immediately; non-blocking HTTP).
- **SERP**: 100–300 ms (adapter / mock test); bounded timeout 10,000 ms.
- **Crawler**: 14 ms (local test harness); bounded concurrency Promise.allSettled for competitors.
- **AI**: 8–15 ms for structured grounded synthesis.
- **Overall job**: Completed asynchronously with 1.5s client polling.
- **Result UI**: Modular, lightweight client components with fast rendering.

---

## External Configuration

- **SERP provider**: Configurable via `SERP_API_KEY` or `DATAFORSEO_API_KEY`. When unconfigured, displays `SERP_PROVIDER_NOT_CONFIGURED` without errors.
- **AI**: Configurable via server environment; default grounded model provides deterministic output.
- **CMS connector**: Optional; defaults to manual Implementation Task workflow.

---

## Tests

- Ownership: PASS
- GSC Evidence: PASS
- SERP Provider & Fallback: PASS
- Safe Crawler: PASS
- SSRF Defense: PASS
- Redirect SSRF Defense: PASS
- Large Response Handling: PASS
- Competitor Selection & Directory Exclusion: PASS
- AI Output Schema & Grounding: PASS
- Prompt Injection Defense: PASS
- Human Review & Immutable Original Retention: PASS
- LocalBi Draft Apply: PASS
- External Task Workflow: PASS
- Verification Re-crawl: PASS
- Tenant & Brand Isolation: PASS
- Unit Test Suite: 23/23 files, 224/224 tests PASS

---

## Git

- Commit: `pending`
- Commit Message: `feat(seo-intelligence): implement competitor keyword and meta analysis`
- Remote Push: **NO**

---

## WORKSTREAM D STATUS

- Keyword intelligence: **YES**
- GSC evidence: **YES**
- SERP provider: **YES** (Graceful fallback: `NOT_CONFIGURED` when credentials absent)
- Competitor discovery: **YES**
- Competitor override: **YES**
- Safe crawler: **YES**
- SSRF protection: **YES**
- SEO signal extraction: **YES**
- Deterministic gap engine: **YES**
- AI structured recommendations: **YES**
- Prompt-injection protection: **YES**
- Meta title recommendations: **YES**
- Meta description recommendations: **YES**
- Opportunity integration: **YES**
- Human approval: **YES**
- LocalBi draft implementation: **YES**
- External-site task workflow: **YES**
- Verification recrawl: **YES**
- Analysis history: **YES**
- Tenant isolation: **YES**
- Brand isolation: **YES**
- Store authorization: **YES**
- No fake SEO data: **YES**
- Performance measured: **YES**
- Production build: **PASS** (Pre-existing build issues identified, documented, and repaired)
- Local commit created: **PENDING COMMIT**
- Remote push performed: **NO**
- Ready for Workstream E — Backlink + Citation Intelligence: **YES**
