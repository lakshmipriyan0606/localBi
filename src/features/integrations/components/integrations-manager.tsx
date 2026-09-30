"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/http/browser-client";
import { notify } from "@/lib/notify";
import { BrandCreateDialog } from "@/features/brands/components/brand-create-dialog";
import { ArrowRight } from "lucide-react";

import { GoogleIntegrationStepper } from "./google-integration-stepper";
import { ConnectGoogleStep } from "./steps/connect-google-step";
import { SelectGoogleResourcesStep, ResourceSelection } from "./steps/select-google-resources-step";
import { ReviewGoogleResourcesStep } from "./steps/review-google-resources-step";
import { IntegrationsDisconnectDialog } from "./integrations-disconnect-dialog";

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
      resourceType: "LOCATION" | "PROPERTY";
      resourceName: string;
      accountName: string;
      connectionAccess?: Array<{ canAccess: boolean }>;
    }>;
    internalMappings: Array<{
      id: string;
      resourceId: string;
      internalType: "LOCATION" | "BRAND";
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
}: IntegrationsManagerProps) {
  const router = useRouter();

  // Async action states
  const [isSyncing, setIsSyncing] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  // Connection info
  const activeConnection = initialState.connections[0];
  const isAuthorized = Boolean(activeConnection);

  // Base resources
  const gscResources = initialState.externalResources.filter(r => r.resourceType === "PROPERTY" && r.provider === "GOOGLE_SEARCH_CONSOLE");
  const ga4Resources = initialState.externalResources.filter(r => r.provider === "GOOGLE_ANALYTICS_4");
  const gbpResources = initialState.externalResources.filter(r => r.resourceType === "LOCATION");

  // Step 1 -> Step 2 -> Step 3
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(() => {
    if (!isAuthorized) return 1;
    if (initialState.internalMappings.length > 0) return 3; // if already configured, jump to 3 to review
    return 2; // if connected but no mappings, go to 2
  });

  // Default targets
  const defaultBrand = initialState.brands[0];

  // Initialize draft selections from backend mappings
  const [draftSelections, setDraftSelections] = useState<Record<string, ResourceSelection>>(() => {
    const drafts: Record<string, ResourceSelection> = {};

    // Auto-fill existing mappings
    initialState.internalMappings.forEach(mapping => {
      const resourceType = mapping.provider === "GOOGLE_SEARCH_CONSOLE" ? 'GSC' : mapping.provider === "GOOGLE_ANALYTICS_4" ? 'GA4' : 'GBP';
      drafts[mapping.resourceId] = {
        resourceType,
        externalResourceId: mapping.externalResourceId,
        selected: true,
        target: {
          brandId: mapping.internalType === 'BRAND' ? mapping.internalId : (defaultBrand?.id || ''),
          ...(mapping.internalType === 'LOCATION' ? { locationId: mapping.internalId } : {})
        }
      };
    });

    return drafts;
  });

  // Handlers
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
      notify.error((err as Error).message || "Failed to initiate Google authorization");
    }
  };

  const handleRefresh = async () => {
    try {
      await browserClient.post(`/tenants/${tenantSlug}/integrations/google/resources`, {});
      router.refresh();
      notify.success("Resources refreshed successfully.");
    } catch (err: unknown) {
      notify.error((err as Error).message || "Failed to refresh resources");
    } finally {
    }
  };

  const handleConfirmDisconnect = async () => {
    setShowDisconnectModal(false);
    try {
      await browserClient.post(`/tenants/${tenantSlug}/integrations/google/disconnect`, {
        connectionId: activeConnection?.id,
      });
      notify.info("Google account disconnected successfully.");
      setActiveStep(1);
      setDraftSelections({});
      router.refresh();
    } catch (err: unknown) {
      notify.error((err as Error).message || "Failed to disconnect Google account");
    }
  };

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      // 1. Calculate diff
      const existingMappings = new Map(initialState.internalMappings.map(m => [m.resourceId, m]));
      const additions: any[] = [];
      const removals: any[] = [];

      // Check for additions/updates
      Object.entries(draftSelections).forEach(([resourceId, draft]) => {
        if (draft.selected) {
          if (!existingMappings.has(resourceId)) {
            // Addition
            const type = draft.resourceType === 'GA4' ? 'GA4_PROPERTY' : draft.resourceType === 'GSC' ? 'BRAND' : 'LOCATION';
            const internalId = draft.target.locationId || draft.target.brandId;
            additions.push({ type, internalId, externalResourceId: draft.externalResourceId });
          }
        } else {
          if (existingMappings.has(resourceId)) {
            removals.push(existingMappings.get(resourceId)!.id); // mapping ID
          }
        }
      });

      // Also check if any existing mappings were removed from draft state entirely (edge case)
      existingMappings.forEach((m, resourceId) => {
        if (!draftSelections[resourceId]?.selected) {
          if (!removals.includes(m.id)) {
            removals.push(m.id);
          }
        }
      });

      // 2. Perform API calls
      await Promise.allSettled([
        ...additions.map(add =>
          browserClient.post(`/tenants/${tenantSlug}/integrations/google/mappings`, add)
        ),
        ...removals.map(removeId =>
          browserClient.delete(`/tenants/${tenantSlug}/integrations/google/mappings?mappingId=${removeId}`)
        )
      ]);

      // 3. Trigger Sync
      await browserClient.post(`/tenants/${tenantSlug}/sync`, {});

      notify.success("Integrations updated! Data sync started in the background.");
      router.refresh();

    } catch (err: unknown) {
      notify.error((err as Error).message || "Failed to start sync");
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleSelection = (id: string, resourceType: 'GSC' | 'GBP' | 'GA4', targetBrandId: string) => {
    setDraftSelections(prev => {
      const existing = prev[id];
      const resource = initialState.externalResources.find(r => r.id === id);
      return {
        ...prev,
        [id]: {
          resourceType,
          externalResourceId: resource?.externalResourceId || '',
          selected: !(existing?.selected),
          target: existing?.target || { brandId: targetBrandId }
        }
      };
    });
  };

  const setLocationMapping = (id: string, locationId: string) => {
    setDraftSelections(prev => {
      const existing = prev[id];
      if (!existing) return prev;
      return {
        ...prev,
        [id]: {
          ...existing,
          target: { ...existing.target, locationId }
        }
      };
    });
  };

  const handleSelectAll = (resourceType: 'GSC' | 'GBP' | 'GA4', selected: boolean, resources: any[], targetBrandId: string) => {
    setDraftSelections(prev => {
      const next = { ...prev };
      resources.forEach(r => {
        const existing = next[r.id];
        next[r.id] = {
          resourceType,
          externalResourceId: r.externalResourceId,
          selected,
          target: existing?.target || { brandId: targetBrandId }
        };
      });
      return next;
    });
  };

  // If no brands exist, block flow
  if (initialState.brands.length === 0) {
    return (
      <div className="p-8 text-center bg-gradient-to-b from-amber-50/40 via-white to-amber-50/60 border border-dashed border-amber-200 rounded-2xl max-w-4xl mx-auto mt-8">
        <div className="max-w-2xl mx-auto p-4 text-sm text-left text-amber-800 bg-amber-50 rounded-xl border border-amber-200 shadow-xs">
          <p className="font-bold flex items-center gap-2">
            Action Required: Create a Brand First
          </p>
          <p className="mt-1 ml-7 opacity-90">
            You must create at least one Brand before you can connect your Google account or link your websites.
          </p>
          <div className="mt-3 ml-7">
            <BrandCreateDialog
              tenantSlug={tenantSlug}
              onSuccess={() => router.refresh()}
              triggerTitle="Create Brand Now"
              triggerClassName="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs gap-1.5"
              triggerIcon={<ArrowRight className="h-3.5 w-3.5 order-last" />}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8FC] -m-4 sm:-m-6 md:-m-8 p-4 sm:p-6 md:p-8 pt-10">

      {/* Stepper Header */}
      <GoogleIntegrationStepper activeStep={activeStep} />

      {/* Main Content Area */}
      <div className="mt-2">
        {activeStep === 1 && (
          <ConnectGoogleStep
            brandName={defaultBrand?.name || 'Your Brand'}
            isAuthorized={isAuthorized}
            activeConnectionEmail={activeConnection?.externalEmail || ''}
            onConnect={handleConnect}
            onContinue={() => setActiveStep(2)}
            onChangeAccount={() => setShowDisconnectModal(true)}
            onRefresh={handleRefresh}
          />
        )}

        {activeStep === 2 && activeConnection && (
          <SelectGoogleResourcesStep
            email={activeConnection.externalEmail}
            gscResources={gscResources}
            gbpResources={gbpResources}
            ga4Resources={ga4Resources}
            draftSelections={draftSelections}
            locationOptions={initialState.locations}
            onChangeAccount={() => setShowDisconnectModal(true)}
            onRefresh={handleRefresh}
            onToggleSelection={toggleSelection}
            onLocationMap={setLocationMapping}
            onSelectAll={handleSelectAll}
            onBack={() => setActiveStep(1)}
            onContinue={() => setActiveStep(3)}
            defaultBrandId={defaultBrand?.id || ''}
          />
        )}

        {activeStep === 3 && activeConnection && (
          <ReviewGoogleResourcesStep
            email={activeConnection.externalEmail}
            draftSelections={draftSelections}
            resources={initialState.externalResources}
            locationOptions={initialState.locations}
            onChangeAccount={() => setShowDisconnectModal(true)}
            onEditSelection={() => setActiveStep(2)}
            onSync={handleTriggerSync}
            isSyncing={isSyncing}
          />
        )}
      </div>

      <IntegrationsDisconnectDialog
        open={showDisconnectModal}
        onOpenChange={setShowDisconnectModal}
        onConfirm={handleConfirmDisconnect}
        email={activeConnection?.externalEmail || ""}
      />
    </div>
  );
}
