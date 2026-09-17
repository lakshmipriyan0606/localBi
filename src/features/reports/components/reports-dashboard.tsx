'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { PageHeader } from '@/components/layout/page-header';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { AnalyticsLoader } from '@/components/ui/analytics-loader';
import { SourceStatusBadge } from './source-status-badge';
import { DimensionBreakdown } from './dimension-breakdown';
import { ReportsHeaderControls } from './reports-header-controls';
import { ReportsSourceTabs } from './reports-source-tabs';
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
  const { state, setDateRangeDays, setBrandId, setLocationId, setTab } = useReportsQueryState({
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
  const { data: summary, isLoading: isSummaryLoading, isFetching } = usePerformanceSummary(queryParams);
  const { data: timeseries = [], isLoading: isTimeseriesLoading } = usePerformanceTimeseries(queryParams);
  const { data: dimensions, isLoading: isDimensionsLoading } = usePerformanceDimensions(queryParams);

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
            isFetching={isFetching}
          />
        }
      />
      <ReportsSourceTabs activeSource={activeSource} onSelectTab={setTab} tenantSlug={tenantSlug} />

      {activeSource === 'gsc' && (
        <ReportsGscSection
          summary={summary}
          isLoading={isSummaryLoading}
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
          isLoading={isSummaryLoading}
          tenantSlug={tenantSlug}
          selectedBrandId={selectedBrandId}
          dateRangeDays={state.dateRangeDays}
        />
      )}

      <TrendChartPanel data={timeseries} isLoading={isTimeseriesLoading} startDate={startDate} endDate={endDate} dateRangeDays={state.dateRangeDays} source={activeSource} />

      {activeSource === 'gsc' && <DimensionBreakdown queries={dimensions?.queries || []} pages={dimensions?.pages || []} devices={dimensions?.devices || []} isLoading={isDimensionsLoading} />}
      {activeSource === 'gbp' && <ReportsGbpQuickLinks tenantSlug={tenantSlug} selectedBrandId={selectedBrandId} dateRangeDays={state.dateRangeDays} brandLocations={brandLocations} />}
      <ReportsPolicyFooter activeSource={activeSource} />
    </div>
  );
}
