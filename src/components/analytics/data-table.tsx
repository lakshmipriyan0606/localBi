'use client';

import * as React from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TableSkeleton } from './analytics-skeletons';
import { AnalyticsEmptyState } from './analytics-empty-state';

export interface ColumnDef<T> {
  key: string;
  header: string;
  accessor?: ((item: T) => React.ReactNode) | undefined;
  sortable?: boolean | undefined;
  className?: string | undefined;
  align?: 'left' | 'center' | 'right' | undefined;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  isLoading?: boolean | undefined;
  isError?: boolean | undefined;
  errorMessage?: string | undefined;
  onRetry?: (() => void) | undefined;

  // Sorting
  sortColumn?: string | undefined;
  sortDirection?: 'asc' | 'desc' | undefined;
  onSort?: ((columnKey: string) => void) | undefined;

  // Search & Filtering
  searchQuery?: string | undefined;
  onSearchChange?: ((query: string) => void) | undefined;
  searchPlaceholder?: string | undefined;
  filterControls?: React.ReactNode | undefined;

  // Pagination
  currentPage?: number | undefined;
  totalPages?: number | undefined;
  totalCount?: number | undefined;
  pageSize?: number | undefined;
  onPageChange?: ((page: number) => void) | undefined;

  // Row selection or click
  onRowClick?: ((item: T) => void) | undefined;
  emptyTitle?: string | undefined;
  emptyDescription?: string | undefined;
  className?: string | undefined;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  isError = false,
  errorMessage,
  onRetry,
  sortColumn,
  sortDirection,
  onSort,
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  filterControls,
  currentPage = 1,
  totalPages = 1,
  totalCount,
  onPageChange,
  onRowClick,
  emptyTitle,
  emptyDescription,
  className,
}: DataTableProps<T>) {
  const isFiltered = Boolean(searchQuery && searchQuery.trim().length > 0);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Table Toolbar: Search + Extra Filters */}
      {(onSearchChange || filterControls) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {onSearchChange && (
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 h-9 text-xs bg-white border-slate-200"
              />
            </div>
          )}

          {filterControls && (
            <div className="flex items-center gap-2 ml-auto">{filterControls}</div>
          )}
        </div>
      )}

      {/* Main Table Content */}
      {isLoading ? (
        <TableSkeleton rows={5} cols={columns.length} />
      ) : isError ? (
        <AnalyticsEmptyState
          variant="ERROR"
          title="Failed to Load Table Data"
          description={errorMessage || 'An error occurred while loading this dataset.'}
          onAction={onRetry}
          actionText="Retry"
        />
      ) : data.length === 0 ? (
        <AnalyticsEmptyState
          variant={isFiltered ? 'FILTERED_EMPTY' : 'NO_DATA'}
          title={emptyTitle}
          description={emptyDescription}
          onAction={isFiltered && onSearchChange ? () => onSearchChange('') : undefined}
          actionText={isFiltered ? 'Clear Search' : undefined}
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/75 hover:bg-slate-50/75">
                {columns.map((col) => {
                  const isSorted = sortColumn === col.key;
                  return (
                    <TableHead
                      key={col.key}
                      className={cn(
                        'text-xs font-semibold text-slate-700 select-none',
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center',
                        col.className
                      )}
                    >
                      {col.sortable && onSort ? (
                        <button
                          type="button"
                          onClick={() => onSort(col.key)}
                          className={cn(
                            'inline-flex items-center gap-1 hover:text-slate-900 transition-colors focus:outline-none',
                            col.align === 'right' && 'ml-auto'
                          )}
                        >
                          <span>{col.header}</span>
                          {isSorted ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-indigo-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100" />
                          )}
                        </button>
                      ) : (
                        <span>{col.header}</span>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, index) => {
                const key = keyExtractor(item, index);
                return (
                  <TableRow
                    key={key}
                    onClick={onRowClick ? () => onRowClick(item) : undefined}
                    className={cn(
                      'transition-colors',
                      onRowClick && 'cursor-pointer hover:bg-indigo-50/40'
                    )}
                  >
                    {columns.map((col) => {
                      const value = col.accessor
                        ? col.accessor(item)
                        : (item as Record<string, unknown>)[col.key] as React.ReactNode;

                      return (
                        <TableCell
                          key={col.key}
                          className={cn(
                            'text-xs text-slate-700 py-3',
                            col.align === 'right' && 'text-right tabular-nums',
                            col.align === 'center' && 'text-center',
                            col.className
                          )}
                        >
                          {value}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Table Pagination Footer */}
          {(totalPages > 1 || totalCount !== undefined) && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500">
              <div>
                {totalCount !== undefined && (
                  <span>
                    Showing{' '}
                    <strong className="text-slate-800 font-semibold">
                      {Math.min((currentPage - 1) * (data.length || 10) + 1, totalCount)}
                    </strong>{' '}
                    to{' '}
                    <strong className="text-slate-800 font-semibold">
                      {Math.min(currentPage * (data.length || 10), totalCount)}
                    </strong>{' '}
                    of{' '}
                    <strong className="text-slate-800 font-semibold">{totalCount}</strong>{' '}
                    records
                  </span>
                )}
              </div>

              {totalPages > 1 && onPageChange && (
                <div className="flex items-center gap-1.5 ml-auto">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => onPageChange(currentPage - 1)}
                    className="h-8 px-2.5 text-xs text-slate-600"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
                    <span>Previous</span>
                  </Button>

                  <span className="px-2 text-xs font-medium text-slate-700">
                    Page {currentPage} of {totalPages}
                  </span>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => onPageChange(currentPage + 1)}
                    className="h-8 px-2.5 text-xs text-slate-600"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
