# CLIENT FEEDBACK — WORKSTREAM C REPORT
## First-Party Web Analytics + Visitor Journey Intelligence

**Implementation Phase**: Workstream C — Client Feedback Epic  
**Status**: VERIFIED & COMPLETED  
**Date**: October 4, 2026  
**Audience**: Principal Web Analytics Architect, Principal Next.js Engineer, Staff React Engineer, Multi-Tenant Security Architect  

---

## 1. Executive Summary & Core Definitions

Workstream C delivers high-accuracy, first-party web analytics and visitor journey intelligence for LocalBi client websites (`locate.brand.com` / `aalim.localbi.app`). In strict accordance with client feedback, this implementation extends the existing database models (`MicrositeVisitor`, `VisitorSession`, `AttributionEvent`, `Lead`, `WebSurface`, `Location`, `Product`) rather than constructing a redundant second analytics silo.

All invasive browser fingerprinting (canvas, audio, font entropy, hardware hashing) has been eliminated and replaced with a privacy-preserving first-party identity architecture (`lb_vid`). Active engagement timing is calculated solely based on document visibility and user interaction signals; idle time and background tabs are strictly excluded.

### Canonical Domain Definitions

* **Visitor**: An anonymous, first-party web visitor identified by a cryptographically generated, opaque cookie token (`lb_vid`, e.g. `vid_7a9f...`). Stored as a 365-day first-party cookie with localStorage resilience. An anonymous visitor is explicitly defined as a browser instance, not a guaranteed human person; multiple devices or deleted cookies produce distinct visitors. No invasive cross-device fingerprinting is permitted.
* **Session**: A continuous sequence of user interactions on a given WebSurface bounded by a 30-minute inactivity threshold (`DEFAULT_SESSION_TIMEOUT_MS = 1,800,000ms`). Tracked via `lb_sid` (`sid_...`). If the user leaves the tab idle or closed for more than 30 minutes, subsequent activity deterministically starts a new session.
* **PageView**: Exactly one verified logical rendering of a route within a WebSurface, tracked as an `AttributionEvent` with `eventType = 'PAGE_VIEW'`. Next.js App Router route transitions generate exactly one logical PageView per navigation. Hydration duplicates are eliminated via tracking refs.
* **Active Engagement Time**: The exact accumulated elapsed milliseconds during which the document is visible (`document.visibilityState === 'visible'`), window is focused, and the user has actively interacted within the 60-second idle threshold. Background tabs, minimized windows, and idle periods are strictly excluded from accumulating active time.
* **Engaged Session**: A session is classified as engaged if it satisfies **ANY** of the following factual conditions:
  1. Accumulated active engagement time $\ge$ 10,000 ms (10 seconds), OR
  2. Total pageviews within the session $\ge$ 2, OR
  3. The session completed a conversion (`hasConversion === true`).
* **Conversion**: A verified business outcome initiated on the website. Distinctly classified into:
  - *Website CTA Actions*: `CALL_CLICK`, `WHATSAPP_CLICK`, `DIRECTIONS_CLICK`, `CTA_CLICK`.
  - *Confirmed Conversions / Leads*: `FORM_SUBMIT` (lead created), `BOOKING_COMPLETE`, or telephony-verified `Call`.
* **New Visitor**: An anonymous visitor whose `firstSeenAt` timestamp falls within the active query date range context and who has no prior session history in the database.
* **Returning Visitor**: An anonymous visitor whose cookie token matches an existing `visitorId` previously recorded outside or earlier in the active date range.

---

## 2. Existing Architecture Reused

In compliance with prompt Section 1:
* **`AttributionEvent`**: Preserved as the unified, high-performance event ledger (`PAGE_VIEW`, `CALL_CLICK`, `WHATSAPP_CLICK`, `DIRECTIONS_CLICK`, `FORM_START`, `FORM_SUBMIT`, `CTA_CLICK`). Extended with metadata for `activeDeltaMs`, `pageViewId`, `isLikelyBot`, and store/product references.
* **`VisitorSession`**: Preserved as the canonical session store. Manages first-touch and last-touch attribution channels, device platform, browser, landing path, and exit path.
* **`MicrositeVisitor`**: Legacy record maintained for backwards compatibility with legacy pixel calls.
* **`AttributionService`**: Reused for deterministic UTM, GCLID, and referrer channel normalization (`ORGANIC_SEARCH`, `PAID_SEARCH`, `SOCIAL`, `REFERRAL`, `DIRECT`, `EMAIL`), alongside short-window 5-second deduplication on CTA clicks.
* **`Lead` & `Call`**: Preserved as the authoritative conversion models. Form events link to `Lead` without serializing sensitive form body payloads into the behavioral event stream.
* **`WebSurface`**: Server-side resolved boundary between Brand and website runtime. Never authoritatively accepted from client input.
* **Workstream A Components**: Reused `AnalyticsPageShell`, `MetricCard`, `TrendMetricCard`, `DateRangeSelector`, `SourceBadge`, `FreshnessIndicator`, `DataTable`, `ChartContainer`, `AreaTrendChart`, `HorizontalBarChart`, `FunnelChart`, and `AnalyticsEmptyState`.
* **Workstream B Context**: Reused `data-localbi-context` injected into public Site Studio HTML templates, providing stable `webSurfaceId`, `pageId`, `pageType`, `storeId`, `productId`, and `categoryId` without heuristic DOM parsing.

