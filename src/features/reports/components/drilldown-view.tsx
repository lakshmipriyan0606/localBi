'use client';

import { useState, useMemo } from 'react';
import { Download, Search, RefreshCw, AlertCircle, ShieldCheck, Globe2, Monitor, FileText, Hash, TrendingUp, type LucideIcon } from 'lucide-react';
import { Breadcrumbs, BreadcrumbItem } from '@/components/layout/breadcrumbs';

import { Button } from '@/components/ui/button';

import { AnalyticsLoader } from '@/components/ui/analytics-loader';
import { DrilldownFilterBar } from './drilldown-filter-bar';
import { DrilldownTable } from './drilldown-table';
import { DrilldownVisualAnalytics } from './drilldown-visual-analytics';

// ─── Per-page visual identity config ─────────────────────────────────────────
export type DrilldownVariant = 'overview' | 'pages' | 'queries' | 'countries' | 'devices';

interface VariantConfig {
  gradient: string;
  iconBg: string;
  pillBg: string;
  pillText: string;
  badgeBg: string;
  Icon: LucideIcon;
  eyebrow: string;
}

const VARIANT_CONFIG: Record<DrilldownVariant, VariantConfig> = {
  overview: {
    gradient: 'from-indigo-600 via-violet-600 to-indigo-700',
    iconBg: 'bg-white/20',
    pillBg: 'bg-indigo-100',
    pillText: 'text-indigo-700',
    badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    Icon: TrendingUp,
    eyebrow: 'Search Performance Overview',
  },
  pages: {
    gradient: 'from-violet-600 via-purple-600 to-violet-700',
    iconBg: 'bg-white/20',
    pillBg: 'bg-violet-100',
    pillText: 'text-violet-700',
    badgeBg: 'bg-violet-100 text-violet-800 border-violet-200',
    Icon: FileText,
    eyebrow: 'Landing Page Analytics',
  },
  queries: {
    gradient: 'from-emerald-600 via-teal-600 to-emerald-700',
    iconBg: 'bg-white/20',
    pillBg: 'bg-emerald-100',
    pillText: 'text-emerald-700',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    Icon: Hash,
    eyebrow: 'Keyword & Query Research',
  },
  countries: {
    gradient: 'from-cyan-600 via-sky-600 to-blue-600',
    iconBg: 'bg-white/20',
    pillBg: 'bg-cyan-100',
    pillText: 'text-cyan-700',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    Icon: Globe2,
    eyebrow: 'Geographic Search Distribution',
  },
  devices: {
    gradient: 'from-orange-500 via-amber-500 to-orange-600',
    iconBg: 'bg-white/20',
    pillBg: 'bg-orange-100',
    pillText: 'text-orange-700',
    badgeBg: 'bg-orange-100 text-orange-800 border-orange-200',
    Icon: Monitor,
    eyebrow: 'Device Performance Breakdown',
  },
};

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
  /** Controls the per-page color theme, hero icon, and gradient banner. */
  variant?: DrilldownVariant | undefined;
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

export function DrilldownView<T>({
  tenantSlug,
  tenantName,
  breadcrumbs,
  title,
  description,
  sourceBadge,
  variant = 'overview',
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
  const vc = VARIANT_CONFIG[variant];
  const [isExporting, setIsExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

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

      {/* ── Page Header matching Figma Mockup ───────────────────────────────── */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between pt-1">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-[22px] font-bold tracking-tight text-slate-900 leading-tight">
              {title}
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 shadow-2xs">
              {sourceBadge === 'GSC' ? 'Google Search Console' : 'Google Business Profile'}
            </span>
          </div>
          <p className="mt-1 text-[13px] text-slate-500 max-w-3xl leading-relaxed">
            {description}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 self-start">
          {actions}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isLoading || !data || data.length === 0 || isExporting}
            className="flex items-center gap-1.5 text-xs font-semibold bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs h-8 px-3"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </Button>
        </div>
      </div>


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

      {brands.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-indigo-200 border-dashed rounded-2xl bg-indigo-50/50 mt-6">
          <div className="w-12 h-12 bg-white text-indigo-600 rounded-full flex items-center justify-center mb-4 shadow-sm border border-indigo-100">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            No Brands Registered Yet
          </h3>
          <p className="text-sm text-slate-500 mb-6 max-w-md">
            To view performance reporting, you first need to register at least one client brand under {tenantName || tenantSlug}.
          </p>
          <a
            href={`/client/${tenantSlug}/brands`}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50 bg-indigo-600 text-slate-50 shadow hover:bg-indigo-600/90 h-9 px-4 py-2"
          >
            Create First Brand
          </a>
        </div>
      ) : !isConnected ? (
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
            {sourceBadge === 'GSC' ? 'Website Domain Not Linked' : 'Business Profile Not Linked'}
          </h3>
          <p className="text-sm text-slate-500 mb-6 max-w-md">
            You need to link a valid Google property to this brand to view real-time performance analytics and reports.
          </p>
          <a
            href={`/client/${tenantSlug}/integrations`}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50 bg-indigo-600 text-slate-50 shadow hover:bg-indigo-600/90 h-9 px-4 py-2"
          >
            Manage Connections
          </a>
        </div>
      ) : (
        <>
          {/* Visual Analytics Section */}
          {!isLoading && !isError && data && data.length > 0 && (
            <DrilldownVisualAnalytics data={data} sourceBadge={sourceBadge} title={title} variant={variant} />
          )}

          {/* Data Table Section */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              {/* Table Header matching mockups */}
              <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 flex-shrink-0">
                    <vc.Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-slate-900 leading-tight">
                      {variant === 'devices'
                        ? 'Device Performance Breakdown'
                        : variant === 'countries'
                        ? 'Country / Region Performance'
                        : variant === 'pages'
                        ? 'Landing Pages'
                        : 'Search Queries'}
                    </h3>
                    <p className="text-[11.5px] text-slate-500 mt-0.5">
                      {variant === 'devices'
                        ? 'Detailed performance metrics by device category'
                        : variant === 'countries'
                        ? 'Detailed performance metrics by country/region'
                        : variant === 'pages'
                        ? 'Detailed performance metrics for your top landing pages'
                        : 'Detailed organic search query performance from Google Search Console'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span className="text-[11.5px] text-slate-400 font-medium">Sort by</span>
                  <div className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-2xs flex items-center gap-1.5 cursor-pointer">
                    <span className="capitalize">{sortBy || 'Clicks'}</span>
                    <span className="text-slate-400 text-[10px]">▾</span>
                  </div>
                </div>
              </div>

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
