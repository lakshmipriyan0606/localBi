# CLIENT FEEDBACK — WORKSTREAM A REPORT
## Shared Analytics + Enterprise Design Foundations

**Status**: VERIFIED / COMPLETED  
**Date**: 2026-10-04  
**Author**: Principal Frontend Architect & Design Systems Lead  

---

## 1. Existing UI Reused & Consolidations

| Primitive | Action | Location | Notes |
|---|---|---|---|
| `Table` | EXTEND | `src/components/ui/table.tsx` | Reused base markup; wrapped by canonical `DataTable` with server pagination and sorting |
| `Card` | REUSE | `src/components/ui/card.tsx` | Base card styling reused |
| `NiceSelect` | REUSE | `src/components/ui/nice-select.tsx` | Reused for brand & location select controls in filter bar |
| `Button` | REUSE | `src/components/ui/button.tsx` | Consistent button variants |
| `Input` | REUSE | `src/components/ui/input.tsx` | Search input for tables and filter bars |
| `ChartTooltipFrame` | CONSOLIDATE | `src/components/charts/chart-tooltip-frame.tsx` | Integrated into `StandardChartTooltip` with `AnalyticsFormatters` |
| `ChartEmptyState` | REUSE | `src/components/charts/chart-empty-state.tsx` | Integrated into `ChartContainer` |
| `DashboardMetricCard` | REPLACE (Migrated) | `src/features/overview/components/` | Deprecated in favor of canonical `MetricCard` with state support |
| `ReportsHeaderControls` | CONSOLIDATE | `src/features/reports/components/` | Consolidated into canonical `FilterBar` |

---

## 2. Foundations Added

- **`AnalyticsPageShell`** (`src/components/analytics/analytics-page-shell.tsx`): Canonical page shell coordinating `AnalyticsPageHeader`, `FilterBar`, status row, notification banners, and responsive layout.
- **`PageHeader` / `AnalyticsPageHeader`** (`src/components/analytics/page-header.tsx`): Unified header supporting breadcrumb trail, title (`h1`), description, status badge, freshness timestamp, primary action, and secondary action slots.
- **`MetricCard`** (`src/components/analytics/metric-card.tsx`): Enterprise KPI card with value (prominent), label, trend badge, comparison subtext, source badge, freshness indicator, tooltip, drilldown affordance, and 8 state variants (`DATA`, `NO_DATA`, `NOT_CONNECTED`, `REAUTH_REQUIRED`, `STALE`, `SYNCING`, `PARTIAL`, `UPSTREAM_ERROR`).
- **`TrendMetricCard`** (`src/components/analytics/trend-metric-card.tsx`): Extends `MetricCard` with accessible, non-distracting SVG sparklines using semantic trend tokens.
- **`DateRangeSelector`** (`src/components/analytics/date-range-selector.tsx`): Fast, keyboard-accessible selector supporting 7D, 28D, 30D, 90D presets and Custom date window modal.
- **`ComparisonSelector`** (`src/components/analytics/comparison-selector.tsx`): Minimal dropdown supporting No comparison, Previous period, and Previous year.
- **`SourceBadge`** (`src/components/analytics/source-badge.tsx`): Subtle source badge for LocalBi, GSC, GA4, GBP, Rank, Merchant, Telephony, Directory, Backlink Provider.
- **`FreshnessIndicator`** (`src/components/analytics/freshness-indicator.tsx`): Subtle sync status dot, relative timestamp ("Updated 5m ago"), and exact UTC timestamp in tooltip.
- **`StatusBadge`** (`src/components/analytics/status-badge.tsx`): Standardized across SUCCESS (ACTIVE, CONNECTED, SYNCED, PUBLISHED), WARNING (STALE, PENDING, PARTIAL, NEEDS_REVIEW), DANGER (ERROR, FAILED, DISCONNECTED), and NEUTRAL (DRAFT, PAUSED, ARCHIVED).
- **`DataTable`** (`src/components/analytics/data-table.tsx`): Generic canonical data table supporting column sort, search filtering, server pagination, loading skeletons, and filtered-empty states.
- **Charts Layer** (`src/components/charts/`):
  - `chart-container.tsx`: Responsive container with status overlays, accessible heading, loading skeleton, error fallback, and refresh spinner.
  - `chart-tooltip.tsx`: Standardized tooltip frame with tabular figures and theme borders.
  - `line-trend-chart.tsx`: Multi-series trend chart with comparison dashed line.
  - `area-trend-chart.tsx`: Volume area chart with subtle vertical gradient fill.
  - `bar-comparison-chart.tsx`: Categorical comparison chart for stores, devices, channels.
  - `horizontal-bar-chart.tsx`: Ranked bars with truncated labels for Top Pages, Queries, Stores, Products.
  - `funnel-chart.tsx`: Multi-stage conversion pipeline with step drop-off analytics.

---

## 3. Date Range & Comparison System

