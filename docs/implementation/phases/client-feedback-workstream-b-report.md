# CLIENT FEEDBACK — WORKSTREAM B REPORT
## LOCALBI SITE STUDIO: DYNAMIC SUBDOMAIN WEBSITE + LANDING PAGE CMS

**Date:** October 4, 2026  
**Status:** VERIFIED / COMPLETED  
**Target:** Client Feedback Workstream B  

---

## 1. Pre-flight

- **Workstream A Verification:** Commit `d91ac36` verified present and intact (`feat(client-feedback-ui): build analytics design foundations`).
- **Build Verification:** Next.js build compilation confirmed (`✓ Compiled successfully in 5.1s`).
- **Git State:** Local branch clean; only intentional Workstream B files modified and staged. No premature push to remote.

---

## 2. Architecture & Data Model Reuse

Strict adherence to Section 1: Zero duplicate models created (`No Website`, `No MicrositeV2`, `No Site`, `No LandingSite`, `No PageBuilderV2`, `No ThemeV2`).

- **WebSurface:** Reused canonical `WebSurface` model (`type = 'LOCALBI'` for LocalBi-hosted websites, `type = 'ORIGINAL'` for client primary domain reference).
- **Domain:** Reused canonical `Domain` model for subdomain/custom domain routing, SSL status, and multi-tenant conflict checks.
- **BrandTheme:** Reused canonical `BrandTheme` model for colors, typography, border-radius tokens, and CSS custom properties injection.
- **Page:** Reused canonical `Page` model with entity bindings (`storeId`, `productId`, `categoryId`, `citySlug`, `slug`, `pageType`, `status`).
- **PageTemplate & PageTemplateVersion:** Reused canonical versioned template engine (`DRAFT`, `PUBLISHED`, `ARCHIVED`) for atomic publication and rollback.
- **Puck Engine:** Reused `@measured/puck` as layout canvas; stripped canonical business data from JSON.
- **Store (Location):** Canonical `Location` model referenced for store information, phone, hours, and geo-coordinates.
- **Product & StoreProduct:** Canonical `Product` and `StoreProduct` models referenced; effective price calculation (`StoreProduct.priceOverride ?? Product.basePrice`) preserved centrally.

---

## 3. Site Studio Information Architecture

The admin experience is delivered at `/client/[tenantSlug]/website/` with structured sub-tabs:

1. **Overview (`/client/[tenantSlug]/website`):**
   - Live website status indicator (`Live & Indexable` vs `Draft Setup Incomplete`).
   - Active domain hostname badge.
   - Last published timestamp.
   - Core counts: Published Pages, Active Stores, Catalog Products, Connected Domains.
   - Real-time readiness & SEO health checks.
   - Quick action triggers: Manage Pages, Customize Design, Preview Site, View Live Site.
2. **Pages (`/client/[tenantSlug]/website/pages`):**
   - Full `DataTable` listing with search, status filters (`All`, `Live Only`, `Drafts`).
   - Actions: Edit in Builder, Publish, Preview Live.
   - "Create Landing Page" modal supporting `Custom Landing Page`, `Store Location Profile`, `Product Showcase`, `City Hub`, and `Service Offering` with slug normalization and collision checks.
3. **Design & Theme (`/client/[tenantSlug]/website/design`):**
   - Palette token pickers (Primary, Secondary, Accent).
   - Typography stack selection (Headings & Body).
   - Button & Card corner radius controls.
   - Live interactive component preview card with real-time token injection.
   - "Import Brand Design" wizard with strict SSRF defense.
4. **Navigation (`/client/[tenantSlug]/website/navigation`):**
   - Header primary navigation and Footer secondary navigation manager.
   - Link types: `Internal Page`, `Store Profile`, `Product Category`, `Product Page`, `External Website`.
   - Protocol security validation (disallows `javascript:`, `data:`, `vbscript:`).
5. **Stores (`/client/[tenantSlug]/website/stores`):**
   - All brand stores mapped with store code, address, phone, and auto-generated website route (`/[city]/[store]`).
   - Direct shortcuts to edit store details and manage catalog overrides.
6. **Products (`/client/[tenantSlug]/website/products`):**
   - Brand catalog items with SKU, Category, Base Price, Stock Status, and Product URL (`/products/[slug]`).
   - Integrated with TanStack Query and `DataTable`.
7. **SEO Settings (`/client/[tenantSlug]/website/seo`):**
   - Tokenized metadata patterns (`{store} in {city} | {brand}`).
   - Safe token whitelist badges (`{brand}`, `{city}`, `{store}`, `{product}`, `{category}`, `{locality}`).
   - Google SERP desktop snippet simulation.
   - Structured data schema toggles (`LocalBusiness`, `Product`, `BreadcrumbList`).
   - XML sitemap link (`/sitemap.xml`).
8. **Domains (`/client/[tenantSlug]/website/domains`):**
   - Active hostnames list with primary domain and SSL status.
   - Connect custom domain input with cross-tenant claim collision detection.
   - DNS configuration card detailing CNAME target (`proxy.localbi.app`) and 1-click clipboard copy.
