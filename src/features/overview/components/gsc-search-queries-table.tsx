'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  ArrowRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import type { OverviewGscQueryItem } from '@/modules/overview/overview-service';

interface GscSearchQueriesTableProps {
  tenantSlug: string;
  queries?: OverviewGscQueryItem[] | undefined;
}

type SortField = 'query' | 'clicks' | 'impressions' | 'ctr' | 'position';
type SortDirection = 'asc' | 'desc';

export function GscSearchQueriesTable({ tenantSlug, queries = [] }: GscSearchQueriesTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('clicks');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Filter queries based on search term
  const filteredQueries = useMemo(() => {
    if (!searchTerm.trim()) return queries;
    const term = searchTerm.toLowerCase().trim();
    return queries.filter((q) => q.query.toLowerCase().includes(term));
  }, [queries, searchTerm]);

  // Sort filtered queries
  const sortedQueries = useMemo(() => {
    return [...filteredQueries].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'query':
          comparison = a.query.localeCompare(b.query);
          break;
        case 'clicks':
          comparison = a.clicks - b.clicks;
          break;
        case 'impressions':
          comparison = a.impressions - b.impressions;
          break;
        case 'ctr': {
          const ctrA = parseFloat(a.ctr.replace('%', '')) || 0;
          const ctrB = parseFloat(b.ctr.replace('%', '')) || 0;
          comparison = ctrA - ctrB;
          break;
        }
        case 'position':
          comparison = a.position - b.position;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredQueries, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedQueries.length / pageSize));
  const activePage = Math.min(currentPage, totalPages);
  const paginatedQueries = useMemo(() => {
    const start = (activePage - 1) * pageSize;
    return sortedQueries.slice(start, start + pageSize);
  }, [sortedQueries, activePage, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      // Default to ascending for position (1 is best), descending for others
      setSortDirection(field === 'position' || field === 'query' ? 'asc' : 'desc');
    }
    setCurrentPage(1);
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-300 group-hover:text-slate-500 transition-colors ml-1 inline" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-indigo-600 ml-1 inline" />
    ) : (
      <ArrowDown className="w-3 h-3 text-indigo-600 ml-1 inline" />
    );
  };

  const startIndex = (activePage - 1) * pageSize + 1;
  const endIndex = Math.min(activePage * pageSize, sortedQueries.length);

  return (
    <div className="bg-gradient-to-br from-[#FAFAFF] to-[#F5F5FA] rounded-2xl border border-indigo-100 p-4 sm:p-5 shadow-sm transition-all duration-300 hover:shadow-md flex flex-col justify-between h-full relative overflow-hidden">
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3.5 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
            <Search className="w-4 h-4 drop-shadow-sm" />
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-slate-900 tracking-tight leading-snug">
              Top Search Queries
            </h3>
            <div className="text-[11px] text-slate-500 font-medium">
              Real Search Console keywords for active brand
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Quick Filter Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Filter keywords..."
              className="text-[11px] pl-8 pr-7 py-1 bg-white/90 border border-slate-200/90 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 w-36 sm:w-44 placeholder:text-slate-400 text-slate-800"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                aria-label="Clear filter"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <Link
            href={`/client/${tenantSlug}/reports/gsc/queries`}
            className="inline-flex items-center gap-1 text-[11.5px] font-bold text-indigo-700 hover:text-indigo-800 transition-colors group/link px-2.5 py-1 rounded-lg hover:bg-indigo-50/80 border border-indigo-200/70 bg-white/80"
          >
            <span>View All</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover/link:translate-x-0.5" />
          </Link>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto -mx-1 flex-1 relative z-10 min-h-[220px]">
        {queries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 text-[12px] bg-white/60 rounded-xl border border-dashed border-indigo-200 mx-1">
            <Search className="w-7 h-7 stroke-1 text-indigo-300 mb-2" />
            <span className="font-semibold text-slate-700">No search keywords recorded yet</span>
            <span className="text-[11px] text-slate-400 mt-0.5">
              Organic Search Console query metrics will populate once Google reports traffic.
            </span>
          </div>
        ) : sortedQueries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-slate-500 text-[12px] bg-white/60 rounded-xl border border-dashed border-indigo-200 mx-1">
            <Search className="w-6 h-6 stroke-1 text-slate-400 mb-1.5" />
            <span className="font-semibold text-slate-700">No queries match &ldquo;{searchTerm}&rdquo;</span>
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="mt-2 text-[11px] font-semibold text-indigo-600 hover:underline"
            >
              Clear filter
            </button>
          </div>
        ) : (
          <table className="w-full text-[12px] text-left border-separate border-spacing-y-1">
            <thead>
              <tr className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                <th className="pb-1.5 px-2.5 w-8 text-slate-400">#</th>
                <th
                  onClick={() => handleSort('query')}
                  className="pb-1.5 px-2 cursor-pointer select-none group hover:text-indigo-700 transition-colors"
                >
                  <span className="flex items-center">
                    Query {renderSortIcon('query')}
                  </span>
                </th>
                <th
                  onClick={() => handleSort('clicks')}
                  className="pb-1.5 px-2 text-right cursor-pointer select-none group hover:text-indigo-700 transition-colors"
                >
                  <span className="inline-flex items-center justify-end">
                    Clicks {renderSortIcon('clicks')}
                  </span>
                </th>
                <th
                  onClick={() => handleSort('impressions')}
                  className="pb-1.5 px-2 text-right cursor-pointer select-none group hover:text-indigo-700 transition-colors"
                >
                  <span className="inline-flex items-center justify-end">
                    Impressions {renderSortIcon('impressions')}
                  </span>
                </th>
                <th
                  onClick={() => handleSort('ctr')}
                  className="pb-1.5 px-2 text-right cursor-pointer select-none group hover:text-indigo-700 transition-colors"
                >
                  <span className="inline-flex items-center justify-end">
                    CTR {renderSortIcon('ctr')}
                  </span>
                </th>
                <th
                  onClick={() => handleSort('position')}
                  className="pb-1.5 px-3 text-right cursor-pointer select-none group hover:text-indigo-700 transition-colors"
                >
                  <span className="inline-flex items-center justify-end">
                    Position {renderSortIcon('position')}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedQueries.map((row, idx) => {
                const globalIndex = (activePage - 1) * pageSize + idx + 1;
                const isTopRank = Number(row.position) <= 3.0 && Number(row.position) > 0;
                return (
                  <tr
                    key={`${row.query}-${idx}`}
                    className="group hover:bg-white transition-all bg-white/70 shadow-xs border border-transparent hover:border-indigo-100 rounded-xl overflow-hidden"
                  >
                    <td className="py-2 px-2.5 text-slate-400 font-medium rounded-l-lg text-[11px]">
                      {globalIndex}
                    </td>
                    <td className="py-2 px-2 max-w-[170px] sm:max-w-none">
                      <span className="font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors truncate block">
                        {row.query}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right font-semibold text-slate-700 tabular-nums">
                      {row.clicks.toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-right font-medium text-slate-600 tabular-nums">
                      {row.impressions.toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-right font-medium text-slate-600 tabular-nums">
                      {row.ctr}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums font-bold rounded-r-lg">
                      <span
                        className={
                          isTopRank
                            ? 'text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/50'
                            : 'text-slate-700'
                        }
                      >
                        {row.position.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      {sortedQueries.length > 0 && (
        <div className="flex items-center justify-between pt-3 mt-1 border-t border-indigo-100/70 text-[11px] text-slate-500 relative z-10">
          <div>
            Showing <span className="font-semibold text-slate-700">{startIndex}</span> to{' '}
            <span className="font-semibold text-slate-700">{endIndex}</span> of{' '}
            <span className="font-semibold text-slate-700">{sortedQueries.length}</span> queries
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={activePage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-700"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 font-medium text-slate-600">
              Page {activePage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={activePage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-slate-700"
              aria-label="Next page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