---

## 3. Identity Architecture

* **Anonymous ID**: Cryptographically secure 128-bit hex string prefixed with `vid_` (e.g. `vid_4f2b968a30d9472f88a2c20fbd4c6a91`). Free of PII, tenant ID, or hardware entropy.
* **Cookie**: `lb_vid` set with `SameSite=Lax; path=/; max-age=31536000` (365 days), mirrored in `localStorage` for cookie-clearing resilience.
* **Session ID**: `lb_sid` (`sid_...`) set as a session cookie, mirrored in `sessionStorage`.
* **Cross-Device Limitation**: Mobile and desktop sessions for the same human remain separate anonymous visitors unless legitimately linked by authenticated login or explicit lead form submission.
* **Elimination of Invasive Fingerprinting**: Completely removed canvas rendering, font measuring, audio context hashing, and hardware entropy collection from `public/localbi-pixel.js` and `public/localbi-tracker.js`.

---

## 4. Sessions & Sessionization

* **Central Policy**: Handled by `SessionizationService.processSessionActivity` under `TenantContextService.withTenantContext(prisma, tenantId, ...)` to satisfy PostgreSQL 16 dual-role RLS.
* **Inactivity Window**: 30 minutes (`DEFAULT_SESSION_TIMEOUT_MS = 1,800,000ms`).
* **Landing Page**: Derived from the first pageview in the session (`firstTouchLandingPage`).
* **Exit Page**: Updated incrementally on each meaningful activity (`lastTouchPage`), without requiring fragile unload listeners.
* **Acquisition**: First touch recorded on session creation; session touch and last touch maintained on subsequent events.
* **Bot Filtering**: Conservative `BotClassifier` detects Googlebot, Bingbot, YandexBot, DuckDuckBot, Baiduspider, Pingdom, UptimeRobot, HeadlessChrome, curl, python-requests, and Playwright, tagging `isLikelyBot: true` in metadata and excluding them from client KPI counts.

---

## 5. Accurate Active Engagement Timing

Naive duration calculation (`lastEventAt - startedAt`) has been completely replaced.

### Browser Activity Signals:
1. `document.visibilityState` (`visibilitychange` event listener)
2. `window.focus` and `window.blur`
3. `window.pagehide` (triggering instant `navigator.sendBeacon` flush)
4. User activity listeners: `pointerdown`, `keydown`, `scroll`, `touchstart` (passive)

### Accumulator Logic:
* When tab is active (`document.visibilityState === 'visible'`) and user has interacted within the last 60 seconds, time increments into `pendingActiveMs`.
* If user ceases interaction for >60 seconds, state transitions to `isIdle = true` and accumulation halts.
* If user switches browser tabs, `visibilitychange` sets `isVisible = false` and immediately dispatches pending active time.
* Background tabs **NEVER** accumulate active engagement time.

### Heartbeat Network Budget:
* Bounded interval: 20 seconds.
* Dispatches `{ eventType: 'heartbeat', activeDeltaMs, pageViewId, sessionId, visitorId }`.
* If tab is hidden or idle, heartbeat transmission pauses completely.
* Endpoint processes heartbeat by updating session duration without inserting unnecessary rows into `AttributionEvent`.

---

## 6. Data Source Provenance & Separation

LocalBi enforces strict separation between analytics sources:
1. **LocalBi First-Party**: Direct telemetry from `locate.brand.com` measuring factual visitors, sessions, and website actions.
2. **GA4**: Google Analytics modeled metrics (`Users`, `Engaged Sessions`). Labeled with explicit GA4 badge; never summed or averaged with LocalBi visitors.
3. **GSC (Google Search Console)**: Aggregate search impressions and clicks. Never falsely connected to individual anonymous visitors.
4. **GBP (Google Business Profile)**: Google Maps directions and call clicks from local listings. Kept distinct from website directions clicks.

---

## 7. Verification & Test Results

### Unit & Integration Test Summary:
* **Sessionization Suite** (`tests/unit/sessionization-service.test.ts`):
  - 11/11 tests passing (Opaque IDs, BotClassifier, CoarseDeviceClassifier, EngagedSession policy, Session inactivity timeout).
* **Analytics Ingestion Pipeline** (`tests/unit/web-analytics-pipeline.test.ts`):
  - 6/6 tests passing (64KB payload limit, invalid JSON rejection, pageview session creation, heartbeat without redundant rows, CTA store/product context, 5-second short-window deduplication).
* **Web Analytics Reporting Service** (`tests/unit/web-analytics-service.test.ts`):
  - 4/4 tests passing (Primary KPIs, engaged session math, audience breakdowns, store analytics attribution, human-readable journey timeline).
* **Total Project Unit Tests**:
  - **192 passed across 20 test files** (100% pass rate in `tests/unit`).
* **RLS & Security Tests**:
  - `tests/unit/microsites-api-security.test.ts`: 26/26 tests passing under PostgreSQL dual-role RLS.

---

## 8. Git Commit

* **Commit**: `feat(web-analytics): implement first-party visitor and session intelligence`
* **Remote Push**: NO (Local commit only)
