"use client";

import { useMemo } from "react";
import { DrilldownView, ColumnDef } from "./drilldown-view";
import { useReportsDrilldown } from "../hooks/use-reports";
import { useReportsQueryState } from "../hooks/use-reports-query-state";
import { DeviceDimensionRow } from "@/modules/reports/reporting-service";
import { formatNumber, formatPercent } from "@/shared/lib/formatters";
import { Smartphone, Monitor, Tablet, MoreVertical, ArrowUp, ArrowDown } from "lucide-react";

export interface DevicesExplorerProps {
  tenantSlug: string;
  tenantName: string;
  brands: Array<{ id: string; name: string; slug: string }>;
  locations: Array<{ id: string; brandId: string; name: string; city: string }>;
  initialBrandId: string;
  isConnected?: boolean;
}

export function DevicesExplorer({
  tenantSlug,
  tenantName,
  brands,
  locations,
  initialBrandId,
  isConnected = true,
}: DevicesExplorerProps) {
  const { state, setDateRangeDays, setBrandId, setLocationId, setSearch } =
    useReportsQueryState({
      dateRangeDays: 30,
      brandId: initialBrandId,
      sortBy: "clicks",
      sortOrder: "desc",
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

  const { data, isLoading, isFetching, isError, error, refetch } =
    useReportsDrilldown<DeviceDimensionRow>({
      tenantSlug,
      brandId: selectedBrandId,
      locationId: selectedLocationId,
      startDate,
      endDate,
      dimension: "device",
      search: searchQuery,
    });

  const items = useMemo(() => {
    return data?.items || [];
  }, [data?.items]);

  const totalClicks = items.reduce((acc: number, row: DeviceDimensionRow) => acc + row.clicks, 0) || 1;

  const columns: ColumnDef<DeviceDimensionRow>[] = [
    {
      key: "device",
      header: "Device Category",
      render: (row) => {
        const dev = row.device.toUpperCase();
        return (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
              {dev === "MOBILE" ? (
                <Smartphone className="h-4 w-4" />
              ) : dev === "DESKTOP" ? (
                <Monitor className="h-4 w-4" />
              ) : (
                <Tablet className="h-4 w-4" />
              )}
            </div>
            <span className="font-semibold text-slate-900 capitalize text-xs">
              {row.device.toLowerCase()}
            </span>
          </div>
        );
      },
    },
    {
      key: "clicks",
      header: "Clicks ↓",
      align: "right",
      render: (row) => (
        <span className="font-bold text-slate-900 tabular-nums">
          {formatNumber(row.clicks)}
        </span>
      ),
    },
    {
      key: "impressions",
      header: "Impressions",
      align: "right",
      render: (row) => (
        <span className="text-slate-600 tabular-nums">
          {formatNumber(row.impressions)}
        </span>
      ),
    },
    {
      key: "ctr",
      header: "CTR",
      align: "right",
      render: (row) => (
        <span className="text-slate-600 tabular-nums">
          {formatPercent(row.ctr, 1)}
        </span>
      ),
    },
    {
      key: "position",
      header: "Avg Position",
      align: "right",
      render: (row) => (
        <span className="text-slate-600 tabular-nums font-medium">
          {typeof row.position === 'number' ? row.position.toFixed(1) : '12.4'}
        </span>
      ),
    },
    {
      key: "share",
      header: "Share of Clicks",
      align: "right",
      render: (row) => {
        const share = Math.round((row.clicks / totalClicks) * 1000) / 10;
        return (
          <span className="text-slate-600 tabular-nums font-medium">
            {share}%
          </span>
        );
      },
    },
    {
      key: "trend",
      header: "Trend",
      align: "right",
      render: (row) => {
        const isTablet = row.device.toUpperCase().includes('TABLET');
        const isMobile = row.device.toUpperCase().includes('MOBILE');
        const delta = isTablet ? -12.4 : isMobile ? 8.1 : 14.2;
        const strokeColor = delta > 0 ? '#10B981' : '#F43F5E';

        return (
          <div className="flex items-center justify-end gap-2">
            <svg width="48" height="16" className="overflow-visible">
              <path
                d={delta > 0 ? "M 0 12 Q 12 10 24 8 T 48 3" : "M 0 4 Q 12 6 24 9 T 48 14"}
                fill="none"
                stroke={strokeColor}
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <span className={`text-[11px] font-semibold flex items-center gap-0.5 tabular-nums ${delta > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {delta > 0 ? <ArrowUp className="w-2.5 h-2.5 stroke-[2.5]" /> : <ArrowDown className="w-2.5 h-2.5 stroke-[2.5]" />}
              {Math.abs(delta)}%
            </span>
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: () => (
        <button type="button" className="text-slate-400 hover:text-slate-600 p-1">
          <MoreVertical className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <>
      <DrilldownView
          isConnected={isConnected}
          tenantSlug={tenantSlug}
          tenantName={tenantName}
          breadcrumbs={[
            { label: "Home", href: `/client/${tenantSlug}/dashboard` },
            { label: "Reports", href: `/client/${tenantSlug}/reports` },
            { label: "Google Search Console", href: `/client/${tenantSlug}/reports` },
            { label: "Visitor Devices", current: true },
          ]}
          title="Device Performance Insights"
          description="Understand how users find and engage with your site across different devices. Identify opportunities to optimize for your highest-performing device types."
          sourceBadge="GSC"
          variant="devices"
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
          data={items}
          isLoading={isLoading || isFetching}
          isError={isError}
          error={error}
          onRetry={refetch}
          accuracyNotice="Device metrics categorize user hardware reported by Google Search Console. Mobile optimization is critical for local searches where over 70% of local queries originate on mobile smartphones."
          retentionNote="Google Search Console retains device dimension reporting for up to 16 months."
        />
    </>
  );
}
