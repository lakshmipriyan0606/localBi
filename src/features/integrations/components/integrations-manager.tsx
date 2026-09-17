'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Link2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Unlink,
  MapPin,
  Tag,
  Globe,
  Sparkles,
  ArrowRight,
  Play,
  Layers,
  ChevronRight,
  Check,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { browserClient } from '@/lib/http/browser-client';
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

type SetupStage = 1 | 2 | 3 | 4 | 5 | 6;

export function IntegrationsManager({
  tenantSlug,
  initialState,
  userRole,
}: IntegrationsManagerProps) {
  const router = useRouter();
  const [activeStage, setActiveStage] = useState<SetupStage>(1);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  // Mapping Form State
  const [selectedLocationId, setSelectedLocationId] = useState<string>(
    initialState.locations[0]?.id || ''
  );
  const [selectedGbpResourceId, setSelectedGbpResourceId] = useState<string>('');

  const [selectedBrandId, setSelectedBrandId] = useState<string>(
    initialState.brands[0]?.id || ''
  );
  const [selectedGscResourceId, setSelectedGscResourceId] = useState<string>('');

  const activeConnection = initialState.connections[0];
  const gbpResources = initialState.externalResources.filter((r) => r.resourceType === 'LOCATION');
  const gscResources = initialState.externalResources.filter((r) => r.resourceType === 'PROPERTY');


  const canManageIntegrations =
    userRole === 'CLIENT_OWNER' || userRole === 'CLIENT_ADMIN' || userRole === 'PLATFORM_SUPER_ADMIN';

  // Read status indicators separately
  const isAccountAuthorized = Boolean(activeConnection);
  const hasDiscoveredResources = initialState.externalResources.length > 0;
  const hasMappings = initialState.internalMappings.length > 0;
  const isReadyForReporting = isAccountAuthorized && hasMappings;

  // Address match recommendation helper
  const selectedLocation = initialState.locations.find((l) => l.id === selectedLocationId);
  const matchRecommendations = useMemo(() => {
    return gbpResources.map((res) => {
      let score = 0;
      const matchReasons: string[] = [];
      if (
        selectedLocation?.storeCode &&
        res.resourceName.toLowerCase().includes(selectedLocation.storeCode.toLowerCase())
      ) {
        score += 50;
        matchReasons.push(`Store code "${selectedLocation.storeCode}" matches`);
      }
      if (
        selectedLocation?.city &&
        res.resourceName.toLowerCase().includes(selectedLocation.city.toLowerCase())
      ) {
        score += 30;
        matchReasons.push(`City "${selectedLocation.city}" matches`);
      }
      return {
        resourceId: res.id,
        score,
        reason: matchReasons.join(' • '),
      };
    });
  }, [gbpResources, selectedLocation]);

  const bestMatch = matchRecommendations
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)[0];

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

  const handleConfirmDisconnect = async () => {
    setShowDisconnectModal(false);
    setErrorMsg(null);
    try {
      await browserClient.post(`/tenants/${tenantSlug}/integrations/google/disconnect`, {
        connectionId: activeConnection?.id,
      });
      setSuccessMsg('Google account disconnected successfully. Active mappings have been safely unlinked.');
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Failed to disconnect Google account');
    }
  };

  const handleRefreshResources = async () => {
    setIsRefreshing(true);
    setErrorMsg(null);
    try {
      await browserClient.post(`/tenants/${tenantSlug}/integrations/google/resources`, {
        connectionId: activeConnection?.id,
      });
      setSuccessMsg('Discovered Google Business Profile locations and Search Console properties refreshed.');
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Failed to refresh Google resources');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleMapLocation = async () => {
    if (!selectedLocationId || !selectedGbpResourceId) {
      setErrorMsg('Please select both an internal storefront and a Google Business Profile location');
      return;
    }
    setErrorMsg(null);
    try {
      await browserClient.post(`/tenants/${tenantSlug}/integrations/google/mappings`, {
        type: 'LOCATION',
        internalId: selectedLocationId,
        externalResourceId: selectedGbpResourceId,
      });
      setSuccessMsg('Mapped Google Business Profile location successfully.');
      setSelectedGbpResourceId('');
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Failed to map location');
    }
  };

  const handleMapGsc = async () => {
    if (!selectedBrandId || !selectedGscResourceId) {
      setErrorMsg('Please select both an internal brand and a Google Search Console property');
      return;
    }
    setErrorMsg(null);
    try {
      await browserClient.post(`/tenants/${tenantSlug}/integrations/google/mappings`, {
        type: 'BRAND',
        internalId: selectedBrandId,
        externalResourceId: selectedGscResourceId,
      });
      setSuccessMsg('Mapped Google Search Console property successfully.');
      setSelectedGscResourceId('');
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Failed to map Search Console property');
    }
  };

  const handleUnmap = async (mappingId: string) => {
    setErrorMsg(null);
    try {
      await browserClient.delete(`/tenants/${tenantSlug}/integrations/google/mappings?mappingId=${mappingId}`);
      setSuccessMsg('Resource mapping removed.');
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Failed to unmap resource');
    }
  };

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    setErrorMsg(null);
    try {
      const res = await browserClient.post<{ success: boolean; data: { scheduledJobsCount: number } }>(
        `/tenants/${tenantSlug}/sync`,
        {}
      );
      setSuccessMsg(
        `Synchronization initiated! Enqueued ${res.data?.data?.scheduledJobsCount || 0} background ingestion jobs.`
      );
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Failed to start background sync');
    } finally {
      setIsSyncing(false);
    }
  };

  const stages: Array<{ id: SetupStage; label: string; status: 'completed' | 'current' | 'upcoming' }> = [
    { id: 1, label: '1. Context', status: isAccountAuthorized ? 'completed' : 'current' },
    { id: 2, label: '2. Authorize', status: isAccountAuthorized ? 'completed' : activeStage === 2 ? 'current' : 'upcoming' },
    { id: 3, label: '3. Discover', status: hasDiscoveredResources ? 'completed' : isAccountAuthorized ? 'current' : 'upcoming' },
    { id: 4, label: '4. Map Resources', status: hasMappings ? 'completed' : hasDiscoveredResources ? 'current' : 'upcoming' },
    { id: 5, label: '5. Ingest & Sync', status: hasMappings ? 'completed' : 'upcoming' },
    { id: 6, label: '6. Reports Ready', status: isReadyForReporting ? 'completed' : 'upcoming' },
  ];

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {errorMsg && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ── Guided Progress Stepper ── */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Google Integration Journey
            </span>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Stage {activeStage} of 6
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {stages.map((stage) => {
            const isSelected = activeStage === stage.id;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => setActiveStage(stage.id)}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-500'
                    : stage.status === 'completed'
                    ? 'border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50/60'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Step {stage.id}
                  </span>
                  {stage.status === 'completed' ? (
                    <Check className="h-3 w-3 text-emerald-600" />
                  ) : isSelected ? (
                    <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
                  ) : null}
                </div>
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {stage.label.replace(/^\d+\.\s*/, '')}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Service Readiness Overview Card ── */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-lg">
              G
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-slate-900">
                  Google Accounts
                </CardTitle>
                <Badge
                  className={
                    isAccountAuthorized
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }
                >
                  {isAccountAuthorized ? 'Account Authorized' : 'Not Connected'}
                </Badge>
                {hasMappings && (
                  <Badge className="bg-teal-100 text-teal-800 border-teal-200">
                    Resources Mapped
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                OAuth 2.0 connection for Google Business Profile and Search Console reporting
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeConnection ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshResources}
                  disabled={isRefreshing || !canManageIntegrations}
                  className="flex items-center gap-1.5 text-xs font-semibold"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Refresh Resources</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDisconnectModal(true)}
                  disabled={!canManageIntegrations}
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-700 border-red-200 hover:bg-red-50"
                >
                  <Unlink className="h-3.5 w-3.5" />
                  <span>Disconnect</span>
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={handleConnect}
                disabled={isConnecting || !canManageIntegrations}
                className="flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Link2 className="h-3.5 w-3.5" />
                <span>{isConnecting ? 'Opening Google…' : 'Authorize Google Account'}</span>
              </Button>
            )}
          </div>
        </CardHeader>

        {activeConnection && (
          <CardContent className="pt-0">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Authorized Email</span>
                  <span className="font-semibold text-slate-800">{activeConnection.externalEmail}</span>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Authorized At</span>
                  <span className="text-slate-700">{new Date(activeConnection.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Last Verified</span>
                  <span className="text-slate-700">{formatRelativeTime(new Date(activeConnection.lastUsedAt || activeConnection.createdAt))}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  Business Profile Active
                </Badge>
                <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200">
                  Search Console Active
                </Badge>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* ── Active Stage Content Area ── */}

      {/* STAGE 1: CHOOSE CONTEXT */}
      {activeStage === 1 && (
        <Card className="border-slate-200 shadow-xs">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-900">
              Stage 1: Choose Brand & Reporting Scope
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Confirm the client brand and scope for Google data authorization.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">Target Client Brands</span>
                <span className="text-slate-500">{initialState.brands.length} brand registered</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {initialState.brands.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200 shadow-xs"
                  >
                    <Tag className="h-3.5 w-3.5 text-indigo-600" />
                    <span className="font-semibold text-slate-800">{b.name}</span>
                    <span className="font-mono text-[10px] text-slate-400">({b.slug})</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 text-slate-700 space-y-2">
              <p className="font-semibold text-indigo-900">Permissions Requested During OAuth:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
                <li><strong>Google Business Profile:</strong> Read business information and aggregate performance metrics (search impressions, call button clicks, driving directions).</li>
                <li><strong>Google Search Console:</strong> Read-only search analytics data (queries, pages, country breakdown, position).</li>
              </ul>
              <p className="text-[11px] text-slate-500 pt-1">
                localBi strictly preserves tenant isolation. Tokens are encrypted server-side with AES-256-GCM and never shared with other workspaces.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                onClick={() => setActiveStage(2)}
                className="flex items-center gap-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <span>Continue to Authorization</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STAGE 2: AUTHORIZE GOOGLE */}
      {activeStage === 2 && (
        <Card className="border-slate-200 shadow-xs">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-900">
              Stage 2: Authorize Google Account
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Authenticate via Google OAuth to permit localBi to access your verified properties.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            {isAccountAuthorized ? (
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Google Account is actively connected</span>
                </div>
                <p className="text-slate-600">
                  Authorized as <strong className="text-slate-800">{activeConnection?.externalEmail}</strong>. Refresh tokens are securely stored and validated. Switching brands within this workspace will reuse this connection without requiring repeated consent.
                </p>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => setActiveStage(3)}
                    className="flex items-center gap-1 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white"
                  >
                    <span>Proceed to Resource Discovery</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center space-y-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto text-xl font-bold">
                  G
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 text-sm">No Google Account Connected Yet</h3>
                  <p className="text-slate-500 max-w-md mx-auto">
                    Sign in with the Google account that manages your Google Business Profile locations and Search Console properties.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleConnect}
                  disabled={isConnecting || !canManageIntegrations}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                >
                  <Link2 className="h-3.5 w-3.5 mr-1.5" />
                  <span>{isConnecting ? 'Redirecting to Google…' : 'Connect Google Account'}</span>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* STAGE 3: DISCOVER RESOURCES */}
      {activeStage === 3 && (
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                Stage 3: Discovered Google Resources
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Review verified storefront locations and Search Console domains discovered under your Google account.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshResources}
              disabled={isRefreshing || !canManageIntegrations}
              className="text-xs font-semibold"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Discovery</span>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* GBP Locations */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-teal-600" />
                    <span>Business Profile Locations ({gbpResources.length})</span>
                  </span>
                </div>
                {gbpResources.length === 0 ? (
                  <p className="text-slate-400 py-3 text-center">No GBP locations found</p>
                ) : (
                  <div className="space-y-2">
                    {gbpResources.map((res) => (
                      <div key={res.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900">{res.resourceName}</span>
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                            Verified
                          </Badge>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400">{res.externalResourceId}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* GSC Properties */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Search Console Properties ({gscResources.length})</span>
                  </span>
                </div>
                {gscResources.length === 0 ? (
                  <p className="text-slate-400 py-3 text-center">No GSC properties found</p>
                ) : (
                  <div className="space-y-2">
                    {gscResources.map((res) => (
                      <div key={res.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-semibold text-slate-900">{res.resourceName}</span>
                          <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px]">
                            {res.externalResourceId.startsWith('sc-domain:') ? 'Domain' : 'URL Prefix'}
                          </Badge>
                        </div>
                        <span className="text-[10px] text-slate-400">Full Owner Permissions</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                onClick={() => setActiveStage(4)}
                className="flex items-center gap-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <span>Proceed to Resource Mapping</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STAGE 4: MAP RESOURCES */}
      {activeStage === 4 && (
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-slate-900">
                Stage 4: Map Internal Resources to Google Assets
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Explicitly bind local storefronts to Google Business Profiles and brands to Search Console domains.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-xs">
              {/* Location Mapping Form */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-teal-600" />
                  <span>Map Storefront to Google Business Profile</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Internal Store Location
                    </label>
                    <select
                      value={selectedLocationId}
                      onChange={(e) => setSelectedLocationId(e.target.value)}
                      className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 focus:ring-2 focus:ring-teal-500"
                    >
                      {initialState.locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name} {loc.storeCode ? `(${loc.storeCode})` : ''} — {loc.city}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Google Business Profile Resource
                    </label>
                    <select
                      value={selectedGbpResourceId}
                      onChange={(e) => setSelectedGbpResourceId(e.target.value)}
                      className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="">Select Google location…</option>
                      {gbpResources.map((res) => (
                        <option key={res.id} value={res.externalResourceId}>
                          {res.resourceName} ({res.externalResourceId})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {bestMatch && !selectedGbpResourceId && (
                  <div className="p-2.5 bg-teal-50/70 border border-teal-200 rounded-lg flex items-center justify-between text-teal-800">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                      <span>Suggested match: {bestMatch.reason}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const target = gbpResources.find((r) => r.id === bestMatch.resourceId);
                        if (target) setSelectedGbpResourceId(target.externalResourceId);
                      }}
                      className="text-xs font-semibold text-teal-700 hover:underline"
                    >
                      Apply Match
                    </button>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleMapLocation}
                    disabled={!selectedGbpResourceId || !canManageIntegrations}
                    className="bg-teal-700 hover:bg-teal-800 text-white font-semibold"
                  >
                    Save Location Mapping
                  </Button>
                </div>
              </div>

              {/* Brand to GSC Mapping Form */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Globe className="h-4 w-4 text-indigo-600" />
                  <span>Map Brand to Google Search Console Property</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Internal Brand
                    </label>
                    <select
                      value={selectedBrandId}
                      onChange={(e) => setSelectedBrandId(e.target.value)}
                      className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
                    >
                      {initialState.brands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.slug})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Google Search Console Property
                    </label>
                    <select
                      value={selectedGscResourceId}
                      onChange={(e) => setSelectedGscResourceId(e.target.value)}
                      className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select Search Console property…</option>
                      {gscResources.map((res) => (
                        <option key={res.id} value={res.externalResourceId}>
                          {res.resourceName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleMapGsc}
                    disabled={!selectedGscResourceId || !canManageIntegrations}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                  >
                    Save Property Mapping
                  </Button>
                </div>
              </div>

              {/* Active Mappings Table */}
              <div className="space-y-3">
                <h3 className="font-bold text-slate-900">Active Resource Mappings ({initialState.internalMappings.length})</h3>
                {initialState.internalMappings.length === 0 ? (
                  <p className="text-slate-400 py-4 text-center">No active resource mappings yet.</p>
                ) : (
                  <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden bg-white">
                    {initialState.internalMappings.map((m) => (
                      <div key={m.id} className="p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Badge
                            className={
                              m.internalType === 'LOCATION'
                                ? 'bg-teal-100 text-teal-800 border-teal-200'
                                : 'bg-indigo-100 text-indigo-800 border-indigo-200'
                            }
                          >
                            {m.internalType}
                          </Badge>
                          <div>
                            <span className="font-semibold text-slate-900">{m.resourceName}</span>
                            <span className="font-mono text-[11px] text-slate-400 block">{m.externalResourceId}</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnmap(m.id)}
                          disabled={!canManageIntegrations}
                          className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  onClick={() => setActiveStage(5)}
                  className="flex items-center gap-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <span>Proceed to Ingestion & Sync</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* STAGE 5: INGEST & SYNC */}
      {activeStage === 5 && (
        <Card className="border-slate-200 shadow-xs">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-900">
              Stage 5: Data Ingestion & Synchronization
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Trigger background synchronization workers to pull verified performance history into localBi.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 text-sm">Synchronize Analytics Pipeline</h4>
                <p className="text-slate-500 max-w-lg">
                  Dispatches background BullMQ ingestion jobs to query Google Search Console multi-grain dates and Google Business Profile 30-day performance windows.
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleTriggerSync}
                disabled={isSyncing || !canManageIntegrations}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5 flex-shrink-0"
              >
                <Play className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Dispatching Jobs…' : 'Start Synchronization'}</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                <span className="font-semibold text-slate-800">Google Search Console Worker</span>
                <p className="text-slate-500 leading-relaxed">
                  Queries Search Analytics API across dates, queries, pages, and devices. Ingestion preserves authoritative provider totals without summing truncated rows.
                </p>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  Ready to Ingest
                </Badge>
              </div>

              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                <span className="font-semibold text-slate-800">Google Business Profile Worker</span>
                <p className="text-slate-500 leading-relaxed">
                  Fetches multi-daily metric timeseries (Search views, Maps views, Call clicks, Website clicks, Direction requests). Complies with 30-day retention policies.
                </p>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  Ready to Ingest
                </Badge>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                onClick={() => setActiveStage(6)}
                className="flex items-center gap-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <span>Proceed to Reports Readiness</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STAGE 6: READINESS & REPORTS */}
      {activeStage === 6 && (
        <Card className="border-slate-200 shadow-xs">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-900">
              Stage 6: Readiness & Performance Reports
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              All integration stages are complete. Launch your analytics dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="p-5 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span>Integration Complete — Reports Are Live!</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Your Google accounts are authorized, external resources are discovered and mapped, and performance data is ready for exploration across Google Search Console and Google Business Profile.
              </p>
              <div className="pt-2">
                <Link
                  href={`/t/${tenantSlug}/reports`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  <span>Launch Performance Reports</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <span className="font-semibold text-slate-800">Integration Checklist</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>Google Account Authorized ({activeConnection?.externalEmail || 'Active'})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>{gbpResources.length} GBP Locations Discovered</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>{gscResources.length} GSC Properties Discovered</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>{initialState.internalMappings.length} Internal Mappings Active</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disconnect Confirmation Modal */}
      <Dialog open={showDisconnectModal} onOpenChange={setShowDisconnectModal}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Disconnect Google Account?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Are you sure you want to unlink <strong className="text-slate-700">{activeConnection?.externalEmail}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs space-y-1 my-2">
            <p className="font-semibold">Effect of Disconnection:</p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-red-700">
              <li>Active scheduled synchronization jobs will be stopped.</li>
              <li>Existing resource mappings will be unlinked.</li>
              <li>Other workspaces are unaffected; shared credentials are scoped per client tenant.</li>
            </ul>
          </div>
          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDisconnectModal(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmDisconnect}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              Confirm Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
