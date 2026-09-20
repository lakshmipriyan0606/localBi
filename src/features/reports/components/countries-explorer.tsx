"use client";

import { DrilldownView, ColumnDef } from "./drilldown-view";
import { useReportsDrilldown } from "../hooks/use-reports";
import { useReportsQueryState } from "../hooks/use-reports-query-state";
import { CountryDimensionRow } from "@/modules/reports/reporting-service";
import {
  formatNumber,
  formatPercent,
  formatPosition,
} from "@/shared/lib/formatters";

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

  const columns: ColumnDef<CountryDimensionRow>[] = [
    {
      key: "countryName",
      header: "Country / Region",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="h-6 w-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center font-mono text-[10px] font-bold text-slate-700">
            {row.countryCode}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{row.countryName}</p>
            <p className="text-[11px] text-slate-400 font-mono">
              {row.countryCode}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "clicks",
      header: "Clicks",
      sortable: true,
      align: "right",
      render: (row) => (
        <span className="font-semibold text-slate-900">
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
        <span className="text-slate-600">{formatNumber(row.impressions)}</span>
      ),
    },
    {
      key: "ctr",
      header: "CTR",
      sortable: true,
      align: "right",
      render: (row) => (
        <span className="text-slate-600">{formatPercent(row.ctr, 2)}</span>
      ),
    },
    {
      key: "position",
      header: "Avg Position",
      sortable: true,
      align: "right",
      render: (row) => (
        <span
          className={`font-medium ${
            row.position <= 3
              ? "text-emerald-700"
              : row.position <= 10
                ? "text-indigo-700"
                : "text-slate-600"
          }`}
        >
          {formatPosition(row.position, 1)}
        </span>
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
            { label: "Reports", href: `/t/${tenantSlug}/reports` },
            { label: "Search Console", href: `/t/${tenantSlug}/reports` },
            { label: "Countries", current: true },
          ]}
          title="Geographic Search Distribution"
          description="Inspect Google Search clicks and impressions broken down by user geographic country."
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
          searchPlaceholder="Filter countries by name or code..."
          columns={columns}
          data={data?.items}
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
