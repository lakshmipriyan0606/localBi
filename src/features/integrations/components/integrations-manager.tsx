'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Globe,
  MapPin,
  RefreshCw,
  Unlink,
  CheckCircle2,
  AlertCircle,
  Zap,
  ArrowRight,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { browserClient } from '@/lib/http/browser-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { IntegrationsDisconnectDialog } from './integrations-disconnect-dialog';
import { formatRelativeTime } from '@/shared/lib/formatters';

export interface IntegrationsManagerProps {
  tenantSlug: string;
  tenantId: string;
  initialState: {
    connections: Array<{
      id: string;
      provider: string;
      externalEmail: string;
      createdAt: string;
      lastUsedAt: string | null;
    }>;
    externalResources: Array<{
      id: string;
      provider: string;
      externalResourceId: string;
      resourceType: 'LOCATION' | 'PROPERTY';
      resourceName: string;
      accountName: string;
    }>;
    internalMappings: Array<{
      id: string;
      resourceId: string;
      internalType: 'LOCATION' | 'BRAND';
      internalId: string;
      resourceName: string;
      externalResourceId: string;
      provider: string;
    }>;
    brands: Array<{ id: string; name: string; slug: string }>;
    locations: Array<{
      id: string;
      brandId: string;
      name: string;
      storeCode: string | null;
      addressLine1: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
      timezone: string;
    }>;
  };
  userRole: string;
}

