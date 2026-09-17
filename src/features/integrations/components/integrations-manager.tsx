'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { browserClient } from '@/lib/http/browser-client';
import { IntegrationsStepper, SetupStage } from './integrations-stepper';
import { IntegrationsServiceCard } from './integrations-service-card';
import { IntegrationsStageContext } from './integrations-stage-context';
import { IntegrationsStageAuthorize } from './integrations-stage-authorize';
import { IntegrationsStageDiscover } from './integrations-stage-discover';
import { IntegrationsStageMap } from './integrations-stage-map';
import { IntegrationsStageSync } from './integrations-stage-sync';
import { IntegrationsStageReady } from './integrations-stage-ready';
import { IntegrationsDisconnectDialog } from './integrations-disconnect-dialog';

export interface IntegrationsManagerProps {
  tenantSlug: string;
  tenantId: string;
  initialState: {
    connections: Array<{ id: string; provider: string; externalEmail: string; createdAt: string; lastUsedAt: string | null }>;
    externalResources: Array<{ id: string; provider: string; externalResourceId: string; resourceType: 'LOCATION' | 'PROPERTY'; resourceName: string; accountName: string }>;
    internalMappings: Array<{ id: string; resourceId: string; internalType: 'LOCATION' | 'BRAND'; internalId: string; resourceName: string; externalResourceId: string; provider: string }>;
    brands: Array<{ id: string; name: string; slug: string }>;
    locations: Array<{ id: string; brandId: string; name: string; storeCode: string | null; addressLine1: string; city: string; state: string; postalCode: string; country: string; timezone: string }>;
  };
  userRole: string;
}

