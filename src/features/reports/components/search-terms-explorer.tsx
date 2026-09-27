"use client";

import { useState, useMemo } from "react";
import { DrilldownView, ColumnDef } from "./drilldown-view";
import { useReportsDrilldown } from "../hooks/use-reports";
import { useReportsQueryState } from "../hooks/use-reports-query-state";
import { GbpSearchKeywordRow } from "@/modules/reports/reporting-service";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, Info } from "lucide-react";

export interface SearchTermsExplorerProps {
  tenantSlug: string;
  tenantName: string;
  brands: Array<{ id: string; name: string; slug: string }>;
  locations: Array<{ id: string; brandId: string; name: string; city: string }>;
  initialBrandId: string;
  isConnected?: boolean;
}

export function SearchTermsExplorer({
  tenantSlug,
  tenantName,
  brands,
  locations,
  initialBrandId,
  isConnected = true,
}: SearchTermsExplorerProps) {
  const { state, setBrandId, setLocationId, setSearch } = useReportsQueryState({
    dateRangeDays: 30,
    brandId: initialBrandId,
    sortBy: "impressions",
    sortOrder: "desc",
  });

  const availableMonths = useMemo(() => {
    const months: Array<{ value: string; label: string }> = [];
    const now = new Date();
    for (let i = 1; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("en-US", {
        month: "long",
        year: "numeric",
      });
      months.push({ value: val, label });
    }
    return months;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    return `${yr}-${mo}`;
  });

  const selectedBrandId = state.brandId || initialBrandId;
  const selectedLocationId = state.locationId;
  const searchQuery = state.search;

  const [yearStr, monthStr] = selectedMonth.split("-");
  const y = parseInt(yearStr || "2026", 10);
  const m = parseInt(monthStr || "1", 10);
  const lastDay = new Date(y, m, 0).getDate();
  const startDate = `${selectedMonth}-01`;
  const endDate = `${selectedMonth}-${String(lastDay).padStart(2, "0")}`;

  const { data, isLoading, isFetching, isError, error, refetch } =
    useReportsDrilldown<GbpSearchKeywordRow>({
      tenantSlug,
      brandId: selectedBrandId,
      locationId: selectedLocationId,
      startDate,
      endDate,
      dimension: "search-keywords",
      search: searchQuery,
    });

  const columns: ColumnDef<GbpSearchKeywordRow>[] = [
    {
      key: "keyword",
      header: "Search Keyword",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <Search className="h-3.5 w-3.5 text-teal-600 flex-shrink-0" />
          <span className="font-semibold text-slate-900">{row.keyword}</span>
        </div>
      ),
    },
    {
      key: "month",
      header: "Reporting Period",
      render: (row) => (
        <div className="flex items-center gap-1.5 text-slate-500 font-mono text-xs">
          <Calendar className="h-3 w-3 text-slate-400" />
          <span>{row.month}</span>
        </div>
      ),
    },
    {
      key: "impressionsText",
      header: "Monthly Impressions",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          {row.isThreshold ? (
            <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-xs font-mono font-bold">
              {row.impressionsText}
            </Badge>
          ) : (
            <span className="font-bold text-slate-900 tabular-nums text-sm">
              {row.impressionsText}
            </span>
          )}
          {row.isThreshold && (
            <span
              className="text-[10px] text-amber-700 bg-amber-100/60 px-1.5 py-0.5 rounded"
              title="Google enforces a privacy threshold on low-volume local keywords"
            >
              Threshold Bound
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="space-y-6">
        {/* Policy Reminder Banner */}
        <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-xl flex items-start gap-3">
          <Info className="h-5 w-5 text-teal-700 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-teal-900 space-y-1">
            <p className="font-semibold">
              Google Business Profile Monthly Search Keyword Rules
            </p>
            <p className="leading-relaxed text-teal-800">
              Per Google API specifications, search keywords for business
              profiles are aggregated monthly. When impression volume is below
              Google&apos;s privacy threshold, Google returns a bound (such as
              &ldquo;&lt; 15&rdquo;) rather than an exact count. localBi
              guarantees thresholds are shown honestly as bounds and are never
              fabricated as exact figures or artificially split into daily
              points.
            </p>
          </div>
        </div>

        <DrilldownView
          isConnected={isConnected}
          tenantSlug={tenantSlug}
          tenantName={tenantName}
          breadcrumbs={[
            { label: "Google Business Profile", href: `/client/${tenantSlug}/reports?tab=gbp` },
            { label: "Search Terms", current: true },
          ]}
          title="Customer Search Terms"
          description="Consumer queries triggering Google Business Profile impressions."
          sourceBadge="GBP"
          brands={brands}
          locations={locations}
          selectedBrandId={selectedBrandId}
          onBrandChange={setBrandId}
          selectedLocationId={selectedLocationId}
          onLocationChange={setLocationId}
          dateRangeDays={30}
          onDateRangeChange={() => {}}
          searchQuery={searchQuery}
          onSearchChange={setSearch}
          searchPlaceholder="Filter search keywords..."
          columns={columns}
          data={data?.items}
          isLoading={isLoading || isFetching}
          isError={isError}
          error={error}
          onRetry={refetch}
          accuracyNotice="Data sourced from Google Business Profile locations.searchkeywords.impressions.monthly API. All threshold bounds reflect Google's official privacy threshold protection."
          retentionNote="Monthly search keyword data retained according to Google Business Profile API policies."
          actions={
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">
                Month:
              </span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                {availableMonths.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            }
          />
      </div>
    </>
  );
}
