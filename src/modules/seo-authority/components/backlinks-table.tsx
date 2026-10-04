'use client';

import { useState } from 'react';
import {
  ExternalLink,
  Search,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { BacklinkRecord, FollowState, BacklinkStatus } from '../authority-types';

interface BacklinksTableProps {
  tenantSlug: string;
  items: BacklinkRecord[];
  totalCount: number;
  page: number;
  limit: number;
  onPageChange: (newPage: number) => void;
  onSearchChange: (query: string) => void;
  onFollowStateChange: (state?: FollowState) => void;
  onStatusChange: (status?: BacklinkStatus) => void;
  loading: boolean;
}

export function BacklinksTable({
  tenantSlug,
  items,
  totalCount,
  page,
  limit,
  onPageChange,
  onSearchChange,
  onFollowStateChange,
  onStatusChange,
  loading,
}: BacklinksTableProps) {
  const [searchInput, setSearchInput] = useState('');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verificationFeedback, setVerificationFeedback] = useState<Record<string, string>>({});

  const totalPages = Math.ceil(totalCount / limit) || 1;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange(searchInput);
  };

  const handleVerify = async (record: BacklinkRecord) => {
    setVerifyingId(record.id);
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/authority/verify-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkingUrl: record.linkingUrl,
          targetUrl: record.targetUrl,
        }),
      });
      const data = await res.json();
      if (data.data?.verified) {
        setVerificationFeedback((prev) => ({
          ...prev,
          [record.id]: 'Live link verified!',
        }));
      } else {
        setVerificationFeedback((prev) => ({
          ...prev,
          [record.id]: data.data?.message || 'Link verification failed.',
        }));
      }
    } catch {
      setVerificationFeedback((prev) => ({
        ...prev,
        [record.id]: 'Verification error occurred.',
      }));
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Table Filters ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by domain, URL, or anchor..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </form>

        <div className="flex items-center gap-2">
          <select
            onChange={(e) => onFollowStateChange((e.target.value as FollowState) || undefined)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
          >
            <option value="">All Link Types</option>
            <option value="FOLLOW">DoFollow</option>
            <option value="NOFOLLOW">NoFollow</option>
            <option value="UGC">UGC</option>
            <option value="SPONSORED">Sponsored</option>
          </select>

          <select
            onChange={(e) => onStatusChange((e.target.value as BacklinkStatus) || undefined)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="LOST">Lost</option>
          </select>
        </div>
      </div>

      {/* ── Table Container ── */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
            <tr>
              <th className="px-4 py-3">Referring Domain & URL</th>
              <th className="px-4 py-3">Target URL</th>
              <th className="px-4 py-3">Anchor Text</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Authority</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">First / Last Seen</th>
              <th className="px-4 py-3 text-right">Verification</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <RefreshCw className="mx-auto h-5 w-5 animate-spin" />
                  <span className="mt-2 block">Loading backlinks...</span>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  No backlink records match your criteria.
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/70 transition">
                  <td className="px-4 py-3 max-w-xs">
                    <span className="font-semibold text-slate-900 block truncate">
                      {row.referringDomain}
                    </span>
                    <a
                      href={row.linkingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-indigo-600 flex items-center gap-1 truncate text-[11px] mt-0.5"
                    >
                      <span className="truncate">{row.linkingUrl}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate font-mono text-[11px] text-slate-600">
                    {row.targetUrl}
                  </td>
                  <td className="px-4 py-3 max-w-[180px] truncate text-slate-800">
                    {row.anchorText || <span className="text-slate-400 italic">No text</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        row.followState === 'FOLLOW'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {row.followState}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono font-medium text-slate-900">
                    {row.providerAuthorityMetric != null
                      ? `${row.providerAuthorityMetricName || 'DR'} ${Math.round(row.providerAuthorityMetric)}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        row.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {row.status === 'ACTIVE' ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-[11px]">
                    <div>{row.firstSeenAt ? new Date(row.firstSeenAt).toLocaleDateString() : '—'}</div>
                    <div className="text-slate-400 text-[10px]">
                      {row.lastSeenAt ? new Date(row.lastSeenAt).toLocaleDateString() : '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {verificationFeedback[row.id] ? (
                      <span className="text-[11px] font-medium text-indigo-600 block">
                        {verificationFeedback[row.id]}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleVerify(row)}
                        disabled={verifyingId === row.id}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition"
                      >
                        {verifyingId === row.id ? (
                          <RefreshCw className="h-3 w-3 animate-spin inline mr-1" />
                        ) : (
                          <ShieldCheck className="h-3 w-3 inline mr-1 text-slate-400" />
                        )}
                        Verify
                      </button>
                    )}
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
          {Math.min(page * limit, totalCount)} of {totalCount} backlinks
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