export function IntegrationsManager({ tenantSlug, initialState, userRole }: IntegrationsManagerProps) {
  const router = useRouter();
  const [activeStage, setActiveStage] = useState<SetupStage>(1);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  const [selectedLocationId, setSelectedLocationId] = useState(initialState.locations[0]?.id || '');
  const [selectedGbpResourceId, setSelectedGbpResourceId] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState(initialState.brands[0]?.id || '');
  const [selectedGscResourceId, setSelectedGscResourceId] = useState('');

  const activeConnection = initialState.connections[0];
  const gbpResources = initialState.externalResources.filter((r) => r.resourceType === 'LOCATION');
  const gscResources = initialState.externalResources.filter((r) => r.resourceType === 'PROPERTY');
  const canManage = userRole === 'CLIENT_OWNER' || userRole === 'CLIENT_ADMIN' || userRole === 'PLATFORM_SUPER_ADMIN';

  const bestMatch = useMemo(() => {
    const loc = initialState.locations.find((l) => l.id === selectedLocationId);
    return gbpResources.map((res) => {
      let score = 0;
      const reasons: string[] = [];
      if (loc?.storeCode && res.resourceName.toLowerCase().includes(loc.storeCode.toLowerCase())) { score += 50; reasons.push(`Store code "${loc.storeCode}" matches`); }
      if (loc?.city && res.resourceName.toLowerCase().includes(loc.city.toLowerCase())) { score += 30; reasons.push(`City "${loc.city}" matches`); }
      return { resourceId: res.id, score, reason: reasons.join(' • ') };
    }).filter((m) => m.score > 0).sort((a, b) => b.score - a.score)[0];
  }, [gbpResources, initialState.locations, selectedLocationId]);

  const handleConnect = async () => {
    setIsConnecting(true); setErrorMsg(null);
    try {
      const res = await browserClient.get<{ success: boolean; data: { authorizationUrl: string } }>(`/tenants/${tenantSlug}/integrations/google/connect`);
      if (res.data?.data?.authorizationUrl) window.location.href = res.data.data.authorizationUrl;
    } catch (err: unknown) { setErrorMsg((err as Error).message || 'Failed to initiate Google authorization'); setIsConnecting(false); }
  };

  const handleConfirmDisconnect = async () => {
    setShowDisconnectModal(false); setErrorMsg(null);
    try {
      await browserClient.post(`/tenants/${tenantSlug}/integrations/google/disconnect`, { connectionId: activeConnection?.id });
      setSuccessMsg('Google account disconnected successfully.'); router.refresh();
    } catch (err: unknown) { setErrorMsg((err as Error).message || 'Failed to disconnect'); }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true); setErrorMsg(null);
    try {
      await browserClient.post(`/tenants/${tenantSlug}/integrations/google/resources`, { connectionId: activeConnection?.id });
      setSuccessMsg('Discovered Google resources refreshed.'); router.refresh();
    } catch (err: unknown) { setErrorMsg((err as Error).message || 'Failed to refresh resources'); }
    finally { setIsRefreshing(false); }
  };

  const handleMapLocation = async () => {
    if (!selectedLocationId || !selectedGbpResourceId) return;
    try {
      await browserClient.post(`/tenants/${tenantSlug}/integrations/google/mappings`, { type: 'LOCATION', internalId: selectedLocationId, externalResourceId: selectedGbpResourceId });
      setSuccessMsg('Location mapped.'); setSelectedGbpResourceId(''); router.refresh();
    } catch (err: unknown) { setErrorMsg((err as Error).message || 'Failed to map location'); }
  };

  const handleMapGsc = async () => {
    if (!selectedBrandId || !selectedGscResourceId) return;
    try {
      await browserClient.post(`/tenants/${tenantSlug}/integrations/google/mappings`, { type: 'BRAND', internalId: selectedBrandId, externalResourceId: selectedGscResourceId });
      setSuccessMsg('Property mapped.'); setSelectedGscResourceId(''); router.refresh();
    } catch (err: unknown) { setErrorMsg((err as Error).message || 'Failed to map GSC'); }
  };

  const handleUnmap = async (mappingId: string) => {
    try {
      await browserClient.delete(`/tenants/${tenantSlug}/integrations/google/mappings?mappingId=${mappingId}`);
      setSuccessMsg('Mapping removed.'); router.refresh();
    } catch (err: unknown) { setErrorMsg((err as Error).message || 'Failed to unmap'); }
  };

  const [isAutoMapping, setIsAutoMapping] = useState(false);

  const handleAutoMapBrand = async (brandId: string) => {
    if (!brandId) return;
    setIsAutoMapping(true);
    setErrorMsg(null);
    try {
      const res = await browserClient.post<{
        success: boolean;
        data: {
          brandId: string;
          brandName: string;
          mappedCount: number;
          mappings: Array<{ locationName: string; resourceName: string }>;
        };
      }>(`/tenants/${tenantSlug}/integrations/google/mappings`, {
        type: 'AUTO_BRAND',
        brandId,
      });

      const count = res.data?.data?.mappedCount ?? 0;
      const brandName = res.data?.data?.brandName || 'Brand';
      if (count > 0) {
        setSuccessMsg(`Successfully auto-mapped ${count} location(s) for ${brandName}!`);
      } else {
        setSuccessMsg(`No new matching locations found to auto-map for ${brandName}. You can map locations manually below.`);
      }
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Failed to auto-map brand locations');
    } finally {
      setIsAutoMapping(false);
    }
  };

  const handleTriggerSync = async () => {
    setIsSyncing(true); setErrorMsg(null);
    try {
      const res = await browserClient.post<{ success: boolean; data: { scheduledJobsCount: number } }>(`/tenants/${tenantSlug}/sync`, {});
      setSuccessMsg(`Sync started! Enqueued ${res.data?.data?.scheduledJobsCount || 0} jobs.`); router.refresh();
    } catch (err: unknown) { setErrorMsg((err as Error).message || 'Failed to start sync'); }
    finally { setIsSyncing(false); }
  };

  const stages: Array<{ id: SetupStage; label: string; status: 'completed' | 'current' | 'upcoming' }> = [
    { id: 1, label: '1. Context', status: activeConnection ? 'completed' : 'current' },
    { id: 2, label: '2. Authorize', status: activeConnection ? 'completed' : activeStage === 2 ? 'current' : 'upcoming' },
    { id: 3, label: '3. Discover', status: initialState.externalResources.length > 0 ? 'completed' : activeConnection ? 'current' : 'upcoming' },
    { id: 4, label: '4. Map Resources', status: initialState.internalMappings.length > 0 ? 'completed' : 'upcoming' },
    { id: 5, label: '5. Ingest & Sync', status: initialState.internalMappings.length > 0 ? 'completed' : 'upcoming' },
    { id: 6, label: '6. Reports Ready', status: activeConnection && initialState.internalMappings.length > 0 ? 'completed' : 'upcoming' },
  ];

  return (
    <div className="space-y-6">
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

      <IntegrationsStepper activeStage={activeStage} onSelectStage={setActiveStage} stages={stages} />
      <IntegrationsServiceCard activeConnection={activeConnection} hasMappings={initialState.internalMappings.length > 0} canManage={canManage} isConnecting={isConnecting} isRefreshing={isRefreshing} onConnect={handleConnect} onRefresh={handleRefresh} onDisconnectClick={() => setShowDisconnectModal(true)} />

      {activeStage === 1 && <IntegrationsStageContext brands={initialState.brands} onContinue={() => setActiveStage(2)} />}
      {activeStage === 2 && <IntegrationsStageAuthorize isAuthorized={Boolean(activeConnection)} email={activeConnection?.externalEmail} isConnecting={isConnecting} canManage={canManage} onConnect={handleConnect} onContinue={() => setActiveStage(3)} />}
      {activeStage === 3 && <IntegrationsStageDiscover gbpResources={gbpResources} gscResources={gscResources} isRefreshing={isRefreshing} canManage={canManage} onRefresh={handleRefresh} onContinue={() => setActiveStage(4)} />}
      {activeStage === 4 && <IntegrationsStageMap locations={initialState.locations} brands={initialState.brands} gbpResources={gbpResources} gscResources={gscResources} internalMappings={initialState.internalMappings} selectedLocationId={selectedLocationId} setSelectedLocationId={setSelectedLocationId} selectedGbpResourceId={selectedGbpResourceId} setSelectedGbpResourceId={setSelectedGbpResourceId} selectedBrandId={selectedBrandId} setSelectedBrandId={setSelectedBrandId} selectedGscResourceId={selectedGscResourceId} setSelectedGscResourceId={setSelectedGscResourceId} bestMatch={bestMatch} canManage={canManage} onMapLocation={handleMapLocation} onMapGsc={handleMapGsc} onAutoMapBrand={handleAutoMapBrand} isAutoMapping={isAutoMapping} onUnmap={handleUnmap} onContinue={() => setActiveStage(5)} />}
      {activeStage === 5 && <IntegrationsStageSync isSyncing={isSyncing} canManage={canManage} onTriggerSync={handleTriggerSync} onContinue={() => setActiveStage(6)} />}
      {activeStage === 6 && <IntegrationsStageReady tenantSlug={tenantSlug} externalEmail={activeConnection?.externalEmail} gbpCount={gbpResources.length} gscCount={gscResources.length} mappingsCount={initialState.internalMappings.length} />}

      <IntegrationsDisconnectDialog open={showDisconnectModal} onOpenChange={setShowDisconnectModal} email={activeConnection?.externalEmail} onConfirm={handleConfirmDisconnect} />
    </div>
  );
}
