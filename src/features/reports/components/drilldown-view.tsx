'use client';

import React, { useState, useMemo } from 'react';
import {
  Download,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  AlertCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { Breadcrumbs, BreadcrumbItem } from '@/components/layout/breadcrumbs';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateRange, formatRelativeTime } from '@/shared/lib/formatters';

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
  searchPlaceholder = 'Filter results...',
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
    return {
      startDate: past.toISOString().slice(0, 10),
      endDate: today.toISOString().slice(0, 10),
    };
  }, [dateRangeDays]);

  const brandLocations = useMemo(
    () => locations.filter((l) => l.brandId === selectedBrandId),
    [locations, selectedBrandId]
  );

  const handleExport = () => {
    if (!data || data.length === 0) return;
    setIsExporting(true);

    try {
      const headers = columns.map((c) => c.header).join(',');
      const rows = data.map((row) =>
        columns
          .map((c) => {
            const raw = (row as Record<string, unknown>)[c.key];
            const str = String(raw ?? '').replace(/"/g, '""');
            return `"${str}"`;
          })
          .join(',')
      );

      const metadataHeader = [
        `# localBi Report Export: ${title}`,
        `# Client: ${tenantName || tenantSlug}`,
        `# Scope: ${brands.find((b) => b.id === selectedBrandId)?.name || 'All Brands'}`,
        `# Date Range: ${startDate} to ${endDate} (${dateRangeDays} days)`,
        `# Source: ${sourceBadge === 'GSC' ? 'Google Search Console' : 'Google Business Profile'}`,
        `# Timestamp: ${new Date().toISOString()}`,
      ].join('\n');

      const csvContent = `${metadataHeader}\n\n${headers}\n${rows.join('\n')}`;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `${tenantSlug}-${title.toLowerCase().replace(/\s+/g, '-')}-${startDate}-to-${endDate}.csv`
      );
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
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumbs items={breadcrumbs} tenantSlug={tenantSlug} />

      {/* Header */}
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
          <div className="flex items-center gap-2">
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

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Brand Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Brand:</span>
            <select
              value={selectedBrandId}
              onChange={(e) => onBrandChange(e.target.value)}
              className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Location Selector (Optional) */}
          {brandLocations.length > 0 && onLocationChange && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Location:</span>
              <select
                value={selectedLocationId || ''}
                onChange={(e) => onLocationChange(e.target.value)}
                className="text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">All Locations ({brandLocations.length})</option>
                {brandLocations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} {l.city ? `(${l.city})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Presets */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => onDateRangeChange(days)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  dateRangeDays === days
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-400">
            {formatDateRange(startDate, endDate)}
          </span>
        </div>

        {/* Search Filter */}
        <div className="relative min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
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
          <div className="p-16 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-900">No records found for this scope</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No matching data observed during the selected {dateRangeDays}-day reporting window. Try expanding the date range or clearing filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75">
                  {columns.map((col) => {
                    const isSorted = sortBy === col.key;
                    return (
                      <th
                        key={col.key}
                        scope="col"
                        className={`px-4 py-3 text-xs font-semibold text-slate-600 ${
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                        } ${col.className || ''}`}
                      >
                        {col.sortable && onSort ? (
                          <button
                            type="button"
                            onClick={() => onSort(col.key)}
                            className={`inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer ${
                              isSorted ? 'text-indigo-600 font-bold' : ''
                            }`}
                          >
                            <span>{col.header}</span>
                            {isSorted ? (
                              sortOrder === 'asc' ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 text-slate-400" />
                            )}
                          </button>
                        ) : (
                          col.header
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 text-slate-700 ${
                          col.align === 'right'
                            ? 'text-right tabular-nums'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                        }`}
                      >
                        {col.render(row, idx)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer with record count & freshness */}
        {data && data.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
            <span>Showing {data.length} records</span>
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <Clock className="h-3 w-3" />
              <span>Updated {formatRelativeTime(new Date())}</span>
            </div>
          </div>
        )}
      </div>

      {/* Accuracy & Retention Notice */}
      {(accuracyNotice || retentionNote) && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs text-slate-600">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            <span>Reporting Integrity & Retention Policy</span>
          </div>
          {accuracyNotice && <p className="leading-relaxed">{accuracyNotice}</p>}
          {retentionNote && (
            <p className="text-[11px] text-slate-500 leading-relaxed italic">
              Retention note: {retentionNote}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
