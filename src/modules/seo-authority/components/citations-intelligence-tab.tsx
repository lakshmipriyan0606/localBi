'use client';

import { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { StoreCitationOverview, StoreListingDetail } from '../authority-types';

interface CitationsIntelligenceTabProps {
  tenantSlug?: string;
  stores: { id: string; name: string; city: string }[];
  selectedStoreId: string;
  onStoreChange: (storeId: string) => void;
  citationData: StoreCitationOverview | null;
  loading: boolean;
}

export function CitationsIntelligenceTab({
  tenantSlug: _tenantSlug,
  stores,
  selectedStoreId,
  onStoreChange,
  citationData,
  loading,
}: CitationsIntelligenceTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'listings' | 'missing' | 'comparison'>('listings');
  const [selectedListing, setSelectedListing] = useState<StoreListingDetail | null>(null);

  if (loading && !citationData) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-slate-200 bg-white">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const metrics = citationData?.metrics || {
    totalExpected: 0,
    present: 0,
    healthy: 0,
    needsReview: 0,
    mismatch: 0,
    duplicates: 0,
    missing: 0,
    unknown: 0,
  };

  return (
    <div className="space-y-6">
      {/* ── Store Scope Selector & Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Store Citation Authority</h3>
            <p className="text-xs text-slate-500">
              Manage directory presence, NAP consistency, and missing directory coverage per store location
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-600">Store Location:</label>
          <select
            value={selectedStoreId}
            onChange={(e) => onStoreChange(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none"
          >
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.city ? `(${s.city})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Store Metrics Cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Presence</span>
          <div className="mt-1 text-2xl font-bold text-slate-900">
            {metrics.present}{' '}
            <span className="text-xs font-normal text-slate-500">/ {metrics.totalExpected}</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase">Healthy</span>
          <div className="mt-1 text-2xl font-bold text-emerald-600">{metrics.healthy}</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold text-amber-600 uppercase">Needs Review</span>
          <div className="mt-1 text-2xl font-bold text-amber-600">{metrics.needsReview}</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold text-red-600 uppercase">Mismatch</span>
          <div className="mt-1 text-2xl font-bold text-red-600">{metrics.mismatch}</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-600 uppercase">Duplicates</span>
          <div className="mt-1 text-2xl font-bold text-slate-700">{metrics.duplicates}</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold text-purple-600 uppercase">Missing</span>
          <div className="mt-1 text-2xl font-bold text-purple-600">{metrics.missing}</div>
        </div>
      </div>

      {/* ── Sub Navigation Tabs ── */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('listings')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition ${
            activeSubTab === 'listings'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Tracked Directory Listings ({citationData?.listings.length || 0})
        </button>
        <button
          onClick={() => setActiveSubTab('missing')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition ${
            activeSubTab === 'missing'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Missing Directories ({citationData?.missingDirectories.length || 0})
        </button>
      </div>

      {/* ── Tab Content: Active Listings ── */}
      {activeSubTab === 'listings' && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">Directory Provider</th>
                <th className="px-4 py-3">Presence</th>
                <th className="px-4 py-3">Consistency</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Website</th>
                <th className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {citationData?.listings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No active directory listings recorded for this store.
                  </td>
                </tr>
              ) : (
                citationData?.listings.map((l) => (
                  <tr key={l.listingId} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <div>{l.provider.replace(/_/g, ' ')}</div>
                      {l.isManualOnly && (
                        <span className="text-[10px] text-slate-400 font-normal">Manual Portal</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        Present
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          l.consistency === 'HEALTHY'
                            ? 'bg-emerald-50 text-emerald-700'
                            : l.consistency === 'MISMATCH'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {l.consistency}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <FieldBadge status={l.comparison.name.status} />
                    </td>
                    <td className="px-4 py-3">
                      <FieldBadge status={l.comparison.phone.status} />
                    </td>
                    <td className="px-4 py-3">
                      <FieldBadge status={l.comparison.address.status} />
                    </td>
                    <td className="px-4 py-3">
                      <FieldBadge status={l.comparison.website.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedListing(l)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Compare
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Tab Content: Missing Directories ── */}
      {activeSubTab === 'missing' && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">Directory</th>
                <th className="px-4 py-3">Importance</th>
                <th className="px-4 py-3">Reason for Expectation</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {citationData?.missingDirectories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    All relevant expected directories are present for this store!
                  </td>
                </tr>
              ) : (
                citationData?.missingDirectories.map((m) => (
                  <tr key={m.provider} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {m.displayName}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          m.importance === 'CRITICAL'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-purple-50 text-purple-700'
                        }`}
                      >
                        {m.importance}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-md">
                      {m.reason}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700">
                        MISSING
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {m.portalUrl ? (
                        <a
                          href={m.portalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Open Portal
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">Manual listing</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal Comparison View ── */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {selectedListing.provider.replace(/_/g, ' ')} vs Canonical LocalBi
                </h3>
                <p className="text-xs text-slate-500">
                  Field-by-field consistency comparison for {citationData?.storeName}
                </p>
              </div>
              <button
                onClick={() => setSelectedListing(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              <ComparisonRow
                field="Business Name"
                canonical={selectedListing.comparison.name.canonical}
                provider={selectedListing.comparison.name.provider}
                status={selectedListing.comparison.name.status}
              />
              <ComparisonRow
                field="Phone Number"
                canonical={selectedListing.comparison.phone.canonical}
                provider={selectedListing.comparison.phone.provider}
                status={selectedListing.comparison.phone.status}
              />
              <ComparisonRow
                field="Store Address"
                canonical={selectedListing.comparison.address.canonical}
                provider={selectedListing.comparison.address.provider}
                status={selectedListing.comparison.address.status}
              />
              <ComparisonRow
                field="Website URL"
                canonical={selectedListing.comparison.website.canonical}
                provider={selectedListing.comparison.website.provider}
                status={selectedListing.comparison.website.status}
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedListing(null)}
                className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldBadge({ status }: { status: string }) {
  if (status === 'MATCH') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
        <CheckCircle2 className="h-3 w-3" />
        Match
      </span>
    );
  }
  if (status === 'MISMATCH') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600">
        <XCircle className="h-3 w-3" />
        Differs
      </span>
    );
  }
  return <span className="text-[11px] text-slate-400">—</span>;
}

function ComparisonRow({
  field,
  canonical,
  provider,
  status,
}: {
  field: string;
  canonical: any;
  provider: any;
  status: string;
}) {
  return (
    <div className="grid grid-cols-3 py-2.5 items-center">
      <span className="font-semibold text-slate-700">{field}</span>
      <div className="text-slate-900 font-mono text-[11px]">
        {canonical ? String(canonical) : <span className="text-slate-400 italic">None</span>}
      </div>
      <div className="flex items-center justify-between text-slate-700 font-mono text-[11px]">
        <span>{provider ? String(provider) : <span className="text-slate-400 italic">None</span>}</span>
        <FieldBadge status={status} />
      </div>
    </div>
  );
}
