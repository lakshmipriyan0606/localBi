'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { AlertCircle, RefreshCw, Tag, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NiceSelect } from '@/components/ui/nice-select';
import { AnalyticsLoader } from '@/components/ui/analytics-loader';
import { AnalyticsPageShell } from '@/components/analytics/analytics-page-shell';
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
import type { ActiveFilterChip } from '@/components/analytics/filter-bar';

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

  // Active filter chips
  const filterChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (selectedBrand) {
      chips.push({
        id: 'brand',
        label: 'Brand',
        value: selectedBrand.name,
        onRemove: () => {}, // Brand is mandatory; no removal
      });
    }
    if (selectedLocation) {
      chips.push({
        id: 'location',
        label: 'Location',
        value: selectedLocation.name,
        onRemove: () => setLocationId(undefined),
      });
    }
    if (state.comparison !== 'NONE') {
      chips.push({
        id: 'comparison',
        label: 'Comparison',
        value: state.comparison === 'PREVIOUS_PERIOD' ? 'Prior Period' : 'Prior Year',
        onRemove: () => setComparison('NONE'),
      });
    }
    return chips;
  }, [selectedBrand, selectedLocation, state.comparison, setLocationId, setComparison]);

  const handleClearAllChips = () => {
    setLocationId(undefined);
    setComparison('NONE');
  };

  return (
    <AnalyticsPageShell
      title={activeSource === 'gbp' ? 'Local Performance Hub' : 'Search Performance Hub'}
      description={
        activeSource === 'gbp'
          ? 'Google Business Profile reach, customer telephone actions, driving directions, and local interactions.'
          : 'Google Search Console organic keywords, search clicks, impression reach, and rank distribution.'
      }
      breadcrumbs={[
        { label: 'Analytics' },
        {
          label: activeSource === 'gbp' ? 'Google Business Profile' : 'Google Search Console',
          current: true,
        },
      ]}
      status={isConnected ? 'ACTIVE' : 'DISCONNECTED'}
      statusLabel={isConnected ? 'Connected' : 'Not Connected'}
      preset={state.preset}
      startDate={startDate}
      endDate={endDate}
      onPresetChange={setPreset}
      onCustomDateChange={setCustomDates}
      comparison={state.comparison}
      onComparisonChange={setComparison}
      filterChips={filterChips}
      onClearAllChips={filterChips.length > 1 ? handleClearAllChips : undefined}
      isBusy={isDataBusy}
      primaryAction={
        <div className="flex items-center gap-2">
          {/* Source Tabs */}
          <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setTab('overview')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                activeSource === 'gbp'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Google Business Profile
            </button>
            <button
              type="button"
              onClick={() => setTab('gsc')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                activeSource === 'gsc'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Search Console
            </button>
          </div>

          {/* Sync Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSyncWithGoogle}
            disabled={isSyncing || isDataBusy}
            className="text-xs h-8"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 text-indigo-600 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : isDataBusy ? 'Updating...' : 'Sync Google Data'}</span>
          </Button>
        </div>
      }
      filterControls={
        <>
          <NiceSelect
            label="BRAND"
            icon={<Tag className="w-3.5 h-3.5" />}
            options={brands.map((b) => ({ id: b.id, name: b.name }))}
            value={selectedBrandId}
            onChange={setBrandId}
            className="w-auto min-w-[140px]"
          />

          <NiceSelect
            label="LOCATION"
            icon={<MapPin className="w-3.5 h-3.5" />}
            options={[
              { id: '', name: `All Locations (${brandLocations.length})` },
              ...brandLocations.map((l) => ({
                id: l.id,
                name: `${l.name}${l.storeCode ? ` (${l.storeCode})` : ''}`,
              })),
            ]}
            value={state.locationId || ''}
            onChange={setLocationId}
            className="w-auto min-w-[160px]"
          />
        </>
      }
      banner={
        isSummaryError ? (
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
        ) : undefined
      }
    >
      {brands.length === 0 ? (
        <AnalyticsEmptyState
          variant="NO_DATA"
          title="No Brands Registered Yet"
          description={`To view performance reporting, you first need to register at least one client brand under ${tenantName}.`}
          actionText="Create First Brand"
          actionHref={`/client/${tenantSlug}/brands`}
        />
      ) : !isConnected ? (
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
    </AnalyticsPageShell>
  );
}
