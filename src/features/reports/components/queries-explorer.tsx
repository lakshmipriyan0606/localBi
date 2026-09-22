"use client";

import { useState } from "react";
import { DrilldownView, ColumnDef } from "./drilldown-view";
import { useReportsDrilldown } from "../hooks/use-reports";
import { useReportsQueryState } from "../hooks/use-reports-query-state";
import { QueryDimensionRow } from "@/modules/reports/reporting-service";
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
import { ArrowUpRight } from "lucide-react";

export interface QueriesExplorerProps {
  tenantSlug: string;
  tenantName: string;
  brands: Array<{ id: string; name: string; slug: string }>;
  locations: Array<{ id: string; brandId: string; name: string; city: string }>;
  initialBrandId: string;
  isConnected?: boolean;
}

export function QueriesExplorer({
  tenantSlug,
  tenantName,
  brands,
  locations,
  initialBrandId,
  isConnected = true,
}: QueriesExplorerProps) {
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

  const [selectedQueryRow, setSelectedQueryRow] =
    useState<QueryDimensionRow | null>(null);

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
    useReportsDrilldown<QueryDimensionRow>({
      tenantSlug,
      brandId: selectedBrandId,
      locationId: selectedLocationId,
      startDate,
      endDate,
      dimension: "query",
      search: searchQuery,
      sortBy,
      sortOrder,
    });

  const columns: ColumnDef<QueryDimensionRow>[] = [
    {
      key: "queryText",
      header: "Search Query",
      sortable: true,
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelectedQueryRow(row)}
          className="text-left font-medium text-indigo-700 hover:text-indigo-900 hover:underline flex items-center gap-1.5 cursor-pointer group"
        >
          <span>{row.queryText}</span>
          <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
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
            { label: "Reports", href: `/client/${tenantSlug}/reports` },
            { label: "Search Console", href: `/client/${tenantSlug}/reports` },
            { label: "Search Queries", current: true },
          ]}
          title="Search Queries Explorer"
          description="Inspect top Google Search organic queries driving impressions and clicks to your brand properties."
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
          searchPlaceholder="Filter queries by keyword..."
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
          accuracyNotice="Query data is retrieved directly from Google Search Console Search Analytics API. Clicks and impressions reflect organic search appearances. Position represents average top ranking on Google search result pages; a lower numeric value indicates a higher position."
          retentionNote="Google Search Console retains search query history for up to 16 months."
        />

      {/* Query Detail Modal */}
      {selectedQueryRow && (
        <Dialog
          open={Boolean(selectedQueryRow)}
          onOpenChange={() => setSelectedQueryRow(null)}
        >
          <DialogContent className="max-w-md bg-white rounded-2xl p-6">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">
                  Search Query Detail
                </Badge>
                <span className="text-xs text-slate-400">
                  {dateRangeDays}d window
                </span>
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900 break-words">
                &ldquo;{selectedQueryRow.queryText}&rdquo;
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Performance metrics for this specific search query across all
                associated website URLs.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 py-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] font-medium text-slate-500">
                  Total Clicks
                </span>
                <p className="text-xl font-bold text-slate-900 tabular-nums mt-0.5">
                  {formatNumber(selectedQueryRow.clicks)}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] font-medium text-slate-500">
                  Impressions
                </span>
                <p className="text-xl font-bold text-slate-900 tabular-nums mt-0.5">
                  {formatNumber(selectedQueryRow.impressions)}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] font-medium text-slate-500">
                  Click-Through Rate
                </span>
                <p className="text-xl font-bold text-slate-900 tabular-nums mt-0.5">
                  {formatPercent(selectedQueryRow.ctr, 2)}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] font-medium text-slate-500">
                  Average Position
                </span>
                <p className="text-xl font-bold text-indigo-700 tabular-nums mt-0.5">
                  {formatPosition(selectedQueryRow.position, 1)}
                </p>
              </div>
            </div>

            <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs text-indigo-900 space-y-1">
              <span className="font-semibold">Search Ranking Insight:</span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {selectedQueryRow.position <= 3
                  ? "Prime ranking on page 1 of Google Search. Generates high click volume."
                  : selectedQueryRow.position <= 10
                    ? "Ranking on page 1 of Google Search. Potential to reach top 3 with content optimization."
                    : "Ranking beyond page 1. Target on-page SEO improvements to lift rank onto page 1."}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
