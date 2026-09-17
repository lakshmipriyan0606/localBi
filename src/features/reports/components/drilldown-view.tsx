'use client';

import { useState, useMemo } from 'react';
import { Download, Search, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react';
import { Breadcrumbs, BreadcrumbItem } from '@/components/layout/breadcrumbs';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AnalyticsLoader } from '@/components/ui/analytics-loader';
import { DrilldownFilterBar } from './drilldown-filter-bar';
import { DrilldownTable } from './drilldown-table';

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
}

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
}: DrilldownViewProps<T>) {
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
      const rows = data.map((row) => columns.map((c) => `"${String((row as Record<string, unknown>)[c.key] ?? '').replace(/"/g, '""')}"`).join(','));
      const meta = [`# localBi Report Export: ${title}`, `# Client: ${tenantName || tenantSlug}`, `# Scope: ${brands.find((b) => b.id === selectedBrandId)?.name || 'All Brands'}`, `# Date Range: ${startDate} to ${endDate} (${dateRangeDays}d)`, `# Source: ${sourceBadge}`, `# Generated: ${new Date().toISOString()}`].join('\n');
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
    } catch { setExportNotice('Failed to generate export file.'); }
    finally { setIsExporting(false); }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={breadcrumbs} tenantSlug={tenantSlug} />
      <PageHeader
        title={title}
        description={description}
        badge={<Badge className={sourceBadge === 'GSC' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' : 'bg-teal-100 text-teal-800 border-teal-200'}>{sourceBadge === 'GSC' ? 'Google Search Console' : 'Google Business Profile'}</Badge>}
        actions={
          <div className="flex items-center gap-2">
            {actions}
            <Button variant="outline" size="sm" onClick={handleExport} disabled={isLoading || !data || data.length === 0 || isExporting} className="flex items-center gap-1.5 text-xs font-semibold">
              <Download className="h-3.5 w-3.5" />
              <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
            </Button>
          </div>
        }
      />

      {exportNotice && <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in duration-200"><ShieldCheck className="h-4 w-4 flex-shrink-0" /><span>{exportNotice}</span></div>}

      <DrilldownFilterBar brands={brands} locations={locations} selectedBrandId={selectedBrandId} onBrandChange={onBrandChange} selectedLocationId={selectedLocationId} onLocationChange={onLocationChange} dateRangeDays={dateRangeDays} onDateRangeChange={onDateRangeChange} searchQuery={searchQuery} onSearchChange={onSearchChange} searchPlaceholder={searchPlaceholder} startDate={startDate} endDate={endDate} />

      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {isLoading ? (
          <AnalyticsLoader variant="hero" message={`Streaming ${title} telemetry records...`} />
        ) : isError ? (
          <div className="p-12 text-center space-y-3">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
            <p className="text-sm font-semibold text-slate-900">Failed to load analytics records</p>
            <p className="text-xs text-slate-500">{error?.message || 'Network or server timeout.'}</p>
            <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" /><span>Retry</span></Button>
          </div>
        ) : !data || data.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400"><Search className="h-5 w-5" /></div>
            <div>
              <p className="text-sm font-bold text-slate-900">No analytics records found</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">No matching telemetry observed during this {dateRangeDays}-day reporting window. Try expanding the date range or clearing filters.</p>
            </div>
            {searchQuery && <Button variant="outline" size="sm" onClick={() => onSearchChange('')} className="text-xs">Clear search query</Button>}
          </div>
        ) : (
          <DrilldownTable columns={columns} data={data} sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
        )}
      </div>

      {(accuracyNotice || retentionNote) && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs text-slate-600">
          <div className="flex items-center gap-2 font-semibold text-slate-900"><ShieldCheck className="h-4 w-4 text-indigo-600" /><span>Reporting Integrity & Retention Policy</span></div>
          {accuracyNotice && <p className="leading-relaxed">{accuracyNotice}</p>}
          {retentionNote && <p className="text-[11px] text-slate-500 leading-relaxed italic">Retention note: {retentionNote}</p>}
        </div>
      )}
    </div>
  );
}
