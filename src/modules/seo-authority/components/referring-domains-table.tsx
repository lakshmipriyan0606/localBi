'use client';

import { useState } from 'react';
import { Globe2, Search, ExternalLink, RefreshCw } from 'lucide-react';
import { ReferringDomainRecord } from '../authority-types';

interface ReferringDomainsTableProps {
  items: ReferringDomainRecord[];
  totalCount: number;
  page: number;
  limit: number;
  onPageChange: (newPage: number) => void;
  onSearchChange: (query: string) => void;
  loading: boolean;
}

export function ReferringDomainsTable({
  items,
  totalCount,
  page,
  limit,
  onPageChange,
  onSearchChange,
  loading,
}: ReferringDomainsTableProps) {
  const [searchInput, setSearchInput] = useState('');
  const totalPages = Math.ceil(totalCount / limit) || 1;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange(searchInput);
  };

  return (
    <div className="space-y-4">
      {/* ── Search Filter ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search referring domains..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </form>
      </div>

      {/* ── Table Container ── */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
            <tr>
              <th className="px-4 py-3">Domain</th>
              <th className="px-4 py-3">Active Backlinks</th>
              <th className="px-4 py-3">Target Pages</th>
              <th className="px-4 py-3">Authority Metric</th>
              <th className="px-4 py-3">First Seen</th>
              <th className="px-4 py-3">Last Seen</th>
              <th className="px-4 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  <RefreshCw className="mx-auto h-5 w-5 animate-spin" />
                  <span className="mt-2 block">Loading referring domains...</span>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  No referring domains indexed yet.
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/70 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Globe2 className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-900">{row.domain}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {row.activeLinksCount}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {row.linkedPagesCount} page(s)
                  </td>
                  <td className="px-4 py-3 font-mono font-medium text-slate-900">
                    {row.providerAuthorityMetric != null
                      ? `${row.providerAuthorityMetricName || 'DR'} ${Math.round(row.providerAuthorityMetric)}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-[11px]">
                    {row.firstSeenAt ? new Date(row.firstSeenAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-[11px]">
                    {row.lastSeenAt ? new Date(row.lastSeenAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-medium text-slate-700">
                      Active
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Showing {items.length > 0 ? (page - 1) * limit + 1 : 0} to{' '}
          {Math.min(page * limit, totalCount)} of {totalCount} referring domains
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="rounded border border-slate-200 px-2 py-1 font-medium disabled:opacity-40 hover:bg-slate-50"
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="rounded border border-slate-200 px-2 py-1 font-medium disabled:opacity-40 hover:bg-slate-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
