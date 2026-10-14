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
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
  FileText,
  ExternalLink,
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
      header: "Location & Address",
      sortable: true,
      render: (row) => (
        <div className="flex items-start gap-2.5">
          <MapPin className="h-4 w-4 text-teal-600 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <Link
              href={`/client/${tenantSlug}/locations/${row.locationId}`}
              className="font-semibold text-slate-900 hover:text-teal-700 hover:underline flex items-center gap-1 group cursor-pointer truncate"
            >
              <span className="truncate">{row.locationName}</span>
              <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </Link>
            <p className="text-[11px] text-slate-500 truncate">
              {row.addressLine1 ? `${row.addressLine1}, ` : ""}
              {row.city}
              {row.state ? `, ${row.state}` : ""}
              {row.storeCode ? ` • ${row.storeCode}` : ""}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "isMapped",
      header: "GBP Status",
      sortable: true,
      render: (row) => {
        if (!row.isMapped) {
          return (
            <div className="flex flex-col gap-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 w-fit">
                <AlertTriangle className="h-3 w-3 text-amber-600" />
                Unmapped
              </span>
              <Link
                href={`/client/${tenantSlug}/integrations`}
                className="text-[10px] text-indigo-600 hover:underline flex items-center gap-0.5"
              >
                <span>Map in Integrations</span>
                <ExternalLink className="h-2.5 w-2.5" />
              </Link>
            </div>
          );
        }

        const isSyncError = row.gbpSyncStatus === "ERROR";
        const isSyncing = row.gbpSyncStatus === "SYNCING";

        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                Mapped
              </span>
              {isSyncError ? (
                <span className="text-[10px] font-medium text-rose-600" title={row.syncError || "Sync error"}>
                  Sync Error
                </span>
              ) : isSyncing ? (
                <span className="text-[10px] font-medium text-blue-600 flex items-center gap-1">
                  <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                  Syncing
                </span>
              ) : (
                <span className="text-[10px] text-slate-400">
                  {row.lastSyncedAt
                    ? `Synced ${new Date(row.lastSyncedAt).toLocaleDateString()}`
                    : "Ready"}
                </span>
              )}
            </div>
            {row.googleResourceName && (
              <span className="text-[10px] text-slate-400 truncate max-w-[140px]" title={row.googleResourceName}>
                {row.googleResourceName}
              </span>
            )}
          </div>
        );
      },
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
      header: "Directions",
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
    {
      key: "locationId",
      header: "Quick Links",
      sortable: false,
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <Link
            href={`/client/${tenantSlug}/reports/gbp/reviews?locationId=${row.locationId}&brandId=${selectedBrandId}`}
            className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
            title="View Reviews for this location"
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </Link>
          <Link
            href={`/client/${tenantSlug}/reports/gbp/posts?locationId=${row.locationId}&brandId=${selectedBrandId}`}
            className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
            title="Manage Posts for this location"
          >
            <FileText className="h-3.5 w-3.5" />
          </Link>
        </div>
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
            {
              label: "Google Business Profile",
              href: `/client/${tenantSlug}/reports?tab=gbp`,
            },
            { label: "Location Performance", current: true },
          ]}
          title="Location Performance"
          description="Multi-location impressions and conversion actions across Search and Maps."
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
    </>
  );
}
