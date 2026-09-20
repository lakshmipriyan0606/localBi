"use client";

import { useState } from "react";
import { DrilldownView, ColumnDef } from "./drilldown-view";
import { useReportsDrilldown } from "../hooks/use-reports";
import { useReportsQueryState } from "../hooks/use-reports-query-state";
import { PageDimensionRow } from "@/modules/reports/reporting-service";
import {
  formatNumber,
  formatPercent,
  formatPosition,
} from "@/shared/lib/formatters";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

export interface PagesExplorerProps {
  tenantSlug: string;
  tenantName: string;
  brands: Array<{ id: string; name: string; slug: string }>;
  locations: Array<{ id: string; brandId: string; name: string; city: string }>;
  initialBrandId: string;
  isConnected?: boolean;
}

export function PagesExplorer({
  tenantSlug,
  tenantName,
  brands,
  locations,
  initialBrandId,
  isConnected = true,
}: PagesExplorerProps) {
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

  const [selectedPageRow, setSelectedPageRow] =
    useState<PageDimensionRow | null>(null);

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
    useReportsDrilldown<PageDimensionRow>({
      tenantSlug,
      brandId: selectedBrandId,
      locationId: selectedLocationId,
      startDate,
      endDate,
      dimension: "page",
      search: searchQuery,
      sortBy,
      sortOrder,
    });

  const columns: ColumnDef<PageDimensionRow>[] = [
    {
      key: "fullUrl",
      header: "Landing Page URL",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2 max-w-[480px]">
          <button
            type="button"
            onClick={() => setSelectedPageRow(row)}
            className="text-left font-mono text-xs text-indigo-700 hover:text-indigo-900 hover:underline truncate cursor-pointer"
            title={row.fullUrl}
          >
            {row.fullUrl}
          </button>
          <a
            href={row.fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-slate-700 flex-shrink-0"
            title="Open page in new tab"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
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
            { label: "Search Console", href: `/t/${tenantSlug}/reports` },
            { label: "Pages", current: true },
          ]}
          title="Landing Pages Explorer"
          description="Review Google Search traffic distributed across individual website URLs and content sections."
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
          searchPlaceholder="Filter pages by URL path..."
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
          accuracyNotice="Page performance metrics aggregate organic search data where this specific URL was presented as the landing link in Google Search results. External page links open in a new tab with noopener protection."
          retentionNote="Google Search Console retains page-level reporting for up to 16 months."
        />
      )}

      {/* Page Detail Modal */}
      {selectedPageRow && (
        <Dialog
          open={Boolean(selectedPageRow)}
          onOpenChange={() => setSelectedPageRow(null)}
        >
          <DialogContent className="max-w-md bg-white rounded-2xl p-6">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">
                  Page Analytics
                </Badge>
                <span className="text-xs text-slate-400">
                  {dateRangeDays}d window
                </span>
              </div>
              <DialogTitle className="text-sm font-mono font-bold text-slate-900 break-all">
                {selectedPageRow.fullUrl}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Exact traffic and search appearance statistics for this verified
                landing page.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 py-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] font-medium text-slate-500">
                  Search Clicks
                </span>
                <p className="text-xl font-bold text-slate-900 tabular-nums mt-0.5">
                  {formatNumber(selectedPageRow.clicks)}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] font-medium text-slate-500">
                  Search Impressions
                </span>
                <p className="text-xl font-bold text-slate-900 tabular-nums mt-0.5">
                  {formatNumber(selectedPageRow.impressions)}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] font-medium text-slate-500">
                  Average CTR
                </span>
                <p className="text-xl font-bold text-slate-900 tabular-nums mt-0.5">
                  {formatPercent(selectedPageRow.ctr, 2)}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] font-medium text-slate-500">
                  Average Position
                </span>
                <p className="text-xl font-bold text-indigo-700 tabular-nums mt-0.5">
                  {formatPosition(selectedPageRow.position, 1)}
                </p>
              </div>
            </div>

            <div className="pt-2">
              <a
                href={selectedPageRow.fullUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
              >
                <span>Visit Live Page</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
