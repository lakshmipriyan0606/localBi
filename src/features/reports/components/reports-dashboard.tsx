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
import { ReportsSubNav } from './reports-sub-nav';
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
}

export function ReportsDashboard({ tenantSlug, tenantName, brands, locations, initialBrandId }: ReportsDashboardProps) {
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
        items={[{ label: 'Reports', href: `/t/${tenantSlug}/reports?tab=${activeSource}` }, { label: activeSource === 'gbp' ? 'Google Business Profile' : 'Google Search Console', current: true }]}
        tenantSlug={tenantSlug}
      />
      <PageHeader
        title={activeSource === 'gbp' ? 'Google Business Profile Performance' : 'Google Search Console Performance'}
        description={`Performance indicators, customer engagement, and search reach for ${tenantName}.`}
        badge={<SourceStatusBadge connections={[{ provider: activeSource === 'gbp' ? 'GBP' : 'GSC', state: 'connected', lastSyncedAt: null }]} />}
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

      <ReportsSubNav activeSource={activeSource} tenantSlug={tenantSlug} selectedBrandId={selectedBrandId} dateRangeDays={state.dateRangeDays} />

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
      <ReportsPolicyFooter activeSource={activeSource} />
    </div>
  );
}
