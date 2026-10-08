'use client';

import { useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnalyticsLoader } from '@/components/ui/analytics-loader';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { PageHeader } from '@/components/layout/page-header';
import { SourceStatusBadge } from './source-status-badge';
import { ReportsHeaderControls } from './reports-header-controls';
import { AnalyticsEmptyState } from '@/components/analytics/analytics-empty-state';
import { DimensionBreakdown } from './dimension-breakdown';
import { ReportsGbpSection } from './reports-gbp-section';
import { ReportsGscSection } from './reports-gsc-section';
import { ReportsGbpQuickLinks } from './reports-gbp-quick-links';
import { ReportsPolicyFooter } from './reports-policy-footer';
import {
  usePerformanceSummary,
  usePerformanceTimeseries,
  usePerformanceDimensions,
} from '../hooks/use-reports';
import { useReportsQueryState } from '../hooks/use-reports-query-state';
import { notify } from '@/lib/notify';
import { browserClient } from '@/lib/http/browser-client';
import { DateRangeService } from '@/shared/analytics/date-range';

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

export function ReportsDashboard({
  tenantSlug,
  tenantName,
  brands,
  locations,
  initialBrandId,
  isGbpConnected = true,
  isGscConnected = true,
}: ReportsDashboardProps) {
  const {
    state,
    setPreset,
    setCustomDates,
    setDateRangeDays,
    setComparison,
    setBrandId,
    setLocationId,
    setTab,
  } = useReportsQueryState({
    dateRangeDays: 30,
    preset: 'LAST_30_DAYS',
    comparison: 'NONE',
    brandId: initialBrandId,
  });

  const [activeGscMetrics, setActiveGscMetrics] = useState<string[]>([
    'clicks',
    'impressions',
    'ctr',
    'position',
  ]);

  const activeSource: 'gbp' | 'gsc' = state.tab === 'gsc' ? 'gsc' : 'gbp';
  const selectedBrandId = state.brandId || initialBrandId;
  const brandLocations = useMemo(
    () => locations.filter((l) => l.brandId === selectedBrandId),
    [locations, selectedBrandId]
  );

  // Clear location filter if location does not belong to active brand
  useEffect(() => {
    if (state.locationId && !brandLocations.some((l) => l.id === state.locationId)) {
      setLocationId(undefined);
    }
  }, [selectedBrandId, brandLocations, state.locationId, setLocationId]);

  // Timezone-aware date resolution via canonical DateRangeService
  const resolvedRange = useMemo(() => {
    return DateRangeService.resolveDateRange({
      preset: state.preset,
      customStart: state.startDate,
      customEnd: state.endDate,
    });
  }, [state.preset, state.startDate, state.endDate]);

  const startDate = resolvedRange.startDate;
  const endDate = resolvedRange.endDate;

  const queryParams = {
    tenantSlug,
    brandId: selectedBrandId,
    locationId: state.locationId || undefined,
    startDate,
    endDate,
    comparison: state.comparison,
  };

  const {
    data: summary,
    isLoading: isSummaryLoading,
    isFetching: isSummaryFetching,
    isError: isSummaryError,
    error: summaryError,
    refetch: refetchSummary,
  } = usePerformanceSummary(queryParams);

  const {
    data: timeseries = [],
    isLoading: isTimeseriesLoading,
    isFetching: isTimeseriesFetching,
    refetch: refetchTimeseries,
  } = usePerformanceTimeseries(queryParams);

  const {
    data: dimensions,
    isLoading: isDimensionsLoading,
    isFetching: isDimensionsFetching,
    refetch: refetchDimensions,
  } = usePerformanceDimensions(queryParams);

  const [isSyncing, setIsSyncing] = useState(false);
  const handleSyncWithGoogle = async () => {
    setIsSyncing(true);
    try {
      const res = await browserClient.post<{ success: boolean; message: string }>(
        `/tenants/${tenantSlug}/sync`,
        { provider: activeSource === 'gbp' ? 'GBP' : 'GSC' },
        { timeout: 120000 }
      );
      if (res.data?.success) {
        notify.success(res.data.message || 'Synced successfully with Google!');
        refetchSummary();
        refetchTimeseries();
        refetchDimensions();
      }
    } catch (err: unknown) {
      notify.error((err as Error).message || 'Failed to sync with Google');
    } finally {
      setIsSyncing(false);
    }
  };

  const isDataBusy = isSummaryLoading || isSummaryFetching || isSyncing;
  const isConnected = activeSource === 'gbp' ? isGbpConnected : isGscConnected;
  const selectedBrand = brands.find((b) => b.id === selectedBrandId);
  const selectedLocation = locations.find((l) => l.id === state.locationId);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      <Breadcrumbs
        items={[
          {
            label: activeSource === 'gbp' ? 'Google Business Profile' : 'Google Search Console',
            current: true,
          },
        ]}
        tenantSlug={tenantSlug}
      />
      <PageHeader
        title={activeSource === 'gbp' ? 'Performance Hub' : 'Search Performance'}
        description={
          activeSource === 'gbp'
            ? 'Local search reach, customer actions, and storefront performance.'
            : 'Organic search visibility, queries, and landing page reach.'
        }
        badge={
          <SourceStatusBadge
            connections={[
              {
                provider: activeSource === 'gbp' ? 'GBP' : 'GSC',
                state: (activeSource === 'gbp' ? isGbpConnected : isGscConnected)
                  ? 'connected'
                  : 'disconnected',
                lastSyncedAt: null,
              },
            ]}
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
            onSync={handleSyncWithGoogle}
            isSyncing={isSyncing}
          />
        }
      />

      {isSummaryError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-rose-800 shadow-2xs">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-500" />
            <div>
              <p className="text-xs font-bold">Failed to stream performance metrics</p>
              <p className="text-[11px] text-rose-600 mt-0.5">
                {(summaryError as Error)?.message || 'An error occurred while streaming performance data.'}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetchSummary()}
            className="border-rose-300 text-rose-800 hover:bg-rose-100 flex-shrink-0 text-xs"
          >
            Retry
          </Button>
        </div>
      )}

      {brands.length === 0 ? (
        <AnalyticsEmptyState
          variant="NO_DATA"
          title="No Brands Registered Yet"
          description={`To view performance reporting, you first need to register at least one client brand under ${tenantName}.`}
          actionText="Create First Brand"
          actionHref={`/client/${tenantSlug}/brands`}
        />
      ) : !(activeSource === 'gbp' ? isGbpConnected : isGscConnected) ? (
        <AnalyticsEmptyState
          variant="NOT_CONNECTED"
          title={
            activeSource === 'gbp'
              ? 'Google Business Profile Not Linked'
              : 'Google Search Console Not Linked'
          }
          description="You need to link a verified Google property to this brand to view real-time performance analytics and reports."
          actionText="Manage Connections"
          actionHref={`/client/${tenantSlug}/integrations`}
        />
      ) : (
        <>
          {/* Primary KPI Section */}
          {activeSource === 'gsc' && (
            <ReportsGscSection
              summary={summary}
              isLoading={isDataBusy}
              tenantSlug={tenantSlug}
              selectedBrandId={selectedBrandId}
              dateRangeDays={state.dateRangeDays}
              startDate={startDate}
              endDate={endDate}
              activeMetrics={activeGscMetrics}
              onToggleMetric={(metric) => {
                setActiveGscMetrics((prev) =>
                  prev.includes(metric)
                    ? prev.filter((m) => m !== metric)
                    : [...prev, metric]
                );
              }}
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

          {/* Timeseries Trend Visualization */}
          <TrendChartPanel
            data={timeseries}
            isLoading={isTimeseriesLoading || isTimeseriesFetching}
            startDate={startDate}
            endDate={endDate}
            dateRangeDays={state.dateRangeDays}
            source={activeSource}
            activeGscMetrics={activeGscMetrics}
          />

          {/* Dimension Breakdowns & Quick Links */}
          {activeSource === 'gsc' && (
            <DimensionBreakdown
              queries={dimensions?.queries || []}
              pages={dimensions?.pages || []}
              devices={dimensions?.devices || []}
              isLoading={isDimensionsLoading || isDimensionsFetching}
            />
          )}

          {activeSource === 'gbp' && (
            <ReportsGbpQuickLinks
              tenantSlug={tenantSlug}
              selectedBrandId={selectedBrandId}
              dateRangeDays={state.dateRangeDays}
              brandLocations={brandLocations}
            />
          )}
        </>
      )}

      <ReportsPolicyFooter activeSource={activeSource} />
    </div>
  );
}