- **Timezone Support**: Date resolution uses business timezone (with UTC fallback), avoiding browser drift.
- **Presets**: `TODAY`, `YESTERDAY`, `LAST_7_DAYS`, `LAST_28_DAYS`, `LAST_30_DAYS`, `LAST_90_DAYS`, `CUSTOM`. Rolling day windows close yesterday to query complete 24h days for external APIs.
- **Comparison Engine**:
  - Equal-duration windows for previous period (e.g. Oct 1–30 -> Sep 1–30).
  - Exact 1-year shift for previous year.
  - Safe zero handling: `0 -> >0` yields `"New"` (never `Infinity%`).
  - Identical zeros: `0 -> 0` yields `"0.0%"` (never `NaN%`).
  - Missing comparison baseline: yields `"N/A"` (never misleading `-100%`).
  - Inverted metrics support (average search position: lower rank is favorable).

---

## 4. Query Architecture & Performance

- **Centralized Query Keys** (`src/lib/query/query-keys.ts`):
  - `analyticsQueryKeys.overview({ tenantSlug, brandId, startDate, endDate, comparison, locationId, webSurfaceId })`
  - Strict tenant and brand scoping prevents cross-brand cache bleed when switching brands.
  - Deterministic sorting of `storeIds` array prevents cache thrashing.
- **Keep-Previous-Data UX**: Added `placeholderData: keepPreviousData` and `staleTime: 60_000` to `usePerformanceSummary`, `usePerformanceTimeseries`, and `usePerformanceDimensions`. When user toggles from 30D to 90D, current data stays fully visible while a subtle `Refreshing...` spinner informs the user, eliminating jarring layout blanking.

---

## 5. Representative Page Migration

- **Target Page**: `src/features/reports/components/reports-dashboard.tsx` (`/client/[tenantSlug]/reports`)
- **Before Architecture**:
  - Monolithic client component combining header, date buttons, brand switcher, sync status, and chart controls.
  - Ad-hoc day toggles (`[1, 7, 30, 90, 365]`) computing dates directly inside inline render memos.
  - `staleTime: 0` causing blanking on every date toggle.
- **After Architecture**:
  - Governed by `<AnalyticsPageShell>` and canonical `<PageHeader>`.
  - Date boundaries resolved through server-identical `DateRangeService`.
  - Filter bar with `<DateRangeSelector>`, `<ComparisonSelector>`, brand/location dropdowns, and active filter chips with remove triggers.
  - `ReportsGscSection` and `ReportsGbpSection` decomposed to use `<MetricCard>` with full source provenance (`GSC` and `GBP`), trend badges, and plain-English tooltips.
  - Zero fake metrics: GSC and GBP metrics remain strictly separated and factually labeled.

---

## 6. Performance Measurements

| Metric | Before Migration | After Migration | Result |
|---|---|---|---|
| Date Change Blanking | Entire dashboard blanks to loaders | Data stays visible; subtle pending spinner | Smooth stable transition |
| Cache Bleed Safety | Key array built ad-hoc in hooks | Enforced by `analyticsQueryKeys` factory | 100% tenant/brand isolated |
| Unit Tests Passing | 81 / 81 tests | 99 / 99 tests (13 test suites) | +18 tests added, 0 failures |
| ESLint Status | Unchecked | 0 errors, 0 warnings on touched files | Clean |

---

## 7. Verification Checklist

- [x] Existing UI components audited and consolidated
- [x] Duplicate analytics primitives avoided
- [x] Semantic analytics tokens implemented in `globals.css`
- [x] PageHeader standardized and reused
- [x] AnalyticsPageShell implemented
- [x] Canonical DateRange system implemented
- [x] Timezone-aware date resolution implemented
- [x] Canonical comparison engine wired to UI
- [x] Safe percentage math implemented (no `Infinity%`, no `NaN%`, no misleading `-100%`)
- [x] DateRangeSelector implemented
- [x] ComparisonSelector implemented
- [x] MetricCard implemented with 8 states
- [x] TrendMetricCard implemented with SVG sparklines
- [x] SourceBadge implemented (all 9 sources supported)
- [x] FreshnessIndicator implemented with relative & UTC tooltips
- [x] StatusBadge standardized across 4 semantic categories
- [x] Shared chart wrappers implemented (`ChartContainer`, `LineTrendChart`, `AreaTrendChart`, `BarComparisonChart`, `HorizontalBarChart`, `FunnelChart`)
- [x] Shared chart tooltip implemented
- [x] Loading states standardized (`MetricCardSkeleton`, `ChartSkeleton`, `TableSkeleton`)
- [x] Empty states standardized (`AnalyticsEmptyState`: `NO_DATA`, `NOT_CONNECTED`, `FILTERED_EMPTY`, `ERROR`)
- [x] TanStack analytics keys centralized and brand-isolated
- [x] Cross-brand cache safety verified
- [x] Representative analytics page (`reports-dashboard.tsx`) migrated
- [x] Date switching keeps previous data visible (`keepPreviousData`)
- [x] Provider provenance strictly preserved (no fake visitor metrics)
- [x] Accessibility verified (aria attributes, role="region", contrast, reduced-motion)
- [x] Responsive layout verified (mobile, tablet, desktop)
- [x] TypeScript passes for touched code
- [x] ESLint passes with 0 errors
- [x] Vitest passes (99/99 tests)
- [x] Implementation tracker updated