9. **Analytics:**
   - Seamless link to executive and web reporting modules.

---

## 4. Page Runtime & Performance

- **Hostname Resolution:**
  - `SurfaceService.resolveHost(hostnameOrSubdomain)` maps incoming requests to `tenant`, `brand`, `webSurface`, and `domain`. Unknown hostnames fail closed (404).
- **Centralized PageContext:**
  - `PageContextService.resolveByHostnameOrSubdomain` resolves `tenant`, `brand`, `webSurface`, `domain`, `theme`, `cssBlock`, `navigation`, `store`, `product`, `products`, `reviews`, `seo`, and `trackingContext` in one server execution.
  - Zero component-level API waterfalls.
  - Zero live Google provider API calls on public renders.
- **Puck Bundle Isolation:**
  - Puck visual editor is dynamically imported with `{ ssr: false }` strictly in `/client/[tenantSlug]/website/builder/[pageId]`.
  - Public routes (`/site/[subdomain]/page.tsx` and `/site/[subdomain]/[...slug]/page.tsx`) only import `@measured/puck`'s lightweight `<Render />` component, keeping the public client bundle minimal.
- **Workstream C Tracking Readiness:**
  - Every rendered public page emits an unforgeable, sanitized data attribute:
    `<div data-localbi-context={JSON.stringify(trackingContext)}>`
    containing `tenantSlug`, `brandId`, `webSurfaceId`, `pageType`, `storeId`, `productId`, `categoryId`.

---

## 5. Visual Builder & Lifecycle Management

- **Puck Configuration (`site-studio-puck-config.tsx`):**
  - Categorized component library: `Layout & Structure`, `Brand & Navigation`, `Store & Location`, `Products & Catalog`, `Social Proof & Trust`, `Content & Media`, `Lead & Contact Actions`.
  - Props control presentation, layout, and semantic data source (`CURRENT_STORE_PRODUCTS`, `CURRENT_CATEGORY_PRODUCTS`, `FEATURED_PRODUCTS`). Canonical business data is consumed from `PageContext`.
  - Safe fallbacks and configuration warnings if context is missing.
- **Debounced Autosave:**
  - Visual edits debounced (1200ms) to persist drafts in `PageTemplateVersion` without flooding the API.
- **Responsive Viewport Simulation:**
  - Top bar switcher for Desktop (100%), Tablet (768px), and Mobile (390px) with genuine viewport frame simulation.
- **Atomic Publish Dialog:**
  - Shows page route, current version, new live version, and promotes draft to published status atomically while archiving earlier versions.
- **Rollback System:**
  - Displays version history with timestamps and authors. Rolling back creates a new published version containing historical layout data without mutating historical records.

---

## 6. Brand Design Import & SSRF Defense

`BrandDesignImportService` extracts visual design tokens from a brand's verified `ORIGINAL` WebSurface or specified URL:
- **Security Protections:**
  - Supported protocols: `http:` and `https:`.
  - Disallowed IP detection blocks:
    - Loopback: `127.0.0.0/8`, `::1`
    - Private RFC 1918: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
    - Link-local & cloud metadata: `169.254.0.0/16`, `169.254.169.254`
    - IPv6 loopback, link-local (`fe80::/10`), unique local (`fc00::/7`, `fd00::/8`)
    - IPv4-mapped IPv6 loopbacks (`::ffff:127.0.0.1`)
    - Numeric/hex/octal encoded IP representations (`2130706433`, `0x7f000001`)
    - Local hostnames (`localhost`, `*.internal`, `*.local`)
  - DNS pre-resolution checks all resolved addresses before fetching.
  - Redirect handling: manual redirect validation (max 3 redirects) with DNS re-validation on each step.
  - 10-second request timeout and 1MB response size cap.
  - Content-Type verification (`text/html`).
- **Non-Cloning Policy:**
  - Extracted signals: theme-color, primary CSS variables, prominent background colors, Google fonts, button border-radius, logo/favicon links.
  - Does NOT copy proprietary body text, articles, or copyrighted assets.
  - Human review required before applying tokens to `BrandTheme`.

---

## 7. Verification & Test Results

```
Test Files  3 passed (3)
Tests       24 passed (24)
Duration    1.45s

✓ tests/unit/site-studio.test.ts (9 tests)
✓ tests/unit/brand-design-import-ssrf.test.ts (11 tests)
✓ tests/unit/navigation-service.test.ts (4 tests)

Full Test Suite:
13 passed test files, 123 passed tests (Spikes + Auth + Multi-Tenant + Sync + Reporting + Analytics Foundations + Site Studio)
```

---

## 8. Legacy Debt Documentation

- **Legacy Microsite Route:** `/app/client/[tenantSlug]/microsites/` is retained for backwards compatibility with earlier demo records until migration cutover.
- **Legacy Route Handler:** `/app/site/[subdomain]/page.tsx` checks canonical `PageContextService` first; falls back to legacy `MicrositeService` if no `WebSurface` exists.

---

## 9. Git Commit Details

- **Commit:** `feat(site-studio): implement dynamic LocalBi website builder`
- **Remote Push:** NO (Local commit only as requested)
