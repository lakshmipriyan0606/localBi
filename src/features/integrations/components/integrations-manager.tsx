'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { browserClient } from '@/lib/http/browser-client';
import { notify } from '@/lib/notify';
import { BrandCreateDialog } from '@/features/brands/components/brand-create-dialog';
import { ArrowRight } from 'lucide-react';

import { GoogleIntegrationStepper, IntegrationWizardStep } from './google-integration-stepper';
import { ConnectGoogleStep } from './steps/connect-google-step';
import {
  SelectGoogleResourcesStep,
  DiscoveredResource,
  BrandOption,
} from './steps/select-google-resources-step';
import { ReviewGoogleResourcesStep } from './steps/review-google-resources-step';
import { IntegrationsDisconnectDialog } from './integrations-disconnect-dialog';
import { AddManualGscDialog } from './add-manual-gsc-dialog';

export interface IntegrationsManagerProps {
  tenantSlug: string;
  tenantId: string;
  initialState: {
    connections: Array<{
      id: string;
      provider: string;
      externalEmail: string;
      grantedScopes?: string[] | undefined;
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
      connectionAccess?: Array<{ canAccess: boolean }>;
    }>;
    internalMappings: Array<{
      id: string;
      resourceId: string;
      internalType: 'LOCATION' | 'BRAND' | 'WEBSURFACE';
      internalId: string;
      brandId?: string | null;
      resourceName: string;
      externalResourceId: string;
      provider: string;
    }>;
    brands: Array<{ id: string; name: string; slug: string; domain?: string }>;
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
}: IntegrationsManagerProps) {
  const router = useRouter();

  // Active connection
  const activeConnection = initialState.connections[0];
  const isAuthorized = Boolean(activeConnection);

  // Dynamic external resources state (updates immediately on refresh or manual additions)
  const [externalResources, setExternalResources] = useState(initialState.externalResources);
  const [newResourceIds, setNewResourceIds] = useState<Set<string>>(new Set());

  // Async loading and modal states
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [showManualGscModal, setShowManualGscModal] = useState(false);

  // Normalize all discovered resources into structured objects
  const allDiscoveredResources: DiscoveredResource[] = useMemo(() => {
    return externalResources.map((res) => {
      const isGsc = res.provider === 'GOOGLE_SEARCH_CONSOLE';
      const isGa4 = res.provider === 'GOOGLE_ANALYTICS_4';
      const product = isGsc ? 'GSC' : isGa4 ? 'GA4' : 'GBP';

      let propertyId: string | undefined = undefined;
      if (isGa4) {
        // e.g. properties/554775051 -> G-554775051 or 554775051
        const clean = res.externalResourceId.replace(/^properties\//, '');
        propertyId = `G-${clean}`;
      } else if (isGsc) {
        propertyId = res.externalResourceId;
      }

      // If GBP location, find matching location address from locations list if mapped
      const matchedLoc = initialState.locations.find(
        (l) => l.name.toLowerCase() === res.resourceName.toLowerCase() || (l.storeCode && res.resourceName.includes(l.storeCode))
      );
      const locationAddress = matchedLoc ? `${matchedLoc.addressLine1}, ${matchedLoc.city}` : undefined;

      return {
        id: res.id,
        provider: res.provider,
        product,
        resourceType: res.resourceType,
        resourceName: res.resourceName,
        externalResourceId: res.externalResourceId,
        accountName: res.accountName,
        locationAddress,
        propertyId,
      };
    });
  }, [externalResources, initialState.locations]);

  // Initial Mappings State: Map from resourceId -> brandId
  // Resolves existing DB mappings directly to LocalBi Brand
  const [mappings, setMappings] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};

    initialState.internalMappings.forEach((m) => {
      let resolvedBrandId: string | undefined = undefined;

      if (m.internalType === 'BRAND') {
        resolvedBrandId = m.internalId;
      } else if (m.internalType === 'LOCATION') {
        const loc = initialState.locations.find((l) => l.id === m.internalId);
        resolvedBrandId = loc?.brandId;
      } else if (m.internalType === 'WEBSURFACE') {
        resolvedBrandId = m.brandId || undefined;
      }

      // Fallback: if m.brandId is populated
      if (!resolvedBrandId && m.brandId) {
        resolvedBrandId = m.brandId;
      }

      if (resolvedBrandId && initialState.brands.some((b) => b.id === resolvedBrandId)) {
        initial[m.resourceId] = resolvedBrandId;
      }
    });

    return initial;
  });

  // Step state: 1 (Google Account) -> 2 (Select & Map Resources) -> 3 (Review & Connect)
  const [activeStep, setActiveStep] = useState<IntegrationWizardStep>(() => {
    if (!isAuthorized) return 1;
    // If user already has mapped resources, go to Review (Step 3), else Step 2
    if (Object.keys(mappings).length > 0) return 3;
    return 2;
  });

  // Handle mapping update: immediate UI update
  const handleUpdateMapping = (resourceId: string, brandId: string | null) => {
    setMappings((prev) => {
      const next = { ...prev };
      if (!brandId) {
        delete next[resourceId];
      } else {
        next[resourceId] = brandId;
      }
      return next;
    });

    if (brandId) {
      const brand = initialState.brands.find((b) => b.id === brandId);
      if (brand) {
        notify.success(`Mapped to ${brand.name}`);
      }
    }
  };

  // Google OAuth connect
  const handleConnect = async () => {
    try {
      const res = await browserClient.get<{
        success: boolean;
        data: { authorizationUrl: string };
      }>(`/tenants/${tenantSlug}/integrations/google/connect`);
      if (res.data?.data?.authorizationUrl) {
        window.location.href = res.data.data.authorizationUrl;
      }
    } catch (err: unknown) {
      notify.error((err as Error).message || 'Failed to initiate Google authorization');
    }
  };

  // Check / Discover all resources from Google API without requiring OAuth login again
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await browserClient.post<{
        success: boolean;
        data: {
          summary?: {
            gbpAccountsCount: number;
            gbpLocationsCount: number;
            gscPropertiesCount: number;
            ga4PropertiesCount: number;
            gbpError?: { code: string; message: string };
            gscError?: { code: string; message: string };
          };
          externalResources?: typeof initialState.externalResources;
          internalMappings?: typeof initialState.internalMappings;
        };
      }>(`/tenants/${tenantSlug}/integrations/google/resources`, {});

      const newResources = res.data?.data?.externalResources;
      if (newResources && Array.isArray(newResources)) {
        const currentIds = new Set(externalResources.map((r) => r.id));
        const newlyAdded = newResources.filter((r) => !currentIds.has(r.id));

        setExternalResources(newResources);

        if (newlyAdded.length > 0) {
          const addedIds = new Set(newlyAdded.map((r) => r.id));
          setNewResourceIds(addedIds);
          notify.success(
            `Discovered ${newlyAdded.length} new resource(s) from Google (${newlyAdded.map((r) => r.resourceName).join(', ')})!`
          );
          // Redirect to Step 2 so user can map the new resources
          setActiveStep(2);
        } else {
          notify.info('All Google resources are up to date. No new properties found.');
        }
      } else {
        router.refresh();
        notify.success('All Google resources refreshed successfully.');
      }
    } catch (err: unknown) {
      notify.error((err as Error).message || 'Failed to refresh Google resources');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Register a Search Console property URL or domain manually
  const handleAddManualGsc = async (siteUrl: string, brandId?: string) => {
    try {
      const res = await browserClient.post<{
        success: boolean;
        data: {
          resource?: { id: string; resourceName: string; externalResourceId: string };
          externalResources?: typeof initialState.externalResources;
        };
      }>(`/tenants/${tenantSlug}/integrations/google/resources`, {
        action: 'ADD_MANUAL_PROPERTY',
        siteUrl,
        brandId,
      });

      if (res.data?.data?.externalResources) {
        setExternalResources(res.data.data.externalResources);
      }

      const addedResId = res.data?.data?.resource?.id;
      if (addedResId) {
        setNewResourceIds((prev) => new Set([...prev, addedResId]));
        if (brandId) {
          setMappings((prev) => ({ ...prev, [addedResId]: brandId }));
        }
      }

      notify.success('Search Console property added successfully!');
      setActiveStep(2);
    } catch (err: unknown) {
      notify.error((err as Error).message || 'Failed to add Search Console property');
      throw err;
    }
  };

  // Disconnect Google Account
  const handleConfirmDisconnect = async () => {
    setShowDisconnectModal(false);
    try {
      await browserClient.post(`/tenants/${tenantSlug}/integrations/google/disconnect`, {
        connectionId: activeConnection?.id,
      });
      notify.info('Google account disconnected successfully.');
      setActiveStep(1);
      setMappings({});
      router.refresh();
    } catch (err: unknown) {
      notify.error((err as Error).message || 'Failed to disconnect Google account');
    }
  };

  // Step 3 Connect & Start Syncing: Checks for new Google resources first, then saves mappings and starts sync
  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      // 1. Check for any newly added Google resources before syncing
      try {
        const discRes = await browserClient.post<{
          success: boolean;
          data: {
            externalResources?: typeof initialState.externalResources;
          };
        }>(`/tenants/${tenantSlug}/integrations/google/resources`, {});

        const latestResources = discRes.data?.data?.externalResources;
        if (latestResources && Array.isArray(latestResources)) {
          const currentIds = new Set(externalResources.map((r) => r.id));
          const newlyFound = latestResources.filter((r) => !currentIds.has(r.id));

          if (newlyFound.length > 0) {
            setExternalResources(latestResources);
            setNewResourceIds(new Set(newlyFound.map((r) => r.id)));
            notify.info(
              `Discovered ${newlyFound.length} new unmapped Google resource(s): ${newlyFound.map((r) => r.resourceName).join(', ')}. Please assign them to a brand.`
            );
            setActiveStep(2);
            setIsSyncing(false);
            return;
          }
        }
      } catch (discErr) {
        // If discovery check has a transient warning, proceed with existing mappings sync
        console.warn('Pre-sync discovery check warning:', discErr);
      }
      // 1. Calculate diff against backend mappings
      const existingMappingsByResource = new Map(
        initialState.internalMappings.map((m) => [m.resourceId, m])
      );

      const additions: Array<{
        type: 'BRAND' | 'GA4_PROPERTY' | 'LOCATION';
        internalId: string;
        externalResourceId: string;
        internalType?: 'BRAND' | 'LOCATION';
      }> = [];
      const removals: string[] = [];

      // Check current mappings against existing
      Object.entries(mappings).forEach(([resourceId, targetBrandId]) => {
        const resource = allDiscoveredResources.find((r) => r.id === resourceId);
        if (!resource) return;

        const existing = existingMappingsByResource.get(resourceId);

        let type: 'BRAND' | 'GA4_PROPERTY' | 'LOCATION' = 'BRAND';
        let internalId = targetBrandId;

        if (resource.product === 'GA4') {
          type = 'GA4_PROPERTY';
          internalId = targetBrandId;
        } else if (resource.product === 'GBP') {
          type = 'LOCATION';
          // Find matching location for this brand if exists
          const matchingLoc = initialState.locations.find((l) => l.brandId === targetBrandId);
          internalId = matchingLoc ? matchingLoc.id : targetBrandId;
        } else {
          type = 'BRAND';
          internalId = targetBrandId;
        }

        if (!existing) {
          // New mapping
          additions.push({
            type,
            internalId,
            externalResourceId: resource.id,
            ...(type === 'GA4_PROPERTY' ? { internalType: 'BRAND' } : {}),
          });
        } else if (existing.internalId !== internalId) {
          // Changed mapping
          removals.push(existing.id);
          additions.push({
            type,
            internalId,
            externalResourceId: resource.id,
            ...(type === 'GA4_PROPERTY' ? { internalType: 'BRAND' } : {}),
          });
        }
      });

      // Check for removed mappings
      existingMappingsByResource.forEach((existingMapping, resourceId) => {
        if (!mappings[resourceId]) {
          if (!removals.includes(existingMapping.id)) {
            removals.push(existingMapping.id);
          }
        }
      });

      // 2. Execute removals and additions
      if (removals.length > 0) {
        await Promise.allSettled(
          removals.map((mappingId) =>
            browserClient.delete(
              `/tenants/${tenantSlug}/integrations/google/mappings?mappingId=${mappingId}`
            )
          )
        );
      }

      if (additions.length > 0) {
        await Promise.allSettled(
          additions.map((add) =>
            browserClient.post(`/tenants/${tenantSlug}/integrations/google/mappings`, add)
          )
        );
      }

      // 3. Trigger Data Synchronization
      await browserClient.post(`/tenants/${tenantSlug}/sync`, {}, { timeout: 60000 });

      notify.success('Google connections updated! Background sync has started.');
      router.refresh();
    } catch (err: unknown) {
      notify.error((err as Error).message || 'Failed to connect and start sync');
    } finally {
      setIsSyncing(false);
    }
  };

  // If no brands exist in tenant, prompt creation
  if (initialState.brands.length === 0) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl max-w-2xl mx-auto mt-8 shadow-xs">
        <div className="p-4 text-sm text-amber-800 bg-amber-50 rounded-xl border border-amber-200 mb-4">
          <p className="font-bold">Action Required: Create a Brand First</p>
          <p className="mt-1 opacity-90">
            You must register at least one LocalBi Brand before you can map Google resources.
          </p>
        </div>
        <BrandCreateDialog
          tenantSlug={tenantSlug}
          onSuccess={() => router.refresh()}
          triggerTitle="Create Brand Now"
          triggerClassName="bg-[#3B49DF] hover:bg-indigo-700 text-white font-bold text-xs shadow-xs gap-1.5"
          triggerIcon={<ArrowRight className="h-3.5 w-3.5 order-last" />}
        />
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* 3-Step Integration Stepper Header */}
      <GoogleIntegrationStepper
        activeStep={activeStep}
        onStepClick={(step) => setActiveStep(step)}
        canNavigate={isAuthorized}
      />

      {/* Main Step Body */}
      <div>
        {activeStep === 1 && (
          <ConnectGoogleStep
            brandName={initialState.brands[0]?.name || 'LocalBi'}
            isAuthorized={isAuthorized}
            activeConnectionEmail={activeConnection?.externalEmail || ''}
            onConnect={handleConnect}
            onContinue={() => setActiveStep(2)}
            onChangeAccount={() => setShowDisconnectModal(true)}
          />
        )}

        {activeStep === 2 && (
          <SelectGoogleResourcesStep
            email={activeConnection?.externalEmail || ''}
            brands={initialState.brands}
            resources={allDiscoveredResources}
            mappings={mappings}
            onUpdateMapping={handleUpdateMapping}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            onBack={() => setActiveStep(1)}
            onContinue={() => setActiveStep(3)}
            onChangeAccount={() => setShowDisconnectModal(true)}
            onOpenManualGscModal={() => setShowManualGscModal(true)}
            newResourceIds={newResourceIds}
          />
        )}

        {activeStep === 3 && (
          <ReviewGoogleResourcesStep
            email={activeConnection?.externalEmail || ''}
            brands={initialState.brands}
            resources={allDiscoveredResources}
            mappings={mappings}
            onEditSelection={() => setActiveStep(2)}
            onSync={handleTriggerSync}
            isSyncing={isSyncing}
            onBack={() => setActiveStep(2)}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            onUpdateMapping={handleUpdateMapping}
            onOpenManualGscModal={() => setShowManualGscModal(true)}
          />
        )}
      </div>

      {/* Disconnect Google Confirmation Dialog */}
      <IntegrationsDisconnectDialog
        open={showDisconnectModal}
        onOpenChange={setShowDisconnectModal}
        onConfirm={handleConfirmDisconnect}
        email={activeConnection?.externalEmail || ''}
      />

      {/* Manual GSC Property Registration Dialog */}
      <AddManualGscDialog
        open={showManualGscModal}
        onOpenChange={setShowManualGscModal}
        brands={initialState.brands}
        connectedEmail={activeConnection?.externalEmail || ''}
        onAdd={handleAddManualGsc}
      />
    </div>
  );
}
