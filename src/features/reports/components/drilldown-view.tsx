'use client';

import { useState, useMemo } from 'react';
import { Download, Search, RefreshCw, AlertCircle, ShieldCheck, LayoutGrid, Table as TableIcon, BarChart3 } from 'lucide-react';
import { Breadcrumbs, BreadcrumbItem } from '@/components/layout/breadcrumbs';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AnalyticsLoader } from '@/components/ui/analytics-loader';
import { DrilldownFilterBar } from './drilldown-filter-bar';
import { DrilldownTable } from './drilldown-table';
import { DrilldownVisualAnalytics } from './drilldown-visual-analytics';

export interface ColumnDef<T> {
  key: string;
  header: string;
  sortable?: boolean | undefined;
  align?: ('left' | 'center' | 'right') | undefined;
  className?: string | undefined;
  render: (row: T, index: number) => React.ReactNode;
}

export interface DrilldownViewProps<T> {
  tenantSlug: string;
  tenantName?: string | undefined;
  breadcrumbs: BreadcrumbItem[];
  title: string;
  description: string;
  sourceBadge: 'GSC' | 'GBP';
  brands: Array<{ id: string; name: string; slug: string }>;
  locations?: Array<{ id: string; brandId: string; name: string; city: string }> | undefined;
  selectedBrandId: string;
  onBrandChange: (brandId: string) => void;
  selectedLocationId?: string | undefined;
  onLocationChange?: ((locationId: string) => void) | undefined;
  dateRangeDays: number;
  onDateRangeChange: (days: number) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string | undefined;
  columns: ColumnDef<T>[];
  data: T[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error?: Error | null | undefined;
  onRetry: () => void;
  sortBy?: string | undefined;
  sortOrder?: ('asc' | 'desc') | undefined;
  onSort?: ((key: string) => void) | undefined;
  accuracyNotice?: string | undefined;
  retentionNote?: string | undefined;
  actions?: React.ReactNode | undefined;
  isConnected?: boolean;
}

type ViewMode = 'both' | 'charts' | 'table';

export function DrilldownView<T>({
  tenantSlug,
  tenantName,
  breadcrumbs,
  title,
  description,
  sourceBadge,
  brands,
  locations = [],
  selectedBrandId,
  onBrandChange,
  selectedLocationId,
  onLocationChange,
  dateRangeDays,
  onDateRangeChange,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  columns,
  data,
  isLoading,
  isError,
  error,
  onRetry,
  sortBy,
  sortOrder = 'desc',
  onSort,
  accuracyNotice,
  retentionNote,
  actions,
  isConnected = true,
}: DrilldownViewProps<T>) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('both');

