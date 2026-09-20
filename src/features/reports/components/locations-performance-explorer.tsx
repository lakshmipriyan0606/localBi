"use client";

import Link from "next/link";
import { DrilldownView, ColumnDef } from "./drilldown-view";
import { useReportsDrilldown } from "../hooks/use-reports";
import { useReportsQueryState } from "../hooks/use-reports-query-state";
import { GbpLocationBreakdownRow } from "@/modules/reports/reporting-service";
import { formatNumber } from "@/shared/lib/formatters";
import {
  MapPin,
  PhoneCall,
  Globe,
  Navigation,
  ArrowUpRight,
} from "lucide-react";

export interface LocationsPerformanceExplorerProps {
  tenantSlug: string;
  tenantName: string;
  brands: Array<{ id: string; name: string; slug: string }>;
  locations: Array<{ id: string; brandId: string; name: string; city: string }>;
  initialBrandId: string;
  isConnected?: boolean;
}

export function LocationsPerformanceExplorer({
  tenantSlug,
  tenantName,
  brands,
  locations,
  initialBrandId,
  isConnected = true,
}: LocationsPerformanceExplorerProps) {
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
    sortBy: "totalViews",
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
    useReportsDrilldown<GbpLocationBreakdownRow>({
      tenantSlug,
      brandId: selectedBrandId,
      locationId: selectedLocationId,
      startDate,
      endDate,
      dimension: "location",
      search: searchQuery,
      sortBy,
      sortOrder,
    });

  const columns: ColumnDef<GbpLocationBreakdownRow>[] = [
    {
      key: "locationName",
      header: "Location",
      sortable: true,
      render: (row) => (
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-teal-600 flex-shrink-0 mt-0.5" />
          <div>
            <Link
              href={`/t/${tenantSlug}/locations/${row.locationId}`}
              className="font-semibold text-slate-900 hover:text-teal-700 hover:underline flex items-center gap-1 group cursor-pointer"
            >
              <span>{row.locationName}</span>
              <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            <p className="text-[11px] text-slate-400">
              {row.city} {row.storeCode ? `• ${row.storeCode}` : ""}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "totalViews",
      header: "Total Views",
      sortable: true,
      align: "right",
      render: (row) => (
        <span className="font-bold text-slate-900">
          {formatNumber(row.totalViews)}
        </span>
      ),
    },
    {
      key: "searchViews",
      header: "Search Views",
      sortable: true,
      align: "right",
      render: (row) => (
        <span className="text-slate-600">{formatNumber(row.searchViews)}</span>
      ),
    },
    {
      key: "mapsViews",
      header: "Maps Views",
      sortable: true,
      align: "right",
      render: (row) => (
        <span className="text-slate-600">{formatNumber(row.mapsViews)}</span>
      ),
    },
    {
      key: "callClicks",
      header: "Call Clicks",
      sortable: true,
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1 text-slate-700">
          <PhoneCall className="h-3 w-3 text-slate-400" />
          <span className="font-medium tabular-nums">
            {formatNumber(row.callClicks)}
          </span>
        </div>
      ),
    },
    {
      key: "websiteClicks",
      header: "Website Clicks",
      sortable: true,
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1 text-slate-700">
          <Globe className="h-3 w-3 text-slate-400" />
          <span className="font-medium tabular-nums">
            {formatNumber(row.websiteClicks)}
          </span>
        </div>
      ),
    },
    {
      key: "directionRequests",
      header: "Direction Requests",
      sortable: true,
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1 text-slate-700">
          <Navigation className="h-3 w-3 text-slate-400" />
          <span className="font-medium tabular-nums">
            {formatNumber(row.directionRequests)}
          </span>
        </div>
      ),
    },
  ];

  return (
    <>
      {!isConnected ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-slate-200 border-dashed rounded-2xl bg-slate-50/50 mt-6">
          <div className="w-12 h-12 bg-slate-200 text-slate-500 rounded-full flex items-center justify-center mb-4">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            Google Account Not Connected
          </h3>
          <p className="text-sm text-slate-500 mb-6 max-w-md">
            You need to connect your Google account to view real-time
            performance analytics and reports.
          </p>
          <a
            href={`/t/${tenantSlug}/integrations`}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50 bg-indigo-600 text-slate-50 shadow hover:bg-indigo-600/90 h-9 px-4 py-2"
          >
            Connect Google Account
          </a>
        </div>
      ) : (
        <DrilldownView
          tenantSlug={tenantSlug}
          tenantName={tenantName}
          breadcrumbs={[
            { label: "Reports", href: `/t/${tenantSlug}/reports` },
            {
              label: "Business Profile",
              href: `/t/${tenantSlug}/reports?tab=gbp`,
            },
            { label: "Location Matrix", current: true },
          ]}
          title="Location Matrix"
          description="Compare multi-location impressions across Google Search and Maps, plus consumer conversion actions."
          sourceBadge="GBP"
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
          searchPlaceholder="Filter locations by name or city..."
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
              setSort(key, "desc");
            }
          }}
          accuracyNotice="Metric definitions strictly adhere to Google Business Profile API policies: Call Clicks reflect 'Call' button taps on the profile (not completed phone conversations); Website Clicks represent external link clicks (not confirmed web analytics sessions); Direction Requests measure driving route requests (not confirmed store entries)."
          retentionNote="Google Business Profile daily performance metrics are subject to Google's 30-day reporting policy window."
        />
      )}
    </>
  );
}
