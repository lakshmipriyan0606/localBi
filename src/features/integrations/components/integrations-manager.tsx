"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Globe,
  MapPin,
  RefreshCw,
  Unlink,
  CheckCircle2,
  Zap,
  ArrowRight,
  ArrowLeft,
  Plus,
  Check,
  Layers,
  Store,
  BarChart3,
} from "lucide-react";
import { browserClient } from "@/lib/http/browser-client";
import { notify } from "@/lib/notify";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { IntegrationsDisconnectDialog } from "./integrations-disconnect-dialog";

import { cn } from "@/lib/cn";

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
  userRole,
}: IntegrationsManagerProps) {
  const router = useRouter();

  // Async action states
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAutoMapping, setIsAutoMapping] = useState(false);
  const [mappingInProgressId, setMappingInProgressId] = useState<string | null>(
    null,
  );
  const [unmappingInProgressId, setUnmappingInProgressId] = useState<
    string | null
  >(null);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  // STEPPER WIZARD STATE (Step 1 -> Step 2 -> Step 3)
  // Smart default: If not connected -> Step 1. If connected -> Step 2.
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(() => {
    if (!initialState.connections.length) return 1;
    return 2;
  });

  // Mapping selections state
  const [pendingBrandSelections, setPendingBrandSelections] = useState<
    Record<string, string>
  >({});
  const [pendingLocationSelections, setPendingLocationSelections] = useState<
    Record<string, string>
  >({});

  // Direct Website URL connection state
  const [manualSiteUrl, setManualSiteUrl] = useState("");
  const [manualBrandId, setManualBrandId] = useState(
    initialState.brands[0]?.id || "",
  );
  const [isAddingManualSite, setIsAddingManualSite] = useState(false);

  const canManage =
    userRole === "CLIENT_OWNER" ||
    userRole === "CLIENT_ADMIN" ||
    userRole === "PLATFORM_SUPER_ADMIN";

  const activeConnection = initialState.connections[0];
  const isAuthorized = Boolean(activeConnection);

  // Separate discovered resources into GSC properties and GBP locations
  const gscResources = initialState.externalResources.filter(
    (r) => r.resourceType === "PROPERTY",
  );
  const gbpResources = initialState.externalResources.filter(
    (r) => r.resourceType === "LOCATION",
  );

  // Mapped vs Unmapped tracking
  const mappedGscResourceIds = new Set(
    initialState.internalMappings
      .filter((m) => m.internalType === "BRAND")
      .map((m) => m.resourceId),
  );

  const mappedGbpResourceIds = new Set(
    initialState.internalMappings
      .filter((m) => m.internalType === "LOCATION")
      .map((m) => m.resourceId),
  );

  const mappedGscCount = gscResources.filter((r) =>
    mappedGscResourceIds.has(r.id),
  ).length;
  const mappedGbpCount = gbpResources.filter((r) =>
    mappedGbpResourceIds.has(r.id),
  ).length;
  const totalMappingsCount = initialState.internalMappings.length;

  // Handler: Initiate Google OAuth
  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const res = await browserClient.get<{
        success: boolean;
        data: { authorizationUrl: string };
      }>(`/tenants/${tenantSlug}/integrations/google/connect`);
      if (res.data?.data?.authorizationUrl) {
        window.location.href = res.data.data.authorizationUrl;
      }
    } catch (err: unknown) {
      notify.error(
        (err as Error).message || "Failed to initiate Google authorization",
      );
      setIsConnecting(false);
    }
  };

  // Handler: Disconnect Google Connection
  const handleConfirmDisconnect = async () => {
    setShowDisconnectModal(false);
    try {
      await browserClient.post(
        `/tenants/${tenantSlug}/integrations/google/disconnect`,
        {
          connectionId: activeConnection?.id,
        },
      );
      notify.info("Google account disconnected successfully.");
      setActiveStep(1);
      router.refresh();
    } catch (err: unknown) {
      notify.error(
        (err as Error).message || "Failed to disconnect Google account",
      );
    }
  };

  // Handler: Refresh Discovered Resources from Google APIs
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await browserClient.post(
        `/tenants/${tenantSlug}/integrations/google/resources`,
        {
          connectionId: activeConnection?.id,
        },
      );
      notify.success("Google accounts and listings refreshed successfully!");
      router.refresh();
    } catch (err: unknown) {
      notify.error(
        (err as Error).message || "Failed to refresh Google listings",
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handler: Map a single GSC property to a Brand
  const handleMapGsc = async (externalResourceId: string) => {
    const brandId =
      pendingBrandSelections[externalResourceId] || initialState.brands[0]?.id;
    if (!brandId) {
      notify.warning("Please select a brand to connect this website to.");
      return;
    }
    setMappingInProgressId(externalResourceId);
    try {
      await browserClient.post(
        `/tenants/${tenantSlug}/integrations/google/mappings`,
        {
          type: "BRAND",
          internalId: brandId,
          externalResourceId,
        },
      );
      notify.success(
        "Website connected successfully! Search reports are now active.",
      );
      router.refresh();
    } catch (err: unknown) {
      notify.error((err as Error).message || "Failed to connect website");
    } finally {
      setMappingInProgressId(null);
    }
  };

  // Handler: Map a single GBP location to an Internal Location
  const handleMapLocation = async (externalResourceId: string) => {
    const locationId =
      pendingLocationSelections[externalResourceId] ||
      initialState.locations[0]?.id;
    if (!locationId) {
      notify.warning("Please select a store location to connect.");
      return;
    }
    setMappingInProgressId(externalResourceId);
    try {
      await browserClient.post(
        `/tenants/${tenantSlug}/integrations/google/mappings`,
        {
          type: "LOCATION",
          internalId: locationId,
          externalResourceId,
        },
      );
      notify.success(
        "Store location connected successfully! Calls, directions, and visits will now appear in your reports.",
      );
      router.refresh();
    } catch (err: unknown) {
      notify.error(
        (err as Error).message || "Failed to connect store location",
      );
    } finally {
      setMappingInProgressId(null);
    }
  };

  // Handler: Unmap an active mapping
  const handleUnmap = async (mappingId: string) => {
    setUnmappingInProgressId(mappingId);
    try {
      await browserClient.delete(
        `/tenants/${tenantSlug}/integrations/google/mappings?mappingId=${mappingId}`,
      );
      notify.info("Connection removed successfully.");
      router.refresh();
    } catch (err: unknown) {
      notify.error((err as Error).message || "Failed to disconnect");
    } finally {
      setUnmappingInProgressId(null);
    }
  };

  // Handler: Add Website URL directly
  const handleAddManualSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSiteUrl.trim()) return;
    setIsAddingManualSite(true);
    try {
      await browserClient.post(
        `/tenants/${tenantSlug}/integrations/google/resources`,
        {
          siteUrl: manualSiteUrl.trim(),
          brandId: manualBrandId || initialState.brands[0]?.id,
        },
      );
      setManualSiteUrl("");
      notify.success("Website added and connected successfully!");
      router.refresh();
    } catch (err: unknown) {
      notify.error((err as Error).message || "Failed to add website");
    } finally {
      setIsAddingManualSite(false);
    }
  };

  // Handler: Hide/Delete unmapped discovered resource
  const handleDeleteResource = async (resourceId: string) => {
    setUnmappingInProgressId(resourceId);
    try {
      await browserClient.delete(
        `/tenants/${tenantSlug}/integrations/google/resources?resourceId=${resourceId}`,
      );
      notify.info("Resource hidden successfully.");
      router.refresh();
    } catch (err: unknown) {
      notify.error((err as Error).message || "Failed to hide resource");
    } finally {
      setUnmappingInProgressId(null);
    }
  };

  // Handler: Auto-link all GBP locations to primary brand
  const handleAutoMapBrand = async () => {
    const defaultBrand = initialState.brands[0];
    if (!defaultBrand) {
      notify.warning("No brand found to auto-map locations to.");
      return;
    }
    setIsAutoMapping(true);
    try {
      const res = await browserClient.post<{
        success: boolean;
        data: { mappedCount: number };
      }>(`/tenants/${tenantSlug}/integrations/google/mappings`, {
        action: "AUTO_MAP_BRAND",
        brandId: defaultBrand.id,
      });

      const count = res.data?.data?.mappedCount ?? 0;
      if (count > 0) {
        notify.success(
          `Successfully auto-linked ${count} location(s) for ${defaultBrand.name}!`,
        );
      } else {
        notify.info(
          "No additional auto-matches found. You can link locations manually below.",
        );
      }
      router.refresh();
    } catch (err: unknown) {
      notify.error((err as Error).message || "Failed to auto-link locations");
    } finally {
      setIsAutoMapping(false);
    }
  };

  // Handler: Trigger background data synchronization
  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      await browserClient.post<{
        success: boolean;
        data: { scheduledJobsCount: number };
      }>(`/tenants/${tenantSlug}/sync`, {});
      notify.success(
        "Data sync started! Updating your Google search and store reports in the background.",
      );
      router.refresh();
    } catch (err: unknown) {
      notify.error((err as Error).message || "Failed to start sync");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* ========================================================================= */}
      {/* ── WORLD-CLASS INTERACTIVE STEPPER PROGRESS BAR ──                        */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
                Google Setup Guide
              </h2>
              <p className="text-xs text-slate-500">
                Follow these 3 easy steps to connect your accounts and view your
                live reports.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold self-start sm:self-auto">
            <span className="text-slate-400">Current Step:</span>
            <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-200/60">
              Step {activeStep} of 3
            </span>
          </div>
        </div>

        {/* 3 Step Interactive Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* STEP 1: GOOGLE ACCOUNT */}
          <button
            type="button"
            onClick={() => setActiveStep(1)}
            className={cn(
              "p-3.5 rounded-xl border text-left transition-all cursor-pointer select-none flex items-center justify-between gap-3 group",
              activeStep === 1
                ? "border-indigo-500 bg-indigo-50/70 shadow-xs ring-2 ring-indigo-500/20"
                : isAuthorized
                  ? "border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/70"
                  : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/70",
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs flex-shrink-0 transition-colors",
                  isAuthorized
                    ? "bg-emerald-600 text-white"
                    : activeStep === 1
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-200 text-slate-600",
                )}
              >
                {isAuthorized ? <Check className="h-4 w-4 stroke-[3]" /> : "1"}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-900">
                    Step 1: Google Account
                  </span>
                  {isAuthorized ? (
                    <span className="text-[9.5px] font-extrabold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded-full border border-emerald-200">
                      Connected
                    </span>
                  ) : (
                    <span className="text-[9.5px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-full border border-amber-200">
                      Sign-in
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {activeConnection
                    ? activeConnection.externalEmail
                    : "Sign in & Connect"}
                </p>
              </div>
            </div>
            <div className="flex items-center text-slate-400 group-hover:text-indigo-600">
              {activeStep === 1 ? (
                <span className="text-[11px] font-bold text-indigo-600 bg-white px-2 py-0.5 rounded-md border border-indigo-200 shadow-2xs">
                  Active
                </span>
              ) : (
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              )}
            </div>
          </button>

          {/* STEP 2: LINK WEBSITE & STORES */}
          <button
            type="button"
            onClick={() => setActiveStep(2)}
            className={cn(
              "p-3.5 rounded-xl border text-left transition-all cursor-pointer select-none flex items-center justify-between gap-3 group",
              activeStep === 2
                ? "border-indigo-500 bg-indigo-50/70 shadow-xs ring-2 ring-indigo-500/20"
                : totalMappingsCount > 0
                  ? "border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/70"
                  : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/70",
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs flex-shrink-0 transition-colors",
                  totalMappingsCount > 0
                    ? "bg-emerald-600 text-white"
                    : activeStep === 2
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-200 text-slate-600",
                )}
              >
                {totalMappingsCount > 0 ? (
                  <Check className="h-4 w-4 stroke-[3]" />
                ) : (
                  "2"
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-900">
                    Step 2: Link Website & Stores
                  </span>
                  {totalMappingsCount > 0 ? (
                    <span className="text-[9.5px] font-extrabold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded-full border border-emerald-200">
                      {totalMappingsCount} Linked
                    </span>
                  ) : (
                    <span className="text-[9.5px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded-full border border-slate-200">
                      Pending
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {mappedGscCount} Website • {mappedGbpCount} Stores
                </p>
              </div>
            </div>
            <div className="flex items-center text-slate-400 group-hover:text-indigo-600">
              {activeStep === 2 ? (
                <span className="text-[11px] font-bold text-indigo-600 bg-white px-2 py-0.5 rounded-md border border-indigo-200 shadow-2xs">
                  Active
                </span>
              ) : (
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              )}
            </div>
          </button>

          {/* STEP 3: SYNC & REPORTS */}
          <button
            type="button"
            onClick={() => setActiveStep(3)}
            className={cn(
              "p-3.5 rounded-xl border text-left transition-all cursor-pointer select-none flex items-center justify-between gap-3 group",
              activeStep === 3
                ? "border-indigo-500 bg-indigo-50/70 shadow-xs ring-2 ring-indigo-500/20"
                : totalMappingsCount > 0
                  ? "border-indigo-200 bg-indigo-50/30 hover:bg-indigo-50/60"
                  : "border-slate-200 bg-slate-50/50 hover:bg-slate-100/70",
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs flex-shrink-0 transition-colors",
                  activeStep === 3
                    ? "bg-indigo-600 text-white"
                    : totalMappingsCount > 0
                      ? "bg-indigo-100 text-indigo-800"
                      : "bg-slate-200 text-slate-600",
                )}
              >
                <Zap className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-900">
                    Step 3: Sync & View Reports
                  </span>
                  {totalMappingsCount > 0 && (
                    <span className="text-[9.5px] font-extrabold text-indigo-700 bg-indigo-100 px-1.5 py-0.2 rounded-full border border-indigo-200">
                      Ready
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  Sync Data & Open Dashboards
                </p>
              </div>
            </div>
            <div className="flex items-center text-slate-400 group-hover:text-indigo-600">
              {activeStep === 3 ? (
                <span className="text-[11px] font-bold text-indigo-600 bg-white px-2 py-0.5 rounded-md border border-indigo-200 shadow-2xs">
                  Active
                </span>
              ) : (
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              )}
            </div>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── STEP 1 VIEW: GOOGLE ACCOUNT CONNECTION ──                              */}
      {/* ========================================================================= */}
      {activeStep === 1 && (
        <Card className="border-slate-200/90 shadow-2xs rounded-2xl overflow-hidden animate-in fade-in duration-200">
          <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center flex-shrink-0 text-indigo-600 font-extrabold text-base">
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
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200 text-[11px]"
                          : "bg-amber-100 text-amber-800 border-amber-200 text-[11px]"
                      }
                    >
                      {isAuthorized
                        ? "✓ Account Authorized"
                        : "Sign-in Required"}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Connect the Google Account that manages your website in
                    Search Console and your store in Business Profile.
                  </CardDescription>
                </div>
              </div>

              {/* Action Buttons in Step 1 Header */}
              {isAuthorized && (
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isRefreshing || !canManage}
                    className="text-xs font-semibold text-slate-700 gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                    />
                    <span>
                      {isRefreshing ? "Refreshing…" : "Refresh Resources"}
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDisconnectModal(true)}
                    disabled={!canManage}
                    className="text-xs font-semibold text-rose-700 border-rose-200 hover:bg-rose-50 gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Unlink className="h-3.5 w-3.5" />
                    <span>Disconnect</span>
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-5 sm:p-6 space-y-6">
            {activeConnection ? (
              <div className="space-y-5">
                {/* Verified Account Banner */}
                <div className="p-5 bg-gradient-to-r from-emerald-50/70 via-white to-indigo-50/40 border border-emerald-200/80 rounded-2xl shadow-xs">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-extrabold text-base flex-shrink-0 shadow-xs">
                        {activeConnection.externalEmail
                          .slice(0, 1)
                          .toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-slate-900 text-base">
                            {activeConnection.externalEmail}
                          </span>
                          <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            ✓ Connected
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-semibold shadow-2xs">
                        <Globe className="h-3.5 w-3.5 text-indigo-600" />
                        <span>
                          {gscResources.length} Website Property Found
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-semibold shadow-2xs">
                        <MapPin className="h-3.5 w-3.5 text-teal-600" />
                        <span>{gbpResources.length} Store Location Found</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* PRIMARY CTA FOOTER FOR STEP 1 */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-5 border-t border-slate-100">
                  <span className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-emerald-600 stroke-[3]" />
                    Google Account authorized. You are ready to connect your
                    website and store.
                  </span>

                  <Button
                    type="button"
                    onClick={() => setActiveStep(2)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs gap-2 px-5 py-2.5 shadow-sm cursor-pointer ring-2 ring-indigo-500/20 self-end sm:self-auto"
                  >
                    <span>Continue to Step 2: Link Website & Stores</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              /* Not Connected: Friendly Welcoming Call to Action */
              <div className="p-8 text-center space-y-4 bg-gradient-to-b from-indigo-50/40 via-white to-slate-50/60 border border-dashed border-indigo-200 rounded-2xl">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-md">
                  <Globe className="h-7 w-7" />
                </div>
                <div className="max-w-md mx-auto space-y-1.5">
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Connect Your Google Account
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Sign in with the Google Account that manages your website in
                    Google Search Console or your business listing on Google
                    Maps.
                  </p>
                </div>

                <div className="pt-2">
                  <Button
                    size="lg"
                    onClick={handleConnect}
                    disabled={isConnecting || !canManage}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs gap-2 px-6 py-3 shadow-md cursor-pointer ring-4 ring-indigo-500/10"
                  >
                    <span>
                      {isConnecting
                        ? "Opening Google Sign-In…"
                        : "Sign In With Google"}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* ── STEP 2 VIEW: CONNECT WEBSITE & STOREFRONT (RESOURCE MAPPING) ──        */}
      {/* ========================================================================= */}
      {activeStep === 2 && (
        <Card className="border-slate-200/90 shadow-2xs rounded-2xl overflow-hidden animate-in fade-in duration-200">
          <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center flex-shrink-0 text-indigo-600 font-extrabold text-base">
                  2
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-bold text-slate-900">
                      Step 2: Connect Your Website & Storefront
                    </CardTitle>
                    <Badge
                      className={
                        totalMappingsCount > 0
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200 text-[11px]"
                          : "bg-amber-100 text-amber-800 border-amber-200 text-[11px]"
                      }
                    >
                      {totalMappingsCount > 0
                        ? `✓ ${totalMappingsCount} Connected`
                        : "Ready to Link"}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Link your website (Google Search Console) and store
                    locations (Google Business Profile) to your business.
                  </CardDescription>
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing || !canManage}
                  className="text-xs font-semibold text-slate-700 gap-1.5 cursor-pointer shadow-2xs"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                  <span>
                    {isRefreshing
                      ? "Refreshing…"
                      : "Refresh Discovered Listings"}
                  </span>
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ---------------------------------------------------------------- */}
              {/* 1. GOOGLE SEARCH CONSOLE (WEBSITES)                              */}
              {/* ---------------------------------------------------------------- */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Website (Google Search Console)
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-slate-500">
                    {mappedGscCount} of {gscResources.length} Linked
                  </span>
                </div>

                {!isAuthorized ? (
                  <div className="p-5 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <p>
                      Please complete Step 1 to connect your Google account.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setActiveStep(1)}
                      variant="outline"
                      className="text-xs"
                    >
                      Go to Step 1
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {/* Discovered / Linked Websites */}
                    {gscResources.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1.5">
                        <p className="font-bold text-slate-800">
                          No websites found in Google Search Console
                        </p>
                        <p className="text-[11.5px] text-slate-500 leading-relaxed">
                          Enter your website URL below to connect directly, or
                          verify your website on Google Search Console.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {gscResources.map((res) => {
                          const activeMapping =
                            initialState.internalMappings.find(
                              (m) =>
                                m.resourceId === res.id &&
                                m.internalType === "BRAND",
                            );
                          const mappedBrand = initialState.brands.find(
                            (b) => b.id === activeMapping?.internalId,
                          );
                          const isMapped = Boolean(activeMapping);
                          const isProcessing =
                            mappingInProgressId === res.id ||
                            unmappingInProgressId === activeMapping?.id ||
                            unmappingInProgressId === res.id;

                          return (
                            <div
                              key={res.id}
                              className={cn(
                                "p-3.5 rounded-xl border transition-all",
                                isMapped
                                  ? "bg-emerald-50/50 border-emerald-200 text-slate-900 shadow-2xs"
                                  : "bg-amber-50/50 border-amber-200 text-slate-900 shadow-2xs",
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {isMapped &&
                                    res.connectionAccess?.[0]?.canAccess ===
                                      true ? (
                                      <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                                        ✓ Connected
                                      </span>
                                    ) : isMapped ? (
                                      <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 shadow-sm flex items-center gap-1">
                                        <svg
                                          className="w-3 h-3"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          stroke="currentColor"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                          />
                                        </svg>
                                        Unverified in GSC
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200 uppercase">
                                        ⚠️ Ready to Connect
                                      </span>
                                    )}
                                    <span className="text-xs font-bold text-slate-900 truncate">
                                      {res.externalResourceId}
                                    </span>
                                  </div>

                                  {isMapped ? (
                                    <p className="text-xs text-emerald-800 font-medium">
                                      Linked to Brand:{" "}
                                      <strong className="font-bold">
                                        {mappedBrand?.name || "Brand"}
                                      </strong>
                                    </p>
                                  ) : (
                                    <p className="text-[11.5px] text-amber-800">
                                      Discovered from Google. Choose which brand
                                      to link this website to:
                                    </p>
                                  )}
                                </div>

                                {isMapped ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      activeMapping &&
                                      handleUnmap(activeMapping.id)
                                    }
                                    disabled={isProcessing || !canManage}
                                    className="text-xs text-slate-600 hover:text-rose-700 border-slate-200 hover:bg-rose-50 flex-shrink-0 cursor-pointer shadow-2xs"
                                  >
                                    {isProcessing ? "Unlinking…" : "Unlink"}
                                  </Button>
                                ) : null}
                              </div>

                              {isMapped &&
                                res.connectionAccess?.[0]?.canAccess !== true && (
                                  <div className="mt-3 pt-3 border-t border-amber-200/70">
                                    <div className="text-[11px] text-amber-900 bg-amber-100/50 p-3 rounded-lg border border-amber-200">
                                      <p className="font-bold mb-1 flex items-center gap-1.5">
                                        <svg
                                          className="w-3.5 h-3.5"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          stroke="currentColor"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                          />
                                        </svg>
                                        Action Required: Verify in Google Search
                                        Console
                                      </p>
                                      <p className="leading-relaxed opacity-90">
                                        This website is currently unverified. To
                                        pull real data, go to{" "}
                                        <a
                                          href="https://search.google.com/search-console"
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="underline font-bold hover:text-amber-950"
                                        >
                                          search.google.com/search-console
                                        </a>
                                        , click "Add Property", and verify
                                        ownership of this domain using the same
                                        Google account you connected in Step 1.
                                      </p>
                                    </div>
                                  </div>
                                )}

                              {!isMapped && (
                                <div className="mt-3 pt-3 border-t border-amber-200/70 flex flex-col sm:flex-row sm:items-center gap-2">
                                  <select
                                    value={
                                      pendingBrandSelections[res.id] ||
                                      initialState.brands[0]?.id ||
                                      ""
                                    }
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
                                        Connect to: {b.name}
                                      </option>
                                    ))}
                                  </select>

                                  <Button
                                    size="sm"
                                    onClick={() => handleMapGsc(res.id)}
                                    disabled={isProcessing || !canManage}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-1.5 flex-shrink-0 cursor-pointer shadow-xs"
                                  >
                                    {isProcessing &&
                                    mappingInProgressId === res.id
                                      ? "Connecting…"
                                      : "Connect Website"}
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteResource(res.id)}
                                    disabled={isProcessing || !canManage}
                                    className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 px-2 py-1.5 cursor-pointer flex-shrink-0"
                                    title="Hide this discovered website"
                                  >
                                    {isProcessing &&
                                    unmappingInProgressId === res.id ? (
                                      <RefreshCw className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M6 18L18 6M6 6l12 12"
                                        />
                                      </svg>
                                    )}
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Quick Website Connect Input Form */}
                    {canManage && (
                      <form
                        onSubmit={handleAddManualSite}
                        className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-200/70 space-y-2.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                            <Plus className="h-3.5 w-3.5 text-indigo-600" />
                            Connect Another Website Directly
                          </span>
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                            Direct Link
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            value={manualSiteUrl}
                            onChange={(e) => setManualSiteUrl(e.target.value)}
                            placeholder="e.g. https://lakshmifood.com"
                            className="text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none flex-grow"
                          />
                          <select
                            value={
                              manualBrandId || initialState.brands[0]?.id || ""
                            }
                            onChange={(e) => setManualBrandId(e.target.value)}
                            className="text-xs font-bold bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none flex-shrink-0"
                          >
                            {initialState.brands.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name}
                              </option>
                            ))}
                          </select>
                          <Button
                            type="submit"
                            size="sm"
                            disabled={
                              isAddingManualSite || !manualSiteUrl.trim()
                            }
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-1.5 flex-shrink-0 cursor-pointer shadow-xs"
                          >
                            {isAddingManualSite ? "Linking…" : "Link Website"}
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>

              {/* ---------------------------------------------------------------- */}
              {/* 2. GOOGLE BUSINESS PROFILE (STOREFRONTS)                         */}
              {/* ---------------------------------------------------------------- */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-teal-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Storefront (Google Business Profile)
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {gbpResources.length > 1 && canManage && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAutoMapBrand}
                        disabled={isAutoMapping}
                        className="text-xs font-semibold text-teal-700 border-teal-200 hover:bg-teal-50 gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Zap
                          className={`h-3.5 w-3.5 ${isAutoMapping ? "animate-spin" : ""}`}
                        />
                        <span>
                          {isAutoMapping ? "Auto-Linking…" : "⚡ Auto-Link"}
                        </span>
                      </Button>
                    )}
                    <span className="text-xs font-bold text-slate-500">
                      {mappedGbpCount} of {gbpResources.length} Linked
                    </span>
                  </div>
                </div>

                {!isAuthorized ? (
                  <div className="p-5 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <p>
                      Please complete Step 1 to connect your Google account.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setActiveStep(1)}
                      variant="outline"
                      className="text-xs"
                    >
                      Go to Step 1
                    </Button>
                  </div>
                ) : gbpResources.length === 0 ? (
                  /* ── REASSURING & FRIENDLY 0-LOCATIONS GUIDANCE ── */
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3.5">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 flex-shrink-0 mt-0.5">
                        <Store className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">
                          No Store Locations Found
                        </h4>
                        <p className="text-[11.5px] text-slate-500 mt-0.5 leading-relaxed">
                          No Google Maps store locations found for{" "}
                          <strong className="text-slate-800">
                            {activeConnection?.externalEmail}
                          </strong>
                          .
                        </p>
                      </div>
                    </div>

                    {/* Clear 2-Path Explanation for the User */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 space-y-3 text-[11.5px]">
                      <div className="space-y-1">
                        <p className="font-bold text-slate-900 flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                          Are you an online-only business?
                        </p>
                        <p className="text-slate-600 pl-5 leading-relaxed">
                          You do <strong className="text-slate-800">not</strong>{" "}
                          need a Google Business Profile! Your website is
                          already connected on the left. You can safely click
                          &ldquo;Continue to Step 3&rdquo; below.
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 space-y-1">
                        <p className="font-bold text-slate-900 flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-indigo-600 flex-shrink-0" />
                          Have a physical storefront on Google Maps?
                        </p>
                        <ul className="text-slate-600 pl-5 space-y-1 list-disc leading-relaxed">
                          <li>
                            Confirm that{" "}
                            <strong className="text-slate-800">
                              {activeConnection?.externalEmail}
                            </strong>{" "}
                            has &ldquo;Owner&rdquo; or &ldquo;Manager&rdquo;
                            role on Google Business Profile.
                          </li>
                          <li>
                            If your store is managed by another Google account,
                            click &ldquo;Back to Step 1&rdquo; to sign in with
                            that account.
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* Helpful Action Links */}
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <RefreshCw
                          className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                        />
                        <span>
                          {isRefreshing ? "Checking…" : "Check Again"}
                        </span>
                      </Button>

                      <a
                        href="https://business.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                      >
                        <span>Open Google Business Profile</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  /* Discovered GBP Locations List */
                  <div className="space-y-2.5">
                    {gbpResources.map((res) => {
                      const activeMapping = initialState.internalMappings.find(
                        (m) =>
                          m.resourceId === res.id &&
                          m.internalType === "LOCATION",
                      );
                      const mappedLocation = initialState.locations.find(
                        (l) => l.id === activeMapping?.internalId,
                      );
                      const isMapped = Boolean(activeMapping);
                      const isProcessing =
                        mappingInProgressId === res.id ||
                        unmappingInProgressId === activeMapping?.id;

                      return (
                        <div
                          key={res.id}
                          className={cn(
                            "p-3.5 rounded-xl border transition-all",
                            isMapped
                              ? "bg-emerald-50/50 border-emerald-200 text-slate-900 shadow-2xs"
                              : "bg-amber-50/50 border-amber-200 text-slate-900 shadow-2xs",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={cn(
                                    "text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full",
                                    isMapped
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                      : "bg-amber-100 text-amber-800 border border-amber-200",
                                  )}
                                >
                                  {isMapped
                                    ? "✓ Connected"
                                    : "⚠️ Ready to Connect"}
                                </span>
                                <span className="text-xs font-bold text-slate-900 truncate">
                                  {res.resourceName}
                                </span>
                              </div>

                              {isMapped ? (
                                <p className="text-xs text-emerald-800 font-medium">
                                  Linked to Store:{" "}
                                  <strong className="font-bold">
                                    {mappedLocation?.name || "Location"}
                                  </strong>{" "}
                                  ({mappedLocation?.city})
                                </p>
                              ) : (
                                <p className="text-[11.5px] text-amber-800">
                                  Google Business Profile found. Choose which
                                  location to link:
                                </p>
                              )}
                            </div>

                            {isMapped ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  activeMapping && handleUnmap(activeMapping.id)
                                }
                                disabled={isProcessing || !canManage}
                                className="text-xs text-slate-600 hover:text-rose-700 border-slate-200 hover:bg-rose-50 flex-shrink-0 cursor-pointer shadow-2xs"
                              >
                                {isProcessing ? "Unlinking…" : "Unlink"}
                              </Button>
                            ) : null}
                          </div>

                          {!isMapped && (
                            <div className="mt-3 pt-3 border-t border-amber-200/70 flex flex-col sm:flex-row sm:items-center gap-2">
                              <select
                                value={
                                  pendingLocationSelections[res.id] ||
                                  initialState.locations[0]?.id ||
                                  ""
                                }
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
                                    Connect to: {loc.name} ({loc.city})
                                  </option>
                                ))}
                              </select>

                              <Button
                                size="sm"
                                onClick={() => handleMapLocation(res.id)}
                                disabled={isProcessing || !canManage}
                                className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-4 py-1.5 flex-shrink-0 cursor-pointer shadow-xs"
                              >
                                {isProcessing
                                  ? "Connecting…"
                                  : "Connect Store Location"}
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

            {/* STEP 2 NAVIGATION FOOTER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-5 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveStep(1)}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Step 1</span>
              </Button>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                  {totalMappingsCount > 0
                    ? `${totalMappingsCount} resource(s) connected`
                    : "Ready to proceed"}
                </span>
                <Button
                  type="button"
                  onClick={() => setActiveStep(3)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs gap-2 px-5 py-2.5 shadow-sm cursor-pointer ring-2 ring-indigo-500/20"
                >
                  <span>Continue to Step 3: Sync & View Reports</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* ── STEP 3 VIEW: DATA SYNCHRONIZATION & DASHBOARDS ──                      */}
      {/* ========================================================================= */}
      {activeStep === 3 && (
        <Card className="border-slate-200/90 shadow-2xs rounded-2xl overflow-hidden animate-in fade-in duration-200">
          <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center flex-shrink-0 text-indigo-600 font-extrabold text-base">
                3
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Step 3: Sync Data & Open Reports
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Fetch your latest performance data from Google to view
                  customer searches, clicks, and store visits.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5 sm:p-6 space-y-6">
            {/* Live Sync Action Hero Banner */}
            <div className="p-5 bg-gradient-to-r from-indigo-50/90 via-purple-50/40 to-emerald-50/80 border border-indigo-200/80 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                  <h4 className="font-extrabold text-slate-900 text-sm">
                    {totalMappingsCount > 0
                      ? `${totalMappingsCount} Connected Account(s) Ready to Sync`
                      : "Ready to Sync Google Data"}
                  </h4>
                </div>
                <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
                  Click below to fetch your latest Google search keywords,
                  clicks, store calls, and directions directly into your
                  reports.
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-shrink-0">
                <Button
                  size="sm"
                  onClick={handleTriggerSync}
                  disabled={isSyncing || !canManage}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-5 py-2.5 gap-2 shadow-xs cursor-pointer ring-2 ring-indigo-500/20"
                >
                  <Zap
                    className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
                  />
                  <span>
                    {isSyncing ? "Synchronizing…" : "⚡ Sync Google Data Now"}
                  </span>
                </Button>
              </div>
            </div>

            {/* Direct Dashboard Launch Cards */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-indigo-600" />
                View Your Reports & Dashboards
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* 1. Google Search Console Dashboard */}
                <Link
                  href={`/client/${tenantSlug}/reports/gsc`}
                  className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-indigo-300 hover:shadow-xs transition-all group flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                      <Globe className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs group-hover:text-indigo-600 transition-colors">
                        Google Search Console
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        View organic search clicks, impressions, CTR, and top
                        keyword queries.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600">
                    <span>Open Search Reports</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>

                {/* 2. Google Business Profile Dashboard */}
                <Link
                  href={`/client/${tenantSlug}/reports/gbp`}
                  className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-teal-300 hover:shadow-xs transition-all group flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                      <Store className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs group-hover:text-teal-600 transition-colors">
                        Google Business Profile
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        Monitor customer calls, driving directions, map views,
                        and local interactions.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-teal-600">
                    <span>Open Store Reports</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>

                {/* 3. Executive Overview Dashboard */}
                <Link
                  href={`/client/${tenantSlug}`}
                  className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-purple-300 hover:shadow-xs transition-all group flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                      <BarChart3 className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs group-hover:text-purple-600 transition-colors">
                        Executive Overview
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        High-level KPI dashboards aggregating web traffic and
                        physical store reach.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-600">
                    <span>Open Overview Dashboard</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              </div>
            </div>

            {/* STEP 3 NAVIGATION FOOTER */}
            <div className="flex items-center justify-between pt-5 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveStep(2)}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Step 2: Link Website & Stores</span>
              </Button>

              <Link
                href={`/client/${tenantSlug}/reports/gsc`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                <span>Go to Search Reports</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

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
// force recompile turbopack cache
