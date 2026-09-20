'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { AnalyticsLoader } from '@/components/ui/analytics-loader';
import { SourceStatusBadge } from './source-status-badge';
import { DimensionBreakdown } from './dimension-breakdown';
import { ReportsHeaderControls } from './reports-header-controls';
import { ReportsGbpSection } from './reports-gbp-section';
import { ReportsGscSection } from './reports-gsc-section';
import { ReportsGbpQuickLinks } from './reports-gbp-quick-links';
import { ReportsPolicyFooter } from './reports-policy-footer';
import { usePerformanceSummary, usePerformanceTimeseries, usePerformanceDimensions } from '../hooks/use-reports';
import { useReportsQueryState } from '../hooks/use-reports-query-state';

const TrendChartPanel = dynamic(
  () => import('./trend-chart-panel').then((m) => ({ default: m.TrendChartPanel })),
  { loading: () => <AnalyticsLoader variant="hero" message="Initializing performance trend charts..." />, ssr: false }
);

export interface ReportsDashboardProps {
  tenantSlug: string;
  tenantName: string;
  brands: Array<{ id: string; name: string; slug: string }>;
  locations: Array<{ id: string; brandId: string; name: string; storeCode: string | null; city: string }>;
  initialBrandId: string;
  isGbpConnected?: boolean;
  isGscConnected?: boolean;
}

export function ReportsDashboard({ tenantSlug, tenantName, brands, locations, initialBrandId, isGbpConnected = true, isGscConnected = true }: ReportsDashboardProps) {
  const { state, setDateRangeDays, setBrandId, setLocationId } = useReportsQueryState({
    dateRangeDays: 30,
    brandId: initialBrandId,
  });

  const activeSource: 'gbp' | 'gsc' = state.tab === 'gsc' ? 'gsc' : 'gbp';
  const selectedBrandId = state.brandId || initialBrandId;
  const brandLocations = useMemo(() => locations.filter((l) => l.brandId === selectedBrandId), [locations, selectedBrandId]);

  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - state.dateRangeDays);
    return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
  }, [state.dateRangeDays]);

  const queryParams = { tenantSlug, brandId: selectedBrandId, locationId: state.locationId || undefined, startDate, endDate };
  const { data: summary, isLoading: isSummaryLoading, isFetching: isSummaryFetching, isError: isSummaryError, error: summaryError, refetch: refetchSummary } = usePerformanceSummary(queryParams);
  const { data: timeseries = [], isLoading: isTimeseriesLoading, isFetching: isTimeseriesFetching } = usePerformanceTimeseries(queryParams);
  const { data: dimensions, isLoading: isDimensionsLoading, isFetching: isDimensionsFetching } = usePerformanceDimensions(queryParams);

  const isDataBusy = isSummaryLoading || isSummaryFetching;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          {
            label: activeSource === 'gbp' ? 'Google Business Profile' : 'Search Console',
            href: `/t/${tenantSlug}?tab=${activeSource}`,
          },
          {
            label: activeSource === 'gbp' ? 'Performance Hub' : 'Search Performance',
            current: true,
          },
        ]}
        tenantSlug={tenantSlug}
      />
      <PageHeader
        title={activeSource === 'gbp' ? 'Performance Hub' : 'Search Performance'}
        description={activeSource === 'gbp'
          ? `Local search reach, customer actions, and storefront performance for ${tenantName}.`
          : `Organic search visibility, queries, and landing page reach for ${tenantName}.`}
        badge={
          <SourceStatusBadge
            connections={
              [{ provider: activeSource === 'gbp' ? 'GBP' : 'GSC', state: (activeSource === 'gbp' ? isGbpConnected : isGscConnected) ? 'connected' : 'disconnected', lastSyncedAt: null }]
            }
          />
        }
        actions={
          <ReportsHeaderControls
            brands={brands}
            selectedBrandId={selectedBrandId}
            onBrandChange={setBrandId}
            brandLocations={brandLocations}
            selectedLocationId={state.locationId || ''}
            onLocationChange={setLocationId}
            dateRangeDays={state.dateRangeDays}
            onDateRangeChange={setDateRangeDays}
            isFetching={isDataBusy}
          />
        }
      />

      {isSummaryError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-rose-800 shadow-2xs">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-500" />
            <div>
              <p className="text-xs font-bold">Failed to load live performance metrics</p>
              <p className="text-[11px] text-rose-600 mt-0.5">{(summaryError as Error)?.message || 'An error occurred while streaming performance data.'}</p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => refetchSummary()} className="border-rose-300 text-rose-800 hover:bg-rose-100 flex-shrink-0 text-xs">
            Retry
          </Button>
        </div>
      )}

      {!(activeSource === 'gbp' ? isGbpConnected : isGscConnected) ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-slate-200 border-dashed rounded-2xl bg-slate-50/50">
          <div className="w-12 h-12 bg-slate-200 text-slate-500 rounded-full flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            {activeSource === 'gbp' ? 'Business Profile Not Linked' : 'Website Domain Not Linked'}
          </h3>
          <p className="text-sm text-slate-500 mb-6 max-w-md">
            You need to link a valid Google property to this brand to view real-time performance analytics and reports.
          </p>
          <a href={`/t/${tenantSlug}/integrations`} className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50 bg-indigo-600 text-slate-50 shadow hover:bg-indigo-600/90 h-9 px-4 py-2">
            Manage Connections
          </a>
        </div>
      ) : (
        <>
          {activeSource === 'gsc' && (
            <ReportsGscSection
              summary={summary}
              isLoading={isDataBusy}
              tenantSlug={tenantSlug}
              selectedBrandId={selectedBrandId}
              dateRangeDays={state.dateRangeDays}
              startDate={startDate}
              endDate={endDate}
            />
          )}
          {activeSource === 'gbp' && (
            <ReportsGbpSection
              summary={summary}
              isLoading={isDataBusy}
              tenantSlug={tenantSlug}
              selectedBrandId={selectedBrandId}
              dateRangeDays={state.dateRangeDays}
            />
          )}
          
          <TrendChartPanel data={timeseries} isLoading={isTimeseriesLoading || isTimeseriesFetching} startDate={startDate} endDate={endDate} dateRangeDays={state.dateRangeDays} source={activeSource} />
          
          {activeSource === 'gsc' && <DimensionBreakdown queries={dimensions?.queries || []} pages={dimensions?.pages || []} devices={dimensions?.devices || []} isLoading={isDimensionsLoading || isDimensionsFetching} />}
          {activeSource === 'gbp' && <ReportsGbpQuickLinks tenantSlug={tenantSlug} selectedBrandId={selectedBrandId} dateRangeDays={state.dateRangeDays} brandLocations={brandLocations} />}
        </>
      )}

      <ReportsPolicyFooter activeSource={activeSource} />
    </div>
  );
}
