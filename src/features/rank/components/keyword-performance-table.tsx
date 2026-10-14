'use client';

import React, { useState } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  Eye,
  Trash2,
  Pause,
  Play,
  Radar,
  Sparkles,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { KeywordPerformanceItemDto } from '@/modules/rank/keyword-service';
import { notify } from '@/lib/notify';

interface KeywordPerformanceTableProps {
  items: KeywordPerformanceItemDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  isLoading?: boolean;
  onPageChange: (newPage: number) => void;
  onSearchChange: (query: string) => void;
  onSourceChange: (source: string) => void;
  onMovementChange: (movement: string) => void;
  onStatusChange: (status: string) => void;
  onSortChange: (column: string) => void;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  searchQuery: string;
  selectedSource: string;
  selectedMovement: string;
  selectedStatus: string;
  onInspectKeyword: (keyword: KeywordPerformanceItemDto) => void;
  onToggleStatus: (keywordId: string, newStatus: 'ACTIVE' | 'PAUSED') => Promise<void>;
  onDeleteKeyword: (keywordId: string, term: string) => Promise<void>;
  onTriggerScan?: (keywordId: string) => void;
}

export function KeywordPerformanceTable({
  items,
  total,
  page,
  limit,
  totalPages,
  isLoading,
  onPageChange,
  onSearchChange,
  onSourceChange,
  onMovementChange,
  onStatusChange,
  onSortChange,
  sortBy,
  sortDir,
  searchQuery,
  selectedSource,
  selectedMovement,
  selectedStatus,
  onInspectKeyword,
  onToggleStatus,
  onDeleteKeyword,
  onTriggerScan,
}: KeywordPerformanceTableProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmTerm, setDeleteConfirmTerm] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);

  // CSV Export
  const handleExportCsv = () => {
    if (items.length === 0) {
      notify.error('No keywords to export.');
      return;
    }

    const headers = [
      'Keyword',
      'Source',
      'Status',
      'Latest Local Rank',
      'Previous Rank',
      'Rank Delta',
      'Movement',
      'GSC Clicks',
      'GSC Impressions',
      'GSC CTR (%)',
      'GSC Avg Position',
      'Assigned Stores Count',
      'Last Checked At',
    ];

    const rows = items.map((i) => [
      `"${i.term.replace(/"/g, '""')}"`,
      i.source,
      i.status,
      i.latestRank !== null ? i.latestRank : 'Unranked',
      i.previousRank !== null ? i.previousRank : '',
      i.rankDelta !== null ? i.rankDelta : '',
      i.rankMovement,
      i.gscClicks,
      i.gscImpressions,
      i.gscCtr,
      i.gscAvgPosition !== null ? i.gscAvgPosition : '',
      i.trackedStoresCount,
      i.lastCheckedAt ? new Date(i.lastCheckedAt).toISOString() : '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `localbi-keywords-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify.success(`Exported ${items.length} keywords to CSV.`);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    try {
      await onDeleteKeyword(deleteConfirmId, deleteConfirmTerm);
      setDeleteConfirmId(null);
      setDeleteConfirmTerm('');
    } finally {
      setIsDeleting(false);
    }
  };

  const renderSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-60" />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
    ) : (
      <ArrowDown className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
      {/* Table Control Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Search className="h-4 w-4 text-emerald-500" />
            Keyword Intelligence & Rankings
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Verified local search rankings combined with Google Search Console query telemetry
          </p>
        </div>

        {/* Global Export & Record Count */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Showing {items.length} of {total} keywords
          </span>
          <button
            onClick={handleExportCsv}
            disabled={items.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 rounded-lg transition disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Search Input */}
        <div className="relative">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search keywords or queries..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Source Filter */}
        <div>
          <select
            value={selectedSource}
            onChange={(e) => onSourceChange(e.target.value)}
            className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          >
            <option value="ALL">All Sources</option>
            <option value="MANUAL">Manual Addition</option>
            <option value="GSC_IMPORT">Search Console Import</option>
            <option value="GBP_IMPORT">Google Business Profile Import</option>
          </select>
        </div>

        {/* Rank Movement Filter */}
        <div>
          <select
            value={selectedMovement}
            onChange={(e) => onMovementChange(e.target.value)}
            className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          >
            <option value="ALL">All Movements</option>
            <option value="IMPROVED">Improved (Rank Gained)</option>
            <option value="DECLINED">Declined (Rank Dropped)</option>
            <option value="UNCHANGED">Unchanged</option>
            <option value="NEW">New (First Scan)</option>
            <option value="UNRANKED">Unranked (&gt;20 or Pending)</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          >
            <option value="ALL">All Tracking Statuses</option>
            <option value="ACTIVE">Active Tracking Only</option>
            <option value="PAUSED">Paused Only</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th
                onClick={() => onSortChange('term')}
                className="py-3 px-3.5 font-semibold cursor-pointer select-none hover:text-slate-900 dark:hover:text-white transition"
              >
                <div className="flex items-center gap-1.5">
                  <span>Keyword / Query</span>
                  {renderSortIcon('term')}
                </div>
              </th>
              <th className="py-3 px-3 font-semibold">Source</th>
              <th className="py-3 px-3 font-semibold text-center">Status</th>
              <th
                onClick={() => onSortChange('latestRank')}
                className="py-3 px-3 font-semibold text-center cursor-pointer select-none hover:text-slate-900 dark:hover:text-white transition"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Local Rank</span>
                  {renderSortIcon('latestRank')}
                </div>
              </th>
              <th
                onClick={() => onSortChange('rankDelta')}
                className="py-3 px-3 font-semibold text-center cursor-pointer select-none hover:text-slate-900 dark:hover:text-white transition"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Movement</span>
                  {renderSortIcon('rankDelta')}
                </div>
              </th>
              <th
                onClick={() => onSortChange('gscClicks')}
                className="py-3 px-3 font-semibold text-right cursor-pointer select-none hover:text-slate-900 dark:hover:text-white transition"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>GSC Clicks</span>
                  {renderSortIcon('gscClicks')}
                </div>
              </th>
              <th
                onClick={() => onSortChange('gscImpressions')}
                className="py-3 px-3 font-semibold text-right cursor-pointer select-none hover:text-slate-900 dark:hover:text-white transition"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>GSC Imp.</span>
                  {renderSortIcon('gscImpressions')}
                </div>
              </th>
              <th
                onClick={() => onSortChange('gscCtr')}
                className="py-3 px-3 font-semibold text-right cursor-pointer select-none hover:text-slate-900 dark:hover:text-white transition"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>CTR</span>
                  {renderSortIcon('gscCtr')}
                </div>
              </th>
              <th
                onClick={() => onSortChange('gscAvgPosition')}
                className="py-3 px-3 font-semibold text-center cursor-pointer select-none hover:text-slate-900 dark:hover:text-white transition"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>GSC Pos.</span>
                  {renderSortIcon('gscAvgPosition')}
                </div>
              </th>
              <th className="py-3 px-3 font-semibold text-center">Stores</th>
              <th
                onClick={() => onSortChange('lastCheckedAt')}
                className="py-3 px-3 font-semibold text-right cursor-pointer select-none hover:text-slate-900 dark:hover:text-white transition"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Last Scanned</span>
                  {renderSortIcon('lastCheckedAt')}
                </div>
              </th>
              <th className="py-3 px-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={12} className="py-12 text-center text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <Search className="h-4 w-4 animate-spin text-emerald-500" />
                    <span>Loading keywords performance...</span>
                  </div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-12 text-center text-slate-400">
                  <div className="max-w-sm mx-auto">
                    <Search className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      No matching keywords found
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Try adjusting your search query, movement filter, or add target keywords for tracking.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item) => {
                // Movement badge helper
                let movementBadge = (
                  <span className="inline-flex items-center gap-0.5 text-slate-400 text-[11px]">
                    <Minus className="h-3 w-3" /> —
                  </span>
                );

                if (item.rankMovement === 'IMPROVED' && item.rankDelta !== null) {
                  movementBadge = (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                      <TrendingUp className="h-3 w-3" /> +{item.rankDelta}
                    </span>
                  );
                } else if (item.rankMovement === 'DECLINED' && item.rankDelta !== null) {
                  movementBadge = (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800">
                      <TrendingDown className="h-3 w-3" /> {item.rankDelta}
                    </span>
                  );
                } else if (item.rankMovement === 'NEW') {
                  movementBadge = (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 uppercase">
                      New
                    </span>
                  );
                } else if (item.rankMovement === 'UNCHANGED') {
                  movementBadge = (
                    <span className="inline-flex items-center gap-0.5 text-slate-500 dark:text-slate-400 text-[11px] font-medium">
                      <Minus className="h-3 w-3" /> 0
                    </span>
                  );
                }

                // Source badge helper
                const sourceLabel = item.source === 'GSC_IMPORT' ? 'GSC' : item.source === 'GBP_IMPORT' ? 'GBP' : 'MANUAL';
                const sourceColor =
                  item.source === 'GSC_IMPORT'
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                    : item.source === 'GBP_IMPORT'
                    ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-850/60 transition cursor-pointer"
                    onClick={() => onInspectKeyword(item)}
                  >
                    {/* Term */}
                    <td className="py-3 px-3.5 font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span>{item.term}</span>
                        {item.status === 'PAUSED' && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            Paused
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Source */}
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${sourceColor}`}
                      >
                        {sourceLabel}
                      </span>
                    </td>

                    {/* Status */}
                    <td
                      className="py-3 px-3 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() =>
                          onToggleStatus(
                            item.id,
                            item.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
                          )
                        }
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition ${
                          item.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100'
                            : 'bg-slate-150 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                        title="Click to toggle active tracking"
                      >
                        {item.status === 'ACTIVE' ? (
                          <>
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                          </>
                        ) : (
                          <>
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> Paused
                          </>
                        )}
                      </button>
                    </td>

                    {/* Latest Local Rank */}
                    <td className="py-3 px-3 text-center">
                      {item.latestRank !== null ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-xs ${
                            item.latestRank <= 3
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : item.latestRank <= 10
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-amber-500 text-white'
                          }`}
                        >
                          #{item.latestRank}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Movement */}
                    <td className="py-3 px-3 text-center">{movementBadge}</td>

                    {/* GSC Clicks */}
                    <td className="py-3 px-3 text-right font-medium text-slate-800 dark:text-slate-200">
                      {item.hasGscData ? item.gscClicks.toLocaleString() : '—'}
                    </td>

                    {/* GSC Impressions */}
                    <td className="py-3 px-3 text-right font-medium text-slate-800 dark:text-slate-200">
                      {item.hasGscData ? item.gscImpressions.toLocaleString() : '—'}
                    </td>

                    {/* GSC CTR */}
                    <td className="py-3 px-3 text-right font-medium text-slate-800 dark:text-slate-200">
                      {item.hasGscData ? `${item.gscCtr}%` : '—'}
                    </td>

                    {/* GSC Avg Position */}
                    <td className="py-3 px-3 text-center font-medium text-slate-800 dark:text-slate-200">
                      {item.gscAvgPosition !== null ? (
                        <span className="font-mono text-xs">{item.gscAvgPosition}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Stores Count */}
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        {item.trackedStoresCount}
                      </span>
                    </td>

                    {/* Last Scanned */}
                    <td className="py-3 px-3 text-right text-slate-500 dark:text-slate-400 text-[11px]">
                      {item.lastCheckedAt
                        ? new Date(item.lastCheckedAt).toLocaleDateString()
                        : 'Never'}
                    </td>

                    {/* Actions */}
                    <td
                      className="py-3 px-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onInspectKeyword(item)}
                          className="p-1 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                          title="View Details & History"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        {onTriggerScan && item.assignedStores.length > 0 && (
                          <button
                            onClick={() => onTriggerScan(item.id)}
                            className="p-1 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                            title="Run Scan"
                          >
                            <Radar className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setDeleteConfirmId(item.id);
                            setDeleteConfirmTerm(item.term);
                          }}
                          className="p-1 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition"
                          title="Delete Keyword"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-slate-500 dark:text-slate-400">
        <div>
          Page {page} of {totalPages} ({total} total keywords)
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Previous
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-rose-500" /> Confirm Keyword Deletion
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to delete tracked keyword &quot;
              <strong className="text-slate-900 dark:text-white">{deleteConfirmTerm}</strong>
              &quot;? All associated store tracking mappings and rank observation snapshots will be
              permanently removed.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmId(null);
                  setDeleteConfirmTerm('');
                }}
                disabled={isDeleting}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Keyword'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