export function IntegrationsManager({
  tenantSlug,
  initialState,
  userRole,
}: IntegrationsManagerProps) {
  const router = useRouter();

  // Async action states
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAutoMapping, setIsAutoMapping] = useState(false);
  const [mappingInProgressId, setMappingInProgressId] = useState<string | null>(null);
  const [unmappingInProgressId, setUnmappingInProgressId] = useState<string | null>(null);

  // Status banners
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  // Individual selection states for mapping rows
  const [pendingBrandSelections, setPendingBrandSelections] = useState<Record<string, string>>({});
  const [pendingLocationSelections, setPendingLocationSelections] = useState<Record<string, string>>({});

  const canManage =
    userRole === 'CLIENT_OWNER' ||
    userRole === 'CLIENT_ADMIN' ||
    userRole === 'PLATFORM_SUPER_ADMIN';

  const activeConnection = initialState.connections[0];
  const isAuthorized = Boolean(activeConnection);

  // Separate discovered resources into GSC properties and GBP locations
  const gscResources = initialState.externalResources.filter((r) => r.resourceType === 'PROPERTY');
  const gbpResources = initialState.externalResources.filter((r) => r.resourceType === 'LOCATION');

  // Mapped vs Unmapped tracking
  const mappedGscResourceIds = new Set(
    initialState.internalMappings
      .filter((m) => m.internalType === 'BRAND')
      .map((m) => m.resourceId)
  );

  const mappedGbpResourceIds = new Set(
    initialState.internalMappings
      .filter((m) => m.internalType === 'LOCATION')
      .map((m) => m.resourceId)
  );

  const mappedGscCount = gscResources.filter((r) => mappedGscResourceIds.has(r.id)).length;
  const mappedGbpCount = gbpResources.filter((r) => mappedGbpResourceIds.has(r.id)).length;
  const totalMappingsCount = initialState.internalMappings.length;

  // Handler: Initiate Google OAuth
  const handleConnect = async () => {
    setIsConnecting(true);
    setErrorMsg(null);
    try {
      const res = await browserClient.get<{ success: boolean; data: { authorizationUrl: string } }>(
        `/tenants/${tenantSlug}/integrations/google/connect`
      );
      if (res.data?.data?.authorizationUrl) {
        window.location.href = res.data.data.authorizationUrl;
      }
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Failed to initiate Google authorization');
      setIsConnecting(false);
    }
  };

  // Handler: Disconnect Google Connection
  const handleConfirmDisconnect = async () => {
    setShowDisconnectModal(false);
    setErrorMsg(null);
    try {
      await browserClient.post(`/tenants/${tenantSlug}/integrations/google/disconnect`, {
        connectionId: activeConnection?.id,
      });
      setSuccessMsg('Google account disconnected successfully.');
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Failed to disconnect Google account');
    }
  };

  // Handler: Refresh Discovered Resources from Google APIs
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setErrorMsg(null);
    try {
      await browserClient.post(`/tenants/${tenantSlug}/integrations/google/resources`, {
        connectionId: activeConnection?.id,
      });
      setSuccessMsg('Google resources refreshed successfully.');
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Failed to refresh Google resources');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handler: Map a single GSC property to a Brand
  const handleMapGsc = async (externalResourceId: string) => {
    const brandId = pendingBrandSelections[externalResourceId] || initialState.brands[0]?.id;
    if (!brandId) {
      setErrorMsg('Please select a client brand to map this website to.');
      return;
    }
    setMappingInProgressId(externalResourceId);
    setErrorMsg(null);
    try {
      await browserClient.post(`/tenants/${tenantSlug}/integrations/google/mappings`, {
        type: 'BRAND',
        internalId: brandId,
        externalResourceId,
      });
      setSuccessMsg('Website property linked successfully.');
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Failed to map website property');
    } finally {
      setMappingInProgressId(null);
    }
  };

  // Handler: Map a single GBP location to a Storefront Location
  const handleMapLocation = async (externalResourceId: string) => {
    const locationId = pendingLocationSelections[externalResourceId] || initialState.locations[0]?.id;
    if (!locationId) {
      setErrorMsg('Please select a storefront location to map this Google Business Profile to.');
      return;
    }
    setMappingInProgressId(externalResourceId);
    setErrorMsg(null);
    try {
      await browserClient.post(`/tenants/${tenantSlug}/integrations/google/mappings`, {
        type: 'LOCATION',
        internalId: locationId,
        externalResourceId,
      });
      setSuccessMsg('Storefront location linked successfully.');
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Failed to map storefront location');
    } finally {
      setMappingInProgressId(null);
    }
  };

  // Handler: Unmap an active mapping
  const handleUnmap = async (mappingId: string) => {
    setUnmappingInProgressId(mappingId);
    setErrorMsg(null);
    try {
      await browserClient.delete(
        `/tenants/${tenantSlug}/integrations/google/mappings?mappingId=${mappingId}`
      );
      setSuccessMsg('Link removed successfully.');
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Failed to remove link');
    } finally {
      setUnmappingInProgressId(null);
    }
  };

  // Handler: Auto-map all locations matching brand keywords
  const handleAutoMapBrand = async () => {
    const defaultBrand = initialState.brands[0];
    if (!defaultBrand) return;
    setIsAutoMapping(true);
    setErrorMsg(null);
    try {
      const res = await browserClient.post<{
        success: boolean;
        data: {
          brandId: string;
          brandName: string;
          mappedCount: number;
        };
      }>(`/tenants/${tenantSlug}/integrations/google/mappings`, {
        type: 'AUTO_BRAND',
        brandId: defaultBrand.id,
      });

      const count = res.data?.data?.mappedCount ?? 0;
      if (count > 0) {
        setSuccessMsg(`Successfully auto-linked ${count} location(s) for ${defaultBrand.name}!`);
      } else {
        setSuccessMsg(`No additional auto-matches found. You can link locations manually below.`);
      }
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Failed to auto-link locations');
    } finally {
      setIsAutoMapping(false);
    }
  };

  // Handler: Trigger background data synchronization
  const handleTriggerSync = async () => {
    setIsSyncing(true);
    setErrorMsg(null);
    try {
      const res = await browserClient.post<{
        success: boolean;
        data: { scheduledJobsCount: number };
      }>(`/tenants/${tenantSlug}/sync`, {});
      setSuccessMsg(
        `Sync started! Dispatched ${res.data?.data?.scheduledJobsCount || 0} ingestion workers. Telemetry will update shortly.`
      );
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Failed to start sync');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Alert Messages */}
      {errorMsg && (
        <div className="flex items-center justify-between gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-rose-600 hover:text-rose-800 font-bold text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center justify-between gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TOP AT-A-GLANCE STATUS BAR (3 Key Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Google Account */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Google Account</span>
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                isAuthorized
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {isAuthorized ? '✓ Connected' : 'Not Connected'}
            </span>
          </div>
          <div className="mt-2.5">
            <p className="text-sm font-bold text-slate-900 truncate">
              {activeConnection ? activeConnection.externalEmail : 'Awaiting Sign-in'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {activeConnection ? 'OAuth 2.0 Token Active' : 'Step 1 below'}
            </p>
          </div>
        </div>

        {/* 2. Google Search Console */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Search Console</span>
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                mappedGscCount > 0
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : gscResources.length > 0
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {mappedGscCount > 0
                ? `${mappedGscCount} Connected`
                : gscResources.length > 0
                ? `${gscResources.length} Pending`
                : 'No Websites'}
            </span>
          </div>
          <div className="mt-2.5">
            <p className="text-sm font-bold text-slate-900">
              {mappedGscCount > 0
                ? 'Website Linked'
                : gscResources.length > 0
                ? 'Action Required'
                : '0 Properties Found'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {mappedGscCount > 0 ? 'Organic telemetry streaming' : 'Map your site in Step 2'}
            </p>
          </div>
        </div>

        {/* 3. Google Business Profile */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Business Profile</span>
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                mappedGbpCount > 0
                  ? 'bg-teal-50 text-teal-700 border border-teal-200'
                  : gbpResources.length > 0
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {mappedGbpCount > 0
                ? `${mappedGbpCount} Connected`
                : gbpResources.length > 0
                ? `${gbpResources.length} Pending`
                : 'No Locations'}
            </span>
          </div>
          <div className="mt-2.5">
            <p className="text-sm font-bold text-slate-900">
              {mappedGbpCount > 0
                ? 'Storefront Linked'
                : gbpResources.length > 0
                ? 'Action Required'
                : '0 Locations Found'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {mappedGbpCount > 0 ? 'Local reach & Maps active' : 'Map storefront in Step 2'}
            </p>
          </div>
        </div>

        {/* 4. Telemetry Sync Status */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Live Sync</span>
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                totalMappingsCount > 0
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {totalMappingsCount > 0 ? 'Ready to Sync' : 'Setup Required'}
            </span>
          </div>
          <div className="mt-2.5">
            <p className="text-sm font-bold text-slate-900">
              {totalMappingsCount > 0 ? `${totalMappingsCount} Active Links` : 'No Links Yet'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {totalMappingsCount > 0 ? 'Background workers ready' : 'Complete mapping below'}
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: GOOGLE ACCOUNT CONNECTION                                         */}
      {/* ========================================================================= */}
      <Card className="border-slate-200/90 shadow-2xs rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50/60 border-b border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center flex-shrink-0 text-indigo-600 font-bold text-base">
                1
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-bold text-slate-900">
                    Step 1: Google Account Connection
                  </CardTitle>
                  <Badge
                    className={
                      isAuthorized
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200 text-[11px]'
                        : 'bg-amber-100 text-amber-800 border-amber-200 text-[11px]'
                    }
                  >
                    {isAuthorized ? '✓ Account Authorized' : 'Sign-in Required'}
                  </Badge>
                </div>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Sign in with the Google Account that has access to your website in Google Search Console and your store in Google Business Profile.
                </CardDescription>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {isAuthorized ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isRefreshing || !canManage}
                    className="text-xs font-semibold text-slate-700 gap-1.5"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>{isRefreshing ? 'Refreshing…' : 'Refresh Resources'}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDisconnectModal(true)}
                    disabled={!canManage}
                    className="text-xs font-semibold text-rose-700 border-rose-200 hover:bg-rose-50 gap-1.5"
                  >
                    <Unlink className="h-3.5 w-3.5" />
                    <span>Disconnect</span>
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={handleConnect}
                  disabled={isConnecting || !canManage}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs gap-1.5 px-4 py-2 shadow-xs"
                >
                  <Globe className="h-4 w-4" />
                  <span>{isConnecting ? 'Connecting to Google…' : 'Connect Google Account'}</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5">
          {activeConnection ? (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-xl">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm flex-shrink-0">
                  {activeConnection.externalEmail.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-sm">
                      {activeConnection.externalEmail}
                    </span>
                    <span className="text-[10.5px] font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                      ✓ Ready for Reporting
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Authorized on {new Date(activeConnection.createdAt).toLocaleDateString()} • Verified {formatRelativeTime(new Date(activeConnection.lastUsedAt || activeConnection.createdAt))}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-medium shadow-2xs">
                  <Globe className="h-3.5 w-3.5 text-indigo-600" />
                  <span>{gscResources.length} Search Console Property(s)</span>
                </span>
                <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-medium shadow-2xs">
                  <MapPin className="h-3.5 w-3.5 text-teal-600" />
                  <span>{gbpResources.length} Business Location(s)</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center space-y-3 bg-slate-50/70 border border-dashed border-slate-200 rounded-xl">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
                <Globe className="h-6 w-6" />
              </div>
              <div className="max-w-md mx-auto">
                <h4 className="font-bold text-slate-900 text-sm">No Google Account Connected Yet</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Click the button below to sign in with Google. localBi requests read-only telemetry access for Search Console and Business Profile.
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleConnect}
                disabled={isConnecting || !canManage}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs gap-2 px-5 py-2.5 shadow-xs"
              >
                <span>{isConnecting ? 'Connecting to Google…' : 'Sign in with Google'}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* STEP 2: WHAT IS CONNECTED VS WHAT IS PENDING (RESOURCES MAPPING)           */}
      {/* ========================================================================= */}
      <Card className="border-slate-200/90 shadow-2xs rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50/60 border-b border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center flex-shrink-0 text-indigo-600 font-bold text-base">
                2
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-bold text-slate-900">
                    Step 2: Connect Your Website & Storefront
                  </CardTitle>
                  <Badge
                    className={
                      mappedGscCount > 0 || mappedGbpCount > 0
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200 text-[11px]'
                        : 'bg-amber-100 text-amber-800 border-amber-200 text-[11px]'
                    }
                  >
                    {mappedGscCount > 0 && mappedGbpCount > 0
                      ? '✓ All Resources Connected'
                      : totalMappingsCount > 0
                      ? 'Partially Connected'
                      : 'Pending Connection'}
                  </Badge>
                </div>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  See what is already connected (green) and what is still pending (amber). Connect each item with 1 click.
                </CardDescription>
              </div>
            </div>

            {gbpResources.length > 1 && canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoMapBrand}
                disabled={isAutoMapping}
                className="text-xs font-semibold text-indigo-700 border-indigo-200 hover:bg-indigo-50 gap-1.5 self-end sm:self-auto"
              >
                <Zap className={`h-3.5 w-3.5 ${isAutoMapping ? 'animate-spin' : ''}`} />
                <span>{isAutoMapping ? 'Auto-Linking…' : '⚡ Auto-Link All Locations'}</span>
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ---------------------------------------------------------------- */}
            {/* COLUMN A: GOOGLE SEARCH CONSOLE (WEBSITES)                       */}
            {/* ---------------------------------------------------------------- */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">Google Search Console (Websites)</h3>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {mappedGscCount} of {gscResources.length} Linked
                </span>
              </div>

              {!isAuthorized ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200/60">
                  Sign in with Google in Step 1 to discover your Search Console websites.
                </div>
              ) : gscResources.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200/60 space-y-2">
                  <p className="font-semibold text-slate-700">No Search Console websites found</p>
                  <p className="text-[11.5px] text-slate-500 leading-relaxed">
                    Make sure your Google account ({activeConnection?.externalEmail}) has verified ownership of your domain in Google Search Console, then click &ldquo;Refresh Resources&rdquo; above.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {gscResources.map((res) => {
                    const activeMapping = initialState.internalMappings.find(
                      (m) => m.resourceId === res.id && m.internalType === 'BRAND'
                    );
                    const mappedBrand = initialState.brands.find((b) => b.id === activeMapping?.internalId);
                    const isMapped = Boolean(activeMapping);
                    const isProcessing = mappingInProgressId === res.id || unmappingInProgressId === activeMapping?.id;

                    return (
                      <div
                        key={res.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isMapped
                            ? 'bg-emerald-50/40 border-emerald-200 text-slate-900'
                            : 'bg-amber-50/40 border-amber-200 text-slate-900'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                  isMapped
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {isMapped ? '✓ Connected' : '⚠️ Pending Setup'}
                              </span>
                              <span className="text-xs font-bold text-slate-900 truncate">
                                {res.externalResourceId}
                              </span>
                            </div>

                            {isMapped ? (
                              <p className="text-xs text-emerald-800 font-medium">
                                Linked to Brand: <strong className="font-bold">{mappedBrand?.name || 'Brand'}</strong>
                              </p>
                            ) : (
                              <p className="text-[11.5px] text-amber-800">
                                This website is discovered from Google. Choose which brand it belongs to:
                              </p>
                            )}
                          </div>

                          {/* Action Button */}
                          {isMapped ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => activeMapping && handleUnmap(activeMapping.id)}
                              disabled={isProcessing || !canManage}
                              className="text-xs text-slate-600 hover:text-rose-700 border-slate-200 hover:bg-rose-50 flex-shrink-0"
                            >
                              {isProcessing ? 'Unlinking…' : 'Unlink'}
                            </Button>
                          ) : null}
                        </div>

                        {/* Unmapped setup control */}
                        {!isMapped && (
                          <div className="mt-3 pt-3 border-t border-amber-200/70 flex flex-col sm:flex-row sm:items-center gap-2">
                            <select
                              value={pendingBrandSelections[res.id] || initialState.brands[0]?.id || ''}
                              onChange={(e) =>
                                setPendingBrandSelections((prev) => ({
                                  ...prev,
                                  [res.id]: e.target.value,
                                }))
                              }
                              className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none flex-grow"
                            >
                              {initialState.brands.map((b) => (
                                <option key={b.id} value={b.id}>
                                  Connect to Brand: {b.name}
                                </option>
                              ))}
                            </select>

                            <Button
                              size="sm"
                              onClick={() => handleMapGsc(res.id)}
                              disabled={isProcessing || !canManage}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-1.5 flex-shrink-0"
                            >
                              {isProcessing ? 'Connecting…' : 'Connect Website'}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* COLUMN B: GOOGLE BUSINESS PROFILE (STOREFRONTS)                  */}
            {/* ---------------------------------------------------------------- */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-teal-600" />
                  <h3 className="text-sm font-bold text-slate-900">Google Business Profile (Storefronts)</h3>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {mappedGbpCount} of {gbpResources.length} Linked
                </span>
              </div>

              {!isAuthorized ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200/60">
                  Sign in with Google in Step 1 to discover your Business Profile locations.
                </div>
              ) : gbpResources.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200/60 space-y-2">
                  <p className="font-semibold text-slate-700">No Business Profile locations found</p>
                  <p className="text-[11.5px] text-slate-500 leading-relaxed">
                    Make sure your Google account ({activeConnection?.externalEmail}) has Primary Owner or Manager access to your Google Business Profile, then click &ldquo;Refresh Resources&rdquo; above.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {gbpResources.map((res) => {
                    const activeMapping = initialState.internalMappings.find(
                      (m) => m.resourceId === res.id && m.internalType === 'LOCATION'
                    );
                    const mappedLocation = initialState.locations.find((l) => l.id === activeMapping?.internalId);
                    const isMapped = Boolean(activeMapping);
                    const isProcessing = mappingInProgressId === res.id || unmappingInProgressId === activeMapping?.id;

                    return (
                      <div
                        key={res.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isMapped
                            ? 'bg-emerald-50/40 border-emerald-200 text-slate-900'
                            : 'bg-amber-50/40 border-amber-200 text-slate-900'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                  isMapped
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {isMapped ? '✓ Connected' : '⚠️ Pending Setup'}
                              </span>
                              <span className="text-xs font-bold text-slate-900 truncate">
                                {res.resourceName}
                              </span>
                            </div>

                            {isMapped ? (
                              <p className="text-xs text-emerald-800 font-medium">
                                Linked to Store: <strong className="font-bold">{mappedLocation?.name || 'Location'}</strong> ({mappedLocation?.city})
                              </p>
                            ) : (
                              <p className="text-[11.5px] text-amber-800">
                                This Google Business Profile location is ready to link. Choose your store:
                              </p>
                            )}
                          </div>

                          {/* Action Button */}
                          {isMapped ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => activeMapping && handleUnmap(activeMapping.id)}
                              disabled={isProcessing || !canManage}
                              className="text-xs text-slate-600 hover:text-rose-700 border-slate-200 hover:bg-rose-50 flex-shrink-0"
                            >
                              {isProcessing ? 'Unlinking…' : 'Unlink'}
                            </Button>
                          ) : null}
                        </div>

                        {/* Unmapped setup control */}
                        {!isMapped && (
                          <div className="mt-3 pt-3 border-t border-amber-200/70 flex flex-col sm:flex-row sm:items-center gap-2">
                            <select
                              value={pendingLocationSelections[res.id] || initialState.locations[0]?.id || ''}
                              onChange={(e) =>
                                setPendingLocationSelections((prev) => ({
                                  ...prev,
                                  [res.id]: e.target.value,
                                }))
                              }
                              className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none flex-grow"
                            >
                              {initialState.locations.map((loc) => (
                                <option key={loc.id} value={loc.id}>
                                  Connect to Store: {loc.name} ({loc.city})
                                </option>
                              ))}
                            </select>

                            <Button
                              size="sm"
                              onClick={() => handleMapLocation(res.id)}
                              disabled={isProcessing || !canManage}
                              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs px-4 py-1.5 flex-shrink-0"
                            >
                              {isProcessing ? 'Connecting…' : 'Connect Storefront'}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* STEP 3: LIVE TELEMETRY SYNCHRONIZATION                                    */}
      {/* ========================================================================= */}
      <Card className="border-slate-200/90 shadow-2xs rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50/60 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center flex-shrink-0 text-indigo-600 font-bold text-base">
              3
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Step 3: Synchronize Live Telemetry
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Dispatch background workers to fetch the latest Google Search impressions, clicks, keyword rankings, and Google Maps profile actions into localBi.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5">
          {totalMappingsCount > 0 ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-indigo-50/80 to-teal-50/80 border border-indigo-100 rounded-xl">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  <h4 className="font-bold text-slate-900 text-sm">
                    {totalMappingsCount} Google Resource(s) Linked & Ready to Stream
                  </h4>
                </div>
                <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
                  Click the button to pull your verified performance history into your workspace dashboards.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  onClick={handleTriggerSync}
                  disabled={isSyncing || !canManage}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2 gap-2 shadow-xs"
                >
                  <Zap className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Synchronizing…' : '⚡ Sync Google Data Now'}</span>
                </Button>

                <Link
                  href={`/t/${tenantSlug}/reports?tab=gsc`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <span>View Reports</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-500 bg-slate-50/80 border border-slate-200/60 rounded-xl space-y-1.5">
              <Info className="h-5 w-5 text-slate-400 mx-auto mb-1" />
              <p className="font-semibold text-slate-700">Pending Setup</p>
              <p className="text-[11.5px] text-slate-500 max-w-md mx-auto">
                Once you link at least one website or storefront location in Step 2 above, you will be able to synchronize your live Google data here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disconnect confirmation modal */}
      <IntegrationsDisconnectDialog
        open={showDisconnectModal}
        onOpenChange={setShowDisconnectModal}
        email={activeConnection?.externalEmail}
        onConfirm={handleConfirmDisconnect}
      />
    </div>
  );
}
