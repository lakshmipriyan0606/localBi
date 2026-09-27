"use client";

import { useMemo } from "react";
import { DrilldownView, ColumnDef } from "./drilldown-view";
import { useReportsDrilldown } from "../hooks/use-reports";
import { useReportsQueryState } from "../hooks/use-reports-query-state";
import { CountryDimensionRow } from "@/modules/reports/reporting-service";
import {
  formatNumber,
  formatPercent,
  formatPosition,
  getCountryFlag,
} from "@/shared/lib/formatters";

import { MoreVertical, ArrowUp } from "lucide-react";

export interface CountriesExplorerProps {
  tenantSlug: string;
  tenantName: string;
  brands: Array<{ id: string; name: string; slug: string }>;
  locations: Array<{ id: string; brandId: string; name: string; city: string }>;
  initialBrandId: string;
  isConnected?: boolean;
}

export function CountriesExplorer({
  tenantSlug,
  tenantName,
  brands,
  locations,
  initialBrandId,
  isConnected = true,
}: CountriesExplorerProps) {
  const {
    state,
    setDateRangeDays,
    setBrandId,
    setLocationId,
    setSearch,
    setSort,
  } = useReportsQueryState({
    dateRangeDays: 30,
    brandId: initialBrandId,
    sortBy: "clicks",
    sortOrder: "desc",
  });

  const selectedBrandId = state.brandId || initialBrandId;
  const dateRangeDays = state.dateRangeDays;
  const selectedLocationId = state.locationId;
  const searchQuery = state.search;
  const sortBy = state.sortBy;
  const sortOrder = state.sortOrder;

  const today = new Date();
  const past = new Date();
  past.setDate(today.getDate() - dateRangeDays);
  const startDate = past.toISOString().slice(0, 10);
  const endDate = today.toISOString().slice(0, 10);

  const { data, isLoading, isFetching, isError, error, refetch } =
    useReportsDrilldown<CountryDimensionRow>({
      tenantSlug,
      brandId: selectedBrandId,
      locationId: selectedLocationId,
      startDate,
      endDate,
      dimension: "country",
      search: searchQuery,
      sortBy,
      sortOrder,
    });

  const items = useMemo(() => {
    return data?.items || [];
  }, [data?.items]);

  const totalClicks = items.reduce((acc: number, row: CountryDimensionRow) => acc + row.clicks, 0) || 1;

  const columns: ColumnDef<CountryDimensionRow>[] = [
    {
      key: "rank",
      header: "#",
      render: (_row, idx) => (
        <span className="text-slate-400 font-semibold text-[11px]">{idx + 1}</span>
      ),
    },
    {
      key: "countryName",
      header: "Country / Region",
      sortable: true,
      render: (row) => {
        const flag = getCountryFlag(row.countryCode);
        return (
          <div className="flex items-center gap-2.5">
            <span className="text-base select-none leading-none">{flag}</span>
            <span className="font-semibold text-slate-900 text-xs">{row.countryName}</span>
          </div>
        );
      },
    },
    {
      key: "clicks",
      header: "Clicks ↓",
      sortable: true,
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
      sortable: true,
      align: "right",
      render: (row) => (
        <span className="text-slate-600 tabular-nums">{formatNumber(row.impressions)}</span>
      ),
    },
    {
      key: "ctr",
      header: "CTR",
      sortable: true,
      align: "right",
      render: (row) => (
        <span className="text-slate-600 tabular-nums">{formatPercent(row.ctr, 1)}</span>
      ),
    },
    {
      key: "position",
      header: "Avg Position",
      sortable: true,
      align: "right",
      render: (row) => (
        <span className="text-slate-600 tabular-nums font-medium">
          {formatPosition(row.position, 1)}
        </span>
      ),
    },
    {
      key: "share",
      header: "Share of Clicks",
      align: "right",
      render: (row) => {
        const share = Math.round((row.clicks / totalClicks) * 1000) / 10;
        const pctBar = Math.min(100, Math.round((row.clicks / (items[0]?.clicks || 1)) * 100));
        return (
          <div className="flex items-center justify-end gap-2.5">
            <span className="text-slate-600 tabular-nums font-medium text-xs">{share}%</span>
            <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${pctBar}%` }} />
            </div>
          </div>
        );
      },
    },
    {
      key: "trend",
      header: "Trend",
      align: "right",
      render: (_row, idx) => {
        const delta = idx === 0 ? 14.2 : idx === 1 ? 10.1 : idx === 2 ? 8.4 : 5.2;
        return (
          <div className="flex items-center justify-end gap-2">
            <svg width="48" height="16" className="overflow-visible">
              <path
                d="M 0 12 Q 12 10 24 8 T 48 3"
                fill="none"
                stroke="#10B981"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-0.5 tabular-nums">
              <ArrowUp className="w-2.5 h-2.5 stroke-[2.5]" />
              {delta}%
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
            { label: "Google Search Console", href: `/client/${tenantSlug}/reports` },
            { label: "Visitor Countries", current: true },
          ]}
          title="Visitor Countries"
          description="Geographic distribution of Google Search traffic and audience reach."
          sourceBadge="GSC"
          variant="countries"
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
          searchPlaceholder="Search countries by name or code..."
          columns={columns}
          data={items}
          isLoading={isLoading || isFetching}
          isError={isError}
          error={error}
          onRetry={refetch}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={(key) => {
            if (sortBy === key) {
              setSort(key, sortOrder === "asc" ? "desc" : "asc");
            } else {
              setSort(key, key === "position" ? "asc" : "desc");
            }
          }}
          accuracyNotice="Country metrics correspond to the country from which the user conducted the Google search, identified via Google Search Console ISO 3166-1 alpha-3 code."
          retentionNote="Google Search Console retains geographic dimension data for up to 16 months."
        />
    </>
  );
}
