'use client';

/**
 * ReportsDashboard — orchestrator component.
 *
 * Responsibilities:
 *  - Filter state (brand, location, date range)
 *  - Data fetching via TanStack Query hooks
 *  - Rendering sub-components with fetched data
 *
 * This component deliberately contains NO rendering logic.
 * Each section (KPIs, charts, tables, footer) lives in its own component.
 */

import { useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  MousePointerClick,
  Eye,
  BarChart2,
  Search,
  PhoneCall,
  Globe,
  Navigation,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { MetricCard, ActionMetricCard } from './metric-card';
import { SourceStatusBadge } from './source-status-badge';
import type { SourceConnection } from './source-status-badge';
import { DimensionBreakdown } from './dimension-breakdown';
import {
  usePerformanceSummary,
  usePerformanceTimeseries,
  usePerformanceDimensions,
} from '../hooks/use-reports';
import { useReportsQueryState } from '../hooks/use-reports-query-state';
import {
  formatNumber,
  formatPercent,
  formatPosition,
  formatDateRange,
} from '@/shared/lib/formatters';

// Lazy-load the chart panel — keeps chart library out of the initial page bundle
const TrendChartPanel = dynamic(
  () => import('./trend-chart-panel').then((m) => ({ default: m.TrendChartPanel })),
  {
    loading: () => (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    ),
    ssr: false,
  }
);

export interface ReportsDashboardProps {
  tenantSlug: string;
  tenantName: string;
  brands: Array<{ id: string; name: string; slug: string }>;
  locations: Array<{
    id: string;
    brandId: string;
    name: string;
    storeCode: string | null;
    city: string;
  }>;
  initialBrandId: string;
}

export function ReportsDashboard({
  tenantSlug,
  tenantName,
  brands,
  locations,
  initialBrandId,
}: ReportsDashboardProps) {
  const {
    state,
    setDateRangeDays,
    setBrandId,
    setLocationId,
  } = useReportsQueryState({
    dateRangeDays: 30,
    brandId: initialBrandId,
  });

  const selectedBrandId = state.brandId || initialBrandId;
  const selectedLocationId = state.locationId || '';
  const dateRangeDays = state.dateRangeDays;

  // Compute date range from today backward
  const { startDate, endDate } = useMemo(() => {
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - dateRangeDays);
    return {
      startDate: past.toISOString().slice(0, 10),
      endDate: today.toISOString().slice(0, 10),
    };
  }, [dateRangeDays]);

  // Locations scoped to the selected brand
  const brandLocations = useMemo(
    () => locations.filter((l) => l.brandId === selectedBrandId),
    [locations, selectedBrandId]
  );

  const filterParams = {
    tenantSlug,
    brandId: selectedBrandId,
    locationId: selectedLocationId || undefined,
    startDate,
    endDate,
  };

  const {
    data: summary,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
    error: summaryError,
    refetch: refetchSummary,
    isFetching: isSummaryFetching,
  } = usePerformanceSummary(filterParams);

  const {
    data: timeseries = [],
    isLoading: isTimeseriesLoading,
  } = usePerformanceTimeseries(filterParams);

  const {
    data: dimensions,
    isLoading: isDimensionsLoading,
  } = usePerformanceDimensions(filterParams);

  // Handle brand switch: always reset location to "all"
  const handleBrandChange = (newBrandId: string) => {
    setBrandId(newBrandId);
  };

  const comparisonLabel = `vs prior ${dateRangeDays}d`;

  const connections: SourceConnection[] = useMemo(() => {
    if (isSummaryLoading) return [];
    const hasGscData = summary?.gsc != null && (summary.gsc.totalClicks > 0 || summary.gsc.totalImpressions > 0);
    const hasGbpData = summary?.gbp != null && (summary.gbp.totalViews > 0 || summary.gbp.callClicks > 0);
    return [
      {
        provider: 'GSC' as const,
        state: hasGscData ? 'connected' : 'disconnected',
        lastSyncedAt: null,
      },
      {
        provider: 'GBP' as const,
        state: hasGbpData ? 'connected' : 'disconnected',
        lastSyncedAt: null,
      },
    ];
  }, [summary, isSummaryLoading]);

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb Navigation ── */}
      <Breadcrumbs
        items={[
          { label: 'Reports', current: true },
        ]}
        tenantSlug={tenantSlug}
      />

      {/* ── Page Header ── */}
      <PageHeader
        title="Performance & Reporting"
        description={
          <>
            Unified cross-channel analytics for{' '}
            <strong className="text-slate-800 font-semibold">{tenantName}</strong>. Click any metric to inspect detailed drill-down analysis.
          </>
        }
        badge={
          !isSummaryLoading && (
            <SourceStatusBadge connections={connections} />
          )
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Brand selector */}
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Brand
              </span>
              <select
                id="report-brand-selector"
                value={selectedBrandId}
                onChange={(e) => handleBrandChange(e.target.value)}
                className="text-[13px] font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                aria-label="Select brand"
              >
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Location selector */}
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Location
              </span>
              <select
                id="report-location-selector"
                value={selectedLocationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="text-[13px] font-medium text-slate-800 bg-transparent focus:outline-none cursor-pointer max-w-[180px]"
                aria-label="Filter by location"
              >
                <option value="">All ({brandLocations.length})</option>
                {brandLocations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                    {l.storeCode ? ` (${l.storeCode})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Date range selector */}
            <div
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1"
              role="group"
              aria-label="Date range"
            >
              {([7, 30, 90] as const).map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setDateRangeDays(days)}
                  aria-pressed={dateRangeDays === days}
                  className={`px-2.5 py-1 rounded-md text-[12px] font-semibold transition-all cursor-pointer ${
                    dateRangeDays === days
                      ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>

            {/* Background refresh indicator */}
            {isSummaryFetching && !isSummaryLoading && (
              <RefreshCw className="h-4 w-4 text-slate-400 animate-spin" aria-label="Refreshing data" />
            )}
          </div>
        }
      />

      {/* ── Sub-Report Navigation Pills ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-slate-100/80 rounded-xl border border-slate-200 text-xs font-semibold">
        <span className="px-3 py-1.5 rounded-lg bg-white text-indigo-700 shadow-xs border border-slate-200/80">
          Overview
        </span>
        <Link
          href={`/t/${tenantSlug}/reports/gsc/queries?days=${dateRangeDays}&brandId=${selectedBrandId}`}
          className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-colors whitespace-nowrap"
        >
          Search Queries
        </Link>
        <Link
          href={`/t/${tenantSlug}/reports/gsc/pages?days=${dateRangeDays}&brandId=${selectedBrandId}`}
          className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-colors whitespace-nowrap"
        >
          Landing Pages
        </Link>
        <Link
          href={`/t/${tenantSlug}/reports/gsc/countries?days=${dateRangeDays}&brandId=${selectedBrandId}`}
          className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-colors whitespace-nowrap"
        >
          Countries
        </Link>
        <Link
          href={`/t/${tenantSlug}/reports/gsc/devices?days=${dateRangeDays}&brandId=${selectedBrandId}`}
          className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-colors whitespace-nowrap"
        >
          Devices
        </Link>
        <div className="h-4 w-px bg-slate-300 mx-1 flex-shrink-0" />
        <Link
          href={`/t/${tenantSlug}/reports/gbp/locations?days=${dateRangeDays}&brandId=${selectedBrandId}`}
          className="px-3 py-1.5 rounded-lg text-teal-800 hover:text-teal-950 hover:bg-white/60 transition-colors whitespace-nowrap"
        >
          GBP Locations
        </Link>
        <Link
          href={`/t/${tenantSlug}/reports/gbp/search-terms?brandId=${selectedBrandId}`}
          className="px-3 py-1.5 rounded-lg text-teal-800 hover:text-teal-950 hover:bg-white/60 transition-colors whitespace-nowrap"
        >
          Monthly Search Terms
        </Link>
      </div>

      {/* ── Error State ── */}
      {isSummaryError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
            <div>
              <p className="text-[13px] font-semibold">Failed to load performance reports</p>
              <p className="text-[12px] text-red-600 mt-0.5">
                {(summaryError as Error)?.message || 'An unexpected error occurred'}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetchSummary()}
            className="flex-shrink-0 text-red-700 border-red-300 hover:bg-red-100"
          >
            Retry
          </Button>
        </div>
      )}

      {/* ── Primary GSC KPI Cards ── */}
      <section aria-label="Google Search Console metrics">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Google Search Console — Organic Search
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            {formatDateRange(startDate, endDate)}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Search Clicks"
            value={formatNumber(summary?.gsc.totalClicks)}
            source="GSC"
            deltaPercent={summary?.previousPeriod.clicksGrowthPercent ?? null}
            higherIsBetter={true}
            comparisonLabel={comparisonLabel}
            icon={MousePointerClick}
            isLoading={isSummaryLoading}
            href={`/t/${tenantSlug}/reports/gsc/queries?days=${dateRangeDays}&brandId=${selectedBrandId}`}
          />
          <MetricCard
            label="Search Impressions"
            value={formatNumber(summary?.gsc.totalImpressions)}
            source="GSC"
            deltaPercent={summary?.previousPeriod.impressionsGrowthPercent ?? null}
            higherIsBetter={true}
            comparisonLabel={comparisonLabel}
            icon={Eye}
            isLoading={isSummaryLoading}
            href={`/t/${tenantSlug}/reports/gsc/queries?days=${dateRangeDays}&brandId=${selectedBrandId}&sortBy=impressions`}
          />
          <MetricCard
            label="Click-Through Rate"
            value={formatPercent(summary?.gsc.ctr)}
            source="GSC"
            subtext="Calculated as total clicks / impressions"
            icon={BarChart2}
            isLoading={isSummaryLoading}
            href={`/t/${tenantSlug}/reports/gsc/queries?days=${dateRangeDays}&brandId=${selectedBrandId}&sortBy=ctr`}
          />
          <MetricCard
            label="Average Position"
            value={formatPosition(summary?.gsc.averagePosition)}
            source="GSC"
            subtext="Impression-weighted average rank (lower is better)"
            higherIsBetter={false}
            icon={TrendingUp}
            isLoading={isSummaryLoading}
            href={`/t/${tenantSlug}/reports/gsc/queries?days=${dateRangeDays}&brandId=${selectedBrandId}&sortBy=position&sortOrder=asc`}
          />
        </div>
      </section>

      {/* ── GBP Customer Action Intent Metrics ── */}
      <section aria-label="Google Business Profile customer action metrics">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-teal-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Google Business Profile — Local Listings & Actions
            </h2>
          </div>
          <Link
            href={`/t/${tenantSlug}/reports/gbp/locations?days=${dateRangeDays}&brandId=${selectedBrandId}`}
            className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1 hover:underline"
          >
            <span>View All Locations</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ActionMetricCard
            label="Profile Impressions"
            value={isSummaryLoading ? '—' : formatNumber(summary?.gbp.totalViews)}
            description={`Search: ${formatNumber(summary?.gbp.totalSearchViews)} · Maps: ${formatNumber(summary?.gbp.totalMapsViews)}`}
            isLoading={isSummaryLoading}
            icon={Search}
            iconBg="bg-teal-100"
            iconColor="text-teal-700"
            href={`/t/${tenantSlug}/reports/gbp/locations?days=${dateRangeDays}&brandId=${selectedBrandId}`}
          />
          <ActionMetricCard
            label="Call-Button Clicks"
            value={isSummaryLoading ? '—' : formatNumber(summary?.gbp.callClicks)}
            description="Taps on profile phone link (not completed calls)"
            isLoading={isSummaryLoading}
            icon={PhoneCall}
            iconBg="bg-blue-100"
            iconColor="text-blue-700"
            href={`/t/${tenantSlug}/reports/gbp/locations?days=${dateRangeDays}&brandId=${selectedBrandId}&sortBy=callClicks`}
          />
          <ActionMetricCard
            label="Website Link Clicks"
            value={isSummaryLoading ? '—' : formatNumber(summary?.gbp.websiteClicks)}
            description="Link taps to site from listing (not confirmed web sessions)"
            isLoading={isSummaryLoading}
            icon={Globe}
            iconBg="bg-indigo-100"
            iconColor="text-indigo-700"
            href={`/t/${tenantSlug}/reports/gbp/locations?days=${dateRangeDays}&brandId=${selectedBrandId}&sortBy=websiteClicks`}
          />
          <ActionMetricCard
            label="Direction Requests"
            value={isSummaryLoading ? '—' : formatNumber(summary?.gbp.directionRequests)}
            description="Navigation requests in Maps (not confirmed store visits)"
            isLoading={isSummaryLoading}
            icon={Navigation}
            iconBg="bg-emerald-100"
            iconColor="text-emerald-700"
            href={`/t/${tenantSlug}/reports/gbp/locations?days=${dateRangeDays}&brandId=${selectedBrandId}&sortBy=directionRequests`}
          />
        </div>
      </section>

      {/* ── Performance Trend Charts ── */}
      <TrendChartPanel
        data={timeseries}
        isLoading={isTimeseriesLoading}
        startDate={startDate}
        endDate={endDate}
        dateRangeDays={dateRangeDays}
      />

      {/* ── Dimension Breakdown ── */}
      <DimensionBreakdown
        queries={dimensions?.queries || []}
        pages={dimensions?.pages || []}
        devices={dimensions?.devices || []}
        isLoading={isDimensionsLoading}
      />

      {/* ── Compliance & Data Policy Footer ── */}
      <footer className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-[11px] text-slate-500 leading-relaxed">
        <p>
          <strong className="text-slate-700">Data accuracy notice:</strong>{' '}
          Google Business Profile metrics are stored in compliance with official GBP developer
          data retention policies (30-day bounded window). Search Console average position is
          impression-weighted and may differ from rank-tracking tools. Direction requests and
          call-button clicks reflect customer intent actions — they do not represent confirmed
          calls or completed navigations. Website link clicks from GBP are not equivalent
          to confirmed website sessions in analytics platforms.
        </p>
      </footer>
    </div>
  );
}
