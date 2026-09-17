'use client';

import { DrilldownView, ColumnDef } from './drilldown-view';
import { useReportsDrilldown } from '../hooks/use-reports';
import { useReportsQueryState } from '../hooks/use-reports-query-state';
import { DeviceDimensionRow } from '@/modules/reports/reporting-service';
import { formatNumber, formatPercent } from '@/shared/lib/formatters';
import { Smartphone, Monitor, Tablet } from 'lucide-react';

export interface DevicesExplorerProps {
  tenantSlug: string;
  tenantName: string;
  brands: Array<{ id: string; name: string; slug: string }>;
  locations: Array<{ id: string; brandId: string; name: string; city: string }>;
  initialBrandId: string;
}

export function DevicesExplorer({
  tenantSlug,
  tenantName,
  brands,
  locations,
  initialBrandId,
}: DevicesExplorerProps) {
  const {
    state,
    setDateRangeDays,
    setBrandId,
    setLocationId,
    setSearch,
  } = useReportsQueryState({
    dateRangeDays: 30,
    brandId: initialBrandId,
    sortBy: 'clicks',
    sortOrder: 'desc',
  });

  const selectedBrandId = state.brandId || initialBrandId;
  const dateRangeDays = state.dateRangeDays;
  const selectedLocationId = state.locationId;
  const searchQuery = state.search;

  const today = new Date();
  const past = new Date();
  past.setDate(today.getDate() - dateRangeDays);
  const startDate = past.toISOString().slice(0, 10);
  const endDate = today.toISOString().slice(0, 10);

  const { data, isLoading, isFetching, isError, error, refetch } = useReportsDrilldown<DeviceDimensionRow>({
    tenantSlug,
    brandId: selectedBrandId,
    locationId: selectedLocationId,
    startDate,
    endDate,
    dimension: 'device',
    search: searchQuery,
  });

  const totalClicks = data?.items?.reduce((acc, row) => acc + row.clicks, 0) || 1;

  const columns: ColumnDef<DeviceDimensionRow>[] = [
    {
      key: 'device',
      header: 'Device Category',
      render: (row) => {
        const dev = row.device.toUpperCase();
        return (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              {dev === 'MOBILE' ? (
                <Smartphone className="h-4 w-4" />
              ) : dev === 'DESKTOP' ? (
                <Monitor className="h-4 w-4" />
              ) : (
                <Tablet className="h-4 w-4" />
              )}
            </div>
            <div>
              <p className="font-semibold text-slate-900 capitalize">{row.device.toLowerCase()}</p>
              <div className="w-24 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                <div
                  className="bg-indigo-600 h-1.5 rounded-full"
                  style={{ width: `${Math.min(100, Math.round((row.clicks / totalClicks) * 100))}%` }}
                />
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'clicks',
      header: 'Clicks',
      align: 'right',
      render: (row) => (
        <div>
          <span className="font-semibold text-slate-900">{formatNumber(row.clicks)}</span>
          <span className="text-[11px] text-slate-400 block tabular-nums">
            {formatPercent(row.clicks / totalClicks, 1)} share
          </span>
        </div>
      ),
    },
    {
      key: 'impressions',
      header: 'Impressions',
      align: 'right',
      render: (row) => (
        <span className="text-slate-600">{formatNumber(row.impressions)}</span>
      ),
    },
    {
      key: 'ctr',
      header: 'CTR',
      align: 'right',
      render: (row) => (
        <span className="text-slate-600">{formatPercent(row.ctr, 2)}</span>
      ),
    },
  ];

  return (
    <DrilldownView
      tenantSlug={tenantSlug}
      tenantName={tenantName}
      breadcrumbs={[
        { label: 'Reports', href: `/t/${tenantSlug}/reports` },
        { label: 'Search Console', href: `/t/${tenantSlug}/reports` },
        { label: 'Devices', current: true },
      ]}
      title="Device Platform Analytics"
      description="Compare organic search performance across Mobile smartphones, Desktop computers, and Tablet devices."
      sourceBadge="GSC"
      brands={brands}
      locations={locations}
      selectedBrandId={selectedBrandId}
      onBrandChange={setBrandId}
      selectedLocationId={selectedLocationId}
      onLocationChange={setLocationId}
      dateRangeDays={dateRangeDays}
      onDateRangeChange={setDateRangeDays}
      searchQuery={searchQuery}
      onSearchChange={setSearch}
      searchPlaceholder="Filter devices..."
      columns={columns}
      data={data?.items}
      isLoading={isLoading || isFetching}
      isError={isError}
      error={error}
      onRetry={refetch}
      accuracyNotice="Device metrics categorize user hardware reported by Google Search Console. Mobile optimization is critical for local searches where over 70% of local queries originate on mobile smartphones."
      retentionNote="Google Search Console retains device dimension reporting for up to 16 months."
    />
  );
}
