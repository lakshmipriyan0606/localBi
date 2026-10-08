'use client';

import { useState, useEffect } from 'react';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Copy,
  ExternalLink,
  RefreshCw,
  FileEdit,
  Check,
  X,
} from 'lucide-react';

import { useActiveBrand } from '@/providers/active-brand-context';

interface ScopedBrand {
  id: string;
  name: string;
}

interface ScopedLocation {
  id: string;
  brandId: string;
  name: string;
  city: string;
}

interface ListingsDashboardProps {
  tenantSlug: string;
  brands: ScopedBrand[];
  locations: ScopedLocation[];
  initialBrandId?: string;
  initialStoreId?: string;
}

export function ListingsDashboard({
  tenantSlug,
  brands,
  locations,
  initialBrandId,
  initialStoreId,
}: ListingsDashboardProps) {
  const brandCtx = useActiveBrand();
  const [selectedBrandId, setSelectedBrandId] = useState<string>(
    initialBrandId || brandCtx?.activeBrandId || brands[0]?.id || ''
  );

  useEffect(() => {
    if (brandCtx?.activeBrandId && brandCtx.activeBrandId !== selectedBrandId) {
      setSelectedBrandId(brandCtx.activeBrandId);
    }
  }, [brandCtx?.activeBrandId]);

  const filteredStores = locations.filter((loc) =>
    selectedBrandId ? loc.brandId === selectedBrandId : true
  );

  const [selectedStoreId, setSelectedStoreId] = useState<string>(
    initialStoreId || filteredStores[0]?.id || ''
  );

  useEffect(() => {
    if (filteredStores.length > 0 && !filteredStores.some((s) => s.id === selectedStoreId)) {
      setSelectedStoreId(filteredStores[0]!.id);
    }
  }, [selectedBrandId, filteredStores, selectedStoreId]);

  const [activeTab, setActiveTab] = useState<'listings' | 'changesets' | 'duplicates' | 'hours'>('listings');

  // State
  const [summary, setSummary] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [changesets, setChangesets] = useState<any[]>([]);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [hours, setHours] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchSummary = async () => {
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/listings/summary${selectedBrandId ? `?brandId=${selectedBrandId}` : ''}`);
      if (res.ok) {
        const json = await res.json();
        setSummary(json.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStoreData = async () => {
    if (!selectedStoreId) return;
    setLoading(true);
    try {
      const [listRes, changeRes, dupRes, hourRes] = await Promise.all([
        fetch(`/api/tenants/${tenantSlug}/listings/stores/${selectedStoreId}`),
        fetch(`/api/tenants/${tenantSlug}/listings/changesets`),
        fetch(`/api/tenants/${tenantSlug}/listings/duplicates?storeId=${selectedStoreId}`),
        fetch(`/api/tenants/${tenantSlug}/listings/stores/${selectedStoreId}/hours`),
      ]);

      if (listRes.ok) {
        const json = await listRes.json();
        setListings(json.data || []);
      }
      if (changeRes.ok) {
        const json = await changeRes.json();
        setChangesets(json.data || []);
      }
      if (dupRes.ok) {
        const json = await dupRes.json();
        setDuplicates(json.data || []);
      }
      if (hourRes.ok) {
        const json = await hourRes.json();
        setHours(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [selectedBrandId]);

  useEffect(() => {
    fetchStoreData();
  }, [selectedStoreId]);

  const handleAuditAll = async () => {
    if (!selectedStoreId) return;
    setActionLoading('audit');
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/listings/stores/${selectedStoreId}`, {
        method: 'POST',
      });
      if (res.ok) {
        setNotice({ message: 'Store listings audit completed successfully.', type: 'success' });
        await fetchStoreData();
        await fetchSummary();
      } else {
        setNotice({ message: 'Failed to run audit.', type: 'error' });
      }
    } catch {
      setNotice({ message: 'Network error during audit.', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleProposeChangeSet = async (listingId: string) => {
    setActionLoading(`propose-${listingId}`);
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/listings/changesets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId }),
      });
      if (res.ok) {
        setNotice({ message: 'Change set proposed for review.', type: 'success' });
        await fetchStoreData();
        await fetchSummary();
      } else {
        const data = await res.json();
        setNotice({ message: data.error?.message || 'Failed to propose change set.', type: 'error' });
      }
    } catch {
      setNotice({ message: 'Error proposing change set.', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReviewChangeSet = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
    setActionLoading(`review-${id}`);
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/listings/changesets/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reviewNote: `Human reviewed via dashboard` }),
      });
      if (res.ok) {
        setNotice({ message: `Change set ${decision.toLowerCase()} successfully.`, type: 'success' });
        await fetchStoreData();
        await fetchSummary();
      } else {
        const data = await res.json();
        setNotice({ message: data.error?.message || 'Review action failed.', type: 'error' });
      }
    } catch {
      setNotice({ message: 'Network error during review.', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolveDuplicate = async (id: string, status: string) => {
    setActionLoading(`dup-${id}`);
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/listings/duplicates/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, resolutionNote: 'Resolved via LocalBI UI' }),
      });
      if (res.ok) {
        setNotice({ message: 'Duplicate candidate resolved.', type: 'success' });
        await fetchStoreData();
        await fetchSummary();
      }
    } catch {
      setNotice({ message: 'Failed to resolve duplicate.', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveHours = async () => {
    if (!selectedStoreId) return;
    setActionLoading('save-hours');
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/listings/stores/${selectedStoreId}/hours`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours }),
      });
      if (res.ok) {
        setNotice({ message: 'Store hours saved successfully.', type: 'success' });
        await fetchStoreData();
      } else {
        setNotice({ message: 'Failed to save store hours.', type: 'error' });
      }
    } catch {
      setNotice({ message: 'Network error saving hours.', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-950">
            Local Listings & Citations
          </h1>
          <p className="text-sm text-gray-700">
            NAP consistency audit, duplicate detection, and human-in-the-loop sync engine across major directories.
          </p>
        </div>

        {/* Brand & Store Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Brand Selector - Commented out per client feedback: Brand selection is handled globally via the top header. Uncomment if local selection is needed.
          {brands.length > 1 && (
            <select
              value={selectedBrandId}
              onChange={(e) => {
                const newId = e.target.value;
                setSelectedBrandId(newId);
                brandCtx?.setActiveBrandId(newId);
              }}
              className="text-sm rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
          */}

          <select
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value)}
            className="text-sm rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          >
            {filteredStores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.city})
              </option>
            ))}
          </select>

          <button
            onClick={handleAuditAll}
            disabled={actionLoading === 'audit' || !selectedStoreId}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${actionLoading === 'audit' ? 'animate-spin' : ''}`} />
            Run NAP Audit
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {notice && (
        <div
          className={`flex items-center justify-between rounded-lg p-4 text-sm ${
            notice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{notice.message}</span>
          <button onClick={() => setNotice(null)} className="font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-gray-700 text-xs font-medium uppercase tracking-wider">
            <span>NAP Health Score</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-950">
            {summary ? `${summary.healthScore}%` : '—'}
          </div>
          <div className="mt-1 text-xs text-gray-700">Consistent directory data</div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-gray-700 text-xs font-medium uppercase tracking-wider">
            <span>Connected Listings</span>
            <Building2 className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-950">
            {summary ? summary.totalListings : '—'}
          </div>
          <div className="mt-1 text-xs text-emerald-600 font-medium">
            {summary ? `${summary.healthyListings} healthy` : ''}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-gray-700 text-xs font-medium uppercase tracking-wider">
            <span>NAP Mismatches</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600">
            {summary ? summary.mismatchedListings : '—'}
          </div>
          <div className="mt-1 text-xs text-gray-700">Requires correction</div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-gray-700 text-xs font-medium uppercase tracking-wider">
            <span>Open Duplicates</span>
            <Copy className="h-4 w-4 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-purple-600">
            {summary ? summary.openDuplicates : '—'}
          </div>
          <div className="mt-1 text-xs text-gray-700">Flagged candidates</div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-gray-700 text-xs font-medium uppercase tracking-wider">
            <span>Review Queue</span>
            <Clock className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-indigo-600">
            {summary ? summary.pendingChangeSets : '—'}
          </div>
          <div className="mt-1 text-xs text-gray-700">Pending changesets</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('listings')}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'listings'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            Directory Presence ({listings.length})
          </button>
          <button
            onClick={() => setActiveTab('changesets')}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'changesets'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            Changeset Review Queue ({changesets.filter((c) => c.status === 'PENDING').length})
          </button>
          <button
            onClick={() => setActiveTab('duplicates')}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'duplicates'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            Duplicate Candidates ({duplicates.length})
          </button>
          <button
            onClick={() => setActiveTab('hours')}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'hours'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            Structured Store Hours
          </button>
        </nav>
      </div>

      {/* Tab 1: Directory Presence */}
      {activeTab === 'listings' && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-700">Loading directory listings...</div>
          ) : listings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
              <Building2 className="mx-auto h-8 w-8 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-950">No directory listings mapped yet</h3>
              <p className="mt-1 text-sm text-gray-700">
                Run an initial discovery or map a Google Business Profile or Apple Business Connect listing.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {listings.map((item) => (
                <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-950">{item.capabilities?.name || item.provider}</span>
                        {item.capabilities?.isManualOnly && (
                          <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
                            Manual Portal
                          </span>
                        )}
                        {!item.capabilities?.isManualOnly && (
                          <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                            API Sync
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-700 mt-0.5">
                        Status: <span className="font-medium text-gray-800">{item.status}</span>
                      </p>
                    </div>

                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        item.napOverallStatus === 'HEALTHY'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.napOverallStatus === 'MISMATCH'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {item.napOverallStatus}
                    </span>
                  </div>

                  {/* NAP field comparison */}
                  <div className="rounded-lg bg-gray-50 p-3 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-medium">Business Name:</span>
                      <span className={`font-semibold ${item.napNameStatus === 'MATCH' ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {item.snapshotName || '(empty)'} ({item.napNameStatus})
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-medium">Phone Number:</span>
                      <span className={`font-semibold ${item.napPhoneStatus === 'MATCH' ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {item.snapshotPhone || '(empty)'} ({item.napPhoneStatus})
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-medium">Physical Address:</span>
                      <span className={`font-semibold ${item.napAddressStatus === 'MATCH' ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {item.snapshotAddress ? item.snapshotAddress.slice(0, 30) + '...' : '(empty)'} ({item.napAddressStatus})
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-medium">Website URL:</span>
                      <span className={`font-semibold ${item.napWebsiteStatus === 'MATCH' ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {item.snapshotWebsite || '(empty)'} ({item.napWebsiteStatus})
                      </span>
                    </div>
                  </div>

                  {/* Action Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    {item.providerUrl ? (
                      <a
                        href={item.providerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        View in Directory <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-gray-600">No external link</span>
                    )}

                    {item.napOverallStatus === 'MISMATCH' && (
                      <button
                        onClick={() => handleProposeChangeSet(item.id)}
                        disabled={actionLoading === `propose-${item.id}`}
                        className="inline-flex items-center gap-1.5 rounded bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
                      >
                        <FileEdit className="h-3.5 w-3.5" />
                        Propose Correction
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Change Sets Queue */}
      {activeTab === 'changesets' && (
        <div className="space-y-4">
          {changesets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
              <h3 className="mt-2 text-sm font-medium text-gray-950">No pending change sets</h3>
              <p className="mt-1 text-sm text-gray-700">All directory profiles match canonical data.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {changesets.map((cs) => (
                <div key={cs.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-gray-950">{cs.listing?.provider || 'Listing'}</span>
                      <span className="ml-2 text-xs text-gray-700">
                        Proposed: {new Date(cs.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                        cs.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-800'
                          : cs.status === 'APPLIED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : cs.status === 'MANUAL_ACTION_REQUIRED'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {cs.status}
                    </span>
                  </div>

                  {/* Diff items */}
                  <div className="rounded-lg bg-gray-50 p-3 space-y-2 text-xs">
                    {(cs.proposedChanges || []).map((diff: any, idx: number) => (
                      <div key={idx} className="border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                        <div className="font-semibold text-gray-800 uppercase">{diff.field}</div>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <div className="text-rose-700">
                            <span className="text-gray-700">Current Provider:</span> {diff.providerValue || '(none)'}
                          </div>
                          <div className="text-emerald-700">
                            <span className="text-gray-700">Canonical Target:</span> {diff.canonicalValue}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Review Note / Manual Instructions */}
                  {cs.reviewNote && (
                    <div className="text-xs bg-blue-50 border border-blue-200 text-blue-900 p-3 rounded-lg whitespace-pre-wrap font-mono">
                      {cs.reviewNote}
                    </div>
                  )}

                  {/* Action buttons if PENDING */}
                  {cs.status === 'PENDING' && (
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => handleReviewChangeSet(cs.id, 'REJECTED')}
                        disabled={actionLoading === `review-${cs.id}`}
                        className="inline-flex items-center gap-1 rounded px-3 py-1.5 text-xs font-semibold text-gray-700 border border-gray-300 hover:bg-gray-50"
                      >
                        <X className="h-3.5 w-3.5 text-rose-500" />
                        Reject
                      </button>
                      <button
                        onClick={() => handleReviewChangeSet(cs.id, 'APPROVED')}
                        disabled={actionLoading === `review-${cs.id}`}
                        className="inline-flex items-center gap-1 rounded bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Approve & Apply
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Duplicate Candidates */}
      {activeTab === 'duplicates' && (
        <div className="space-y-4">
          {duplicates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
              <h3 className="mt-2 text-sm font-medium text-gray-950">No duplicate candidates detected</h3>
              <p className="mt-1 text-sm text-gray-700">No overlapping listings found on active providers.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {duplicates.map((dup) => (
                <div key={dup.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-950">{dup.provider}</span>
                      <span className="rounded bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 border border-purple-200">
                        {dup.confidence} Confidence
                      </span>
                    </div>
                    <span className="text-xs text-gray-700 font-medium">Status: {dup.status}</span>
                  </div>

                  <p className="text-xs text-gray-700">{dup.evidenceSummary}</p>

                  <div className="flex items-center gap-4 text-xs text-gray-700">
                    <span>Shared Phone: {dup.sharedPhone ? 'Yes' : 'No'}</span>
                    <span>Shared Address: {dup.sharedAddress ? 'Yes' : 'No'}</span>
                    <span>Shared Place ID: {dup.sharedPlaceId ? 'Yes' : 'No'}</span>
                  </div>

                  {dup.status === 'OPEN' && (
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => handleResolveDuplicate(dup.id, 'DISMISSED')}
                        className="rounded px-3 py-1.5 text-xs font-semibold text-gray-700 border border-gray-300 hover:bg-gray-50"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => handleResolveDuplicate(dup.id, 'CONFIRMED_DUPLICATE')}
                        className="rounded bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700"
                      >
                        Confirm Duplicate
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Structured Store Hours */}
      {activeTab === 'hours' && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-semibold text-gray-950">Structured Weekly Hours</h3>
            <p className="text-sm text-gray-700">
              Canonical opening and closing hours distributed to all verified directory profiles.
            </p>
          </div>

          <div className="space-y-3">
            {days.map((dayName, index) => {
              const currentDay = hours.find((h) => h.dayOfWeek === index) || {
                dayOfWeek: index,
                isClosed: false,
                openTime: '09:00',
                closeTime: '18:00',
              };

              return (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                  <span className="w-28 text-sm font-medium text-gray-900">{dayName}</span>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={currentDay.isClosed}
                        onChange={(e) => {
                          const updated = [...hours];
                          const idx = updated.findIndex((h) => h.dayOfWeek === index);
                          if (idx >= 0) {
                            updated[idx] = { ...updated[idx], isClosed: e.target.checked };
                          } else {
                            updated.push({ dayOfWeek: index, isClosed: e.target.checked, openTime: '09:00', closeTime: '18:00' });
                          }
                          setHours(updated);
                        }}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      Closed
                    </label>

                    {!currentDay.isClosed && (
                      <div className="flex items-center gap-2 text-xs">
                        <input
                          type="time"
                          value={currentDay.openTime || '09:00'}
                          onChange={(e) => {
                            const updated = [...hours];
                            const idx = updated.findIndex((h) => h.dayOfWeek === index);
                            if (idx >= 0) {
                              updated[idx] = { ...updated[idx], openTime: e.target.value };
                            } else {
                              updated.push({ dayOfWeek: index, isClosed: false, openTime: e.target.value, closeTime: '18:00' });
                            }
                            setHours(updated);
                          }}
                          className="rounded border border-gray-300 px-2 py-1 text-gray-800"
                        />
                        <span className="text-gray-700">to</span>
                        <input
                          type="time"
                          value={currentDay.closeTime || '18:00'}
                          onChange={(e) => {
                            const updated = [...hours];
                            const idx = updated.findIndex((h) => h.dayOfWeek === index);
                            if (idx >= 0) {
                              updated[idx] = { ...updated[idx], closeTime: e.target.value };
                            } else {
                              updated.push({ dayOfWeek: index, isClosed: false, openTime: '09:00', closeTime: e.target.value });
                            }
                            setHours(updated);
                          }}
                          className="rounded border border-gray-300 px-2 py-1 text-gray-800"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button
              onClick={handleSaveHours}
              disabled={actionLoading === 'save-hours'}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              Save Store Hours
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
