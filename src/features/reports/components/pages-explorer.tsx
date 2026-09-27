"use client";

import { useState, useMemo } from "react";
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
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ExternalLink, MoreVertical, FileCheck, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { PageIndexingView } from "./page-indexing-view";

export interface PagesExplorerProps {
  tenantSlug: string;
  tenantName: string;
  brands: Array<{ id: string; name: string; slug: string }>;
  locations: Array<{ id: string; brandId: string; name: string; city: string }>;
  initialBrandId: string;
  isConnected?: boolean;
  propertyUrl?: string;
}

export function PagesExplorer({
  tenantSlug,
  tenantName,
  brands,
  locations,
  initialBrandId,
  isConnected = true,
  propertyUrl,
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
  const [activeTab, setActiveTab] = useState<'indexing' | 'traffic'>('indexing');

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

  const items = useMemo(() => {
    return data?.items || [];
  }, [data?.items]);

  const columns: ColumnDef<PageDimensionRow>[] = [
    {
      key: "rank",
      header: "#",
      render: (_row, idx) => (
        <span className="text-slate-400 font-semibold text-[11px]">{idx + 1}</span>
      ),
    },
    {
      key: "fullUrl",
      header: "Landing Page URL",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-1.5 max-w-[380px]">
          <button
            type="button"
            onClick={() => setSelectedPageRow(row)}
            className="text-left font-mono text-xs text-indigo-700 hover:text-indigo-900 hover:underline truncate cursor-pointer font-medium"
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
      key: "section",
      header: "Section",
      render: (row) => {
        let path = '/';
        try {
          path = new URL(row.fullUrl).pathname || '/';
        } catch {
          path = row.fullUrl.replace(/^https?:\/\/[^/]+/, '') || '/';
        }
        const name = path === '/' ? 'Home' : path.replace(/^\//, '').split('/')[0] || 'Home';
        const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
        return (
          <span className="text-slate-600 font-medium text-xs">
            {formattedName}
          </span>
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
      key: "trend",
      header: "Trend",
      align: "right",
      render: () => (
        <div className="flex items-center justify-end">
          <svg width="48" height="16" className="overflow-visible">
            <path
              d="M 0 12 Q 12 10 24 6 T 48 3"
              fill="none"
              stroke="#10B981"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </div>
      ),
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
      {/* Top Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('indexing')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'indexing'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileCheck className="w-3.5 h-3.5" />
          <span>Page Indexing (Google Search Console)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('traffic')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'traffic'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Page Traffic & Rankings ({items.length})</span>
        </button>
      </div>

      {activeTab === 'indexing' ? (
        <div className="space-y-6">
          <Breadcrumbs
            items={[
              { label: "Google Search Console", href: `/client/${tenantSlug}/reports` },
              { label: "Page Indexing", current: true },
            ]}
            tenantSlug={tenantSlug}
          />
          <PageHeader
            title="Page Indexing"
            description="Google Search index coverage, status, and live URL inspection."
            badge={
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Index Status: Verified
              </span>
            }
          />
          <PageIndexingView
            tenantSlug={tenantSlug}
            propertyUrl={propertyUrl || ""}
          />
        </div>
      ) : (
        <DrilldownView
          isConnected={isConnected}
          tenantSlug={tenantSlug}
          tenantName={tenantName}
          breadcrumbs={[
            { label: "Google Search Console", href: `/client/${tenantSlug}/reports` },
            { label: "Top Landing Pages", current: true },
          ]}
          title="Top Landing Pages"
          description="Organic Google Search performance across website landing pages."
          sourceBadge="GSC"
          variant="pages"
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