  const { startDate, endDate } = useMemo(() => {
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - dateRangeDays);
    return { startDate: past.toISOString().slice(0, 10), endDate: today.toISOString().slice(0, 10) };
  }, [dateRangeDays]);

  const handleExport = () => {
    if (!data || data.length === 0) return;
    setIsExporting(true);
    try {
      const headers = columns.map((c) => c.header).join(',');
      const rows = data.map((row) =>
        columns
          .map((c) => `"${String((row as Record<string, unknown>)[c.key] ?? '').replace(/"/g, '""')}"`)
          .join(',')
      );
      const meta = [
        `# localBi Report Export: ${title}`,
        `# Client: ${tenantName || tenantSlug}`,
        `# Scope: ${brands.find((b) => b.id === selectedBrandId)?.name || 'All Brands'}`,
        `# Date Range: ${startDate} to ${endDate} (${dateRangeDays}d)`,
        `# Source: ${sourceBadge}`,
        `# Generated: ${new Date().toISOString()}`,
      ].join('\n');
      const blob = new Blob([`${meta}\n\n${headers}\n${rows.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${tenantSlug}-${title.toLowerCase().replace(/\s+/g, '-')}-${startDate}-to-${endDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setExportNotice('CSV exported successfully with active filter constraints.');
      setTimeout(() => setExportNotice(null), 4000);
    } catch {
      setExportNotice('Failed to generate export file.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4 pb-8">
      <Breadcrumbs items={breadcrumbs} tenantSlug={tenantSlug} />

      <PageHeader
        title={title}
        description={description}
        badge={
          <Badge
            className={
              sourceBadge === 'GSC'
                ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                : 'bg-teal-100 text-teal-800 border-teal-200'
            }
          >
            {sourceBadge === 'GSC' ? 'Google Search Console' : 'Google Business Profile'}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Segmented Controls */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
              <button
                type="button"
                onClick={() => setViewMode('both')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-semibold transition-all ${
                  viewMode === 'both'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Split View (Visual Charts & Table)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Visual & Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('charts')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-semibold transition-all ${
                  viewMode === 'charts'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Charts and Metric Cards Only"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Charts</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-semibold transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Data Table Only"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Table</span>
              </button>
            </div>

            {actions}

            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isLoading || !data || data.length === 0 || isExporting}
              className="flex items-center gap-1.5 text-xs font-semibold"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
            </Button>
          </div>
        }
      />

      {exportNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in duration-200">
          <ShieldCheck className="h-4 w-4 flex-shrink-0" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Filter Controls Bar */}
      {isConnected && (
        <DrilldownFilterBar
          brands={brands}
          locations={locations}
          selectedBrandId={selectedBrandId}
          onBrandChange={onBrandChange}
          selectedLocationId={selectedLocationId}
          onLocationChange={onLocationChange}
          dateRangeDays={dateRangeDays}
          onDateRangeChange={onDateRangeChange}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder}
          startDate={startDate}
          endDate={endDate}
        />
      )}

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
            Website Domain Not Linked
          </h3>
          <p className="text-sm text-slate-500 mb-6 max-w-md">
            You need to link a valid Google property to this brand to view real-time performance analytics and reports.
          </p>
          <a
            href={`/t/${tenantSlug}/integrations`}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50 bg-indigo-600 text-slate-50 shadow hover:bg-indigo-600/90 h-9 px-4 py-2"
          >
            Manage Connections
          </a>
        </div>
      ) : (
        <>
          {/* Visual Analytics Section (KPI Cards + Horizontal Distribution Bar + Donut Share Breakdown) */}
          {!isLoading && !isError && data && data.length > 0 && viewMode !== 'table' && (
            <DrilldownVisualAnalytics data={data} sourceBadge={sourceBadge} title={title} />
          )}

          {/* Data Table Section */}
          {viewMode !== 'charts' && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              {isLoading ? (
                <AnalyticsLoader variant="hero" message={`Loading ${title} report records...`} />
              ) : isError ? (
                <div className="p-12 text-center space-y-3">
                  <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
                  <p className="text-sm font-semibold text-slate-900">Failed to load analytics records</p>
              <p className="text-xs text-slate-500">{error?.message || 'Network or server timeout.'}</p>
              <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry</span>
              </Button>
            </div>
          ) : !data || data.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                <Search className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">No analytics records found</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  No performance data recorded during this {dateRangeDays}-day reporting window. Try expanding the
                  date range or clearing filters.
                </p>
              </div>
              {searchQuery && (
                <Button variant="outline" size="sm" onClick={() => onSearchChange('')} className="text-xs">
                  Clear search query
                </Button>
              )}
            </div>
          ) : (
            <DrilldownTable columns={columns} data={data} sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
          )}
        </div>
      )}
      </>
    )}

      {(accuracyNotice || retentionNote) && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5 text-xs text-slate-600">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            <span>Reporting Integrity & Retention Policy</span>
          </div>
          {accuracyNotice && <p className="leading-relaxed">{accuracyNotice}</p>}
          {retentionNote && (
            <p className="text-[11px] text-slate-500 leading-relaxed italic">Retention note: {retentionNote}</p>
          )}
        </div>
      )}
    </div>
  );
}
