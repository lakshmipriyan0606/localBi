'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plug,
  ExternalLink,
  Store,
  Globe,
  BarChart3,
  X,
  Clock,
  Shield,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { browserClient } from '@/lib/http/browser-client';
import { notify } from '@/lib/notify';
import { useActiveBrand } from '@/providers/active-brand-context';

export interface GoogleIntegrationsModalProps {
  open: boolean;
  onClose: () => void;
  tenantSlug: string;
}

interface MappingStateResponse {
  connections: Array<{
    id: string;
    provider: string;
    externalEmail: string;
    grantedScopes?: string[];
    createdAt: string;
    lastUsedAt: string | null;
  }>;
  internalMappings: Array<{
    id: string;
    resourceId: string;
    internalType: string;
    internalId: string;
    brandId?: string | null;
    resourceName: string;
    externalResourceId: string;
    provider: string;
  }>;
  brands: Array<{ id: string; name: string; slug: string }>;
  locations: Array<{ id: string; name: string; brandId?: string }>;
}

interface SyncRunResponse {
  runs: Array<{
    id: string;
    provider: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    rowsIngested: number;
    errorCode?: string | null;
  }>;
}

export function GoogleIntegrationsModal({
  open,
  onClose,
  tenantSlug,
}: GoogleIntegrationsModalProps) {
  const brandCtx = useActiveBrand();
  const activeBrand = brandCtx?.activeBrand;

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [mappingState, setMappingState] = useState<MappingStateResponse | null>(null);
  const [syncRuns, setSyncRuns] = useState<SyncRunResponse['runs']>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch integration mapping and sync status
  const fetchIntegrationStatus = useCallback(async () => {
    if (!tenantSlug) return;
    setLoading(true);
    setError(null);

    try {
      const [mapRes, syncRes] = await Promise.all([
        browserClient.get<any>(`/api/tenants/${tenantSlug}/integrations/google/mappings`).catch(() => null),
        browserClient.get<any>(`/api/tenants/${tenantSlug}/sync`).catch(() => null),
      ]);

      if (mapRes && mapRes.data) {
        setMappingState(mapRes.data);
      }
      if (syncRes && syncRes.data && Array.isArray(syncRes.data.runs)) {
        setSyncRuns(syncRes.data.runs);
      }
    } catch (err: any) {
      console.error('[GoogleIntegrationsModal] Failed to load status:', err);
      setError('Unable to load latest Google connection state.');
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    if (open) {
      fetchIntegrationStatus();
    }
  }, [open, fetchIntegrationStatus]);

  // Trigger immediate sync
  const handleTriggerSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await browserClient.post<any>(`/api/tenants/${tenantSlug}/sync`, { provider: 'ALL' });
      notify.success(res.data?.message || 'Data synchronized successfully with Google APIs.');
      await fetchIntegrationStatus();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('localbi-sync-completed'));
      }
    } catch (err: any) {
      console.error('[GoogleIntegrationsModal] Sync failed:', err);
      notify.error(err?.message || 'Failed to trigger synchronization with Google.');
    } finally {
      setSyncing(false);
    }
  };

  if (!open) return null;

  const activeConnection = mappingState?.connections?.[0];
  const isConnected = Boolean(activeConnection);

  // Filter mappings for active brand
  const activeBrandId = activeBrand?.id || '';
  const brandMappings = mappingState?.internalMappings?.filter(
    (m) => m.internalId === activeBrandId || m.brandId === activeBrandId
  ) || [];

  const gscMapping = brandMappings.find((m) => m.provider === 'GOOGLE_SEARCH_CONSOLE');
  const ga4Mapping = brandMappings.find((m) => m.provider === 'GOOGLE_ANALYTICS_4');
  const gbpMapping = brandMappings.find((m) => m.provider === 'GOOGLE_BUSINESS_PROFILE');

  const latestSync = syncRuns[0];
  const isSyncActive = latestSync?.status === 'RUNNING';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Google Integrations and Sync Status"
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
              <Plug className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Google Integrations &amp; Sync</h2>
              <p className="text-[11px] text-slate-500">Live connection status and resource mapping</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[460px] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Account Connection Status */}
          <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Connected Google Account
              </span>
              {isConnected ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/70 rounded-full px-2 py-0.5">
                  <CheckCircle2 className="w-3 h-3" /> Connected &amp; Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/70 rounded-full px-2 py-0.5">
                  <AlertCircle className="w-3 h-3" /> Not Connected
                </span>
              )}
            </div>

            {isConnected ? (
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>{activeConnection?.externalEmail}</span>
                </div>
                {activeConnection?.createdAt && (
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Authorized {new Date(activeConnection.createdAt).toLocaleDateString()}</span>
                  </div>
                )}
                {activeConnection?.grantedScopes && activeConnection.grantedScopes.length > 0 && (
                  <div className="flex items-center gap-1 pt-1 flex-wrap">
                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                      <Shield className="w-3 h-3" /> Scopes:
                    </span>
                    {activeConnection.grantedScopes.slice(0, 3).map((scope, idx) => (
                      <span key={idx} className="text-[9.5px] font-mono bg-slate-200/70 text-slate-600 px-1.5 py-0.2 rounded">
                        {scope.split('/').pop()?.replace('auth.', '') || scope}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-slate-500">
                No active Google OAuth connection found. Connect your Google account to enable live GBP, GSC, and GA4 metrics.
              </div>
            )}
          </div>

          {/* 2. Active Brand Mappings */}
          <div className="p-4 rounded-xl border border-slate-200/80 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-xs font-bold text-slate-800">
                  Active Brand: <span className="text-indigo-600">{activeBrand?.name || 'All'}</span>
                </span>
              </div>
              <span className="text-[11px] font-semibold text-slate-500">
                {brandMappings.length} mapped resource{brandMappings.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {/* Search Console */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50/70 border border-slate-100">
                <div className="flex items-center gap-2 min-w-0">
                  <Globe className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800 truncate">Search Console (GSC)</div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {gscMapping?.resourceName || 'No property mapped'}
                    </div>
                  </div>
                </div>
                {gscMapping ? (
                  <span className="text-[10.5px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 flex-shrink-0">
                    Linked
                  </span>
                ) : (
                  <span className="text-[10.5px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full flex-shrink-0">
                    Unlinked
                  </span>
                )}
              </div>

              {/* Google Analytics 4 */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50/70 border border-slate-100">
                <div className="flex items-center gap-2 min-w-0">
                  <BarChart3 className="w-4 h-4 text-sky-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800 truncate">Google Analytics 4 (GA4)</div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {ga4Mapping?.resourceName || 'No property mapped'}
                    </div>
                  </div>
                </div>
                {ga4Mapping ? (
                  <span className="text-[10.5px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 flex-shrink-0">
                    Linked
                  </span>
                ) : (
                  <span className="text-[10.5px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full flex-shrink-0">
                    Unlinked
                  </span>
                )}
              </div>

              {/* Google Business Profile */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50/70 border border-slate-100">
                <div className="flex items-center gap-2 min-w-0">
                  <Store className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800 truncate">Google Business Profile (GBP)</div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {gbpMapping?.resourceName || 'No location linked'}
                    </div>
                  </div>
                </div>
                {gbpMapping ? (
                  <span className="text-[10.5px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 flex-shrink-0">
                    Linked
                  </span>
                ) : (
                  <span className="text-[10.5px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full flex-shrink-0">
                    Unlinked
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 3. Synchronization & Actions */}
          <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-800">Data Synchronization</div>
              <div className="text-[11px] text-slate-500">
                {latestSync?.startedAt ? (
                  <span>Last sync: {new Date(latestSync.startedAt).toLocaleString()}</span>
                ) : (
                  <span>No sync history recorded</span>
                )}
              </div>
            </div>

            <button
              type="button"
              disabled={syncing || isSyncActive || !isConnected}
              onClick={handleTriggerSync}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer',
                isConnected && !syncing
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              )}
            >
              <RefreshCw className={cn('w-3.5 h-3.5', syncing || isSyncActive ? 'animate-spin' : '')} />
              <span>{syncing || isSyncActive ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-white">
          <Link
            href={`/client/${tenantSlug}/integrations`}
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            <span>Manage All Integrations &amp; Mappings</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
