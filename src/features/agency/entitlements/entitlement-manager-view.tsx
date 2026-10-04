'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Building2,
  Sliders,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  Layers,
  Lock,
  Unlock,
} from 'lucide-react';
import {
  useAgencyClientsQuery,
  useEntitlementsQuery,
  useUpdateEntitlementMutation,
} from '../hooks/use-agency';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { FeatureKey, FeatureKeyType } from '@/modules/agency/agency-types';

interface EntitlementManagerViewProps {
  tenantSlug: string;
}

const FEATURE_DESCRIPTIONS: Record<string, { label: string; description: string; module: string }> = {
  [FeatureKey.GBP]: {
    label: 'Google Business Profile',
    description: 'Sync GBP profiles, manage operational hours, reviews, media, and social posts.',
    module: 'Reputation & Maps',
  },
  [FeatureKey.WEBSITE]: {
    label: 'Website & Core Web Vitals',
    description: 'Audit crawlability, indexation, sitemaps, and Core Web Vitals across brand web surfaces.',
    module: 'Technical SEO',
  },
  [FeatureKey.ANALYTICS]: {
    label: 'GA4 Multi-Channel Analytics',
    description: 'Track visitor traffic, session channels, device breakdowns, and event goals.',
    module: 'Web Analytics',
  },
  [FeatureKey.RANK_TRACKING]: {
    label: 'Local Rank Tracking Grid',
    description: 'Pinpoint local map pack positions, geo-grid sweeps, and rank distribution history.',
    module: 'Search Visibility',
  },
  [FeatureKey.MERCHANT]: {
    label: 'Google Merchant Center',
    description: 'Sync store product catalogs and monitor Google Shopping feed approvals.',
    module: 'E-Commerce',
  },
  [FeatureKey.CALL_TRACKING]: {
    label: 'Call Tracking & Dynamic Numbers',
    description: 'Attributed phone call recordings, duration metrics, and telephony analytics.',
    module: 'Voice Attribution',
  },
  [FeatureKey.OPPORTUNITIES]: {
    label: 'SEO & Growth Opportunities',
    description: 'AI-driven gap analysis, high-yield search queries, and content recommendations.',
    module: 'Intelligence',
  },
  [FeatureKey.CONTENT]: {
    label: 'Content Engine',
    description: 'Generate localized pages, blog posts, and scheduled marketing updates.',
    module: 'Content Hub',
  },
  [FeatureKey.LISTINGS]: {
    label: 'Directory Listings & Citations',
    description: 'Synchronize citations across directories and monitor NAP consistency.',
    module: 'Listings Hub',
  },
  [FeatureKey.REPORTING]: {
    label: 'Executive Performance Reports',
    description: 'Generate printable executive summaries across search, calls, and conversions.',
    module: 'Reporting',
  },
  [FeatureKey.WHITELABEL]: {
    label: 'White-Label Branding & Domains',
    description: 'Custom portal domains, agency logo replacements, and custom report styling.',
    module: 'Agency Features',
  },
};

export function EntitlementManagerView({ tenantSlug }: EntitlementManagerViewProps) {
  const [selectedClientAccountId, setSelectedClientAccountId] = useState<string>('');

  const { data: clientsData, isLoading: isLoadingClients } = useAgencyClientsQuery(tenantSlug, {
    pageSize: 100,
  });

  const {
    data: entitlements,
    isLoading: isLoadingEntitlements,
    isError,
    error,
    refetch,
  } = useEntitlementsQuery(tenantSlug, selectedClientAccountId || undefined);

  const updateEntitlementMutation = useUpdateEntitlementMutation(tenantSlug);

  const clients = clientsData?.clients || [];
  const selectedClient = clients.find((c) => c.id === selectedClientAccountId);

  const handleToggle = async (featureKey: string, currentEnabled: boolean) => {
    await updateEntitlementMutation.mutateAsync({
      clientAccountId: selectedClientAccountId || undefined,
      featureKey,
      enabled: !currentEnabled,
    });
  };

  const featureKeysList = Object.keys(FEATURE_DESCRIPTIONS);

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Feature Entitlements & Governance"
        description="Configure feature access and quota limits for the agency tenant or fine-tune overrides for individual client accounts."
      />

      {/* Target Selector */}
      <Card className="border-slate-200/80 shadow-sm">
        <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Configuring Scope
            </span>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-indigo-600" />
              <span className="font-bold text-base text-slate-900">
                {selectedClientAccountId ? `Client Override: ${selectedClient?.name}` : 'Agency Tenant Defaults'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {selectedClientAccountId
                ? 'Changes made here will apply specifically to this client account, overriding tenant-level defaults.'
                : 'Default feature access granted to all clients under this agency unless an account override is configured.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedClientAccountId}
              onChange={(e) => setSelectedClientAccountId(e.target.value)}
              className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">🏢 Agency-Wide Defaults</option>
              <optgroup label="Client Accounts">
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.status})
                  </option>
                ))}
              </optgroup>
            </select>

            {selectedClientAccountId && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setSelectedClientAccountId('')}
              >
                Reset to Agency Defaults
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feature Entitlements Matrix */}
      <Card className="border-slate-200/80 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Feature Availability Matrix
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Toggle feature modules on or off for this target scope
              </CardDescription>
            </div>
            <Badge variant="indigo" className="text-xs">
              {featureKeysList.length} Modular Features
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoadingEntitlements ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : isError ? (
            <div className="p-8">
              <ErrorState
                title="Failed to load entitlements"
                message={error?.message || 'Error communicating with entitlement service.'}
                onRetry={() => refetch()}
              />
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {featureKeysList.map((key) => {
                const featureInfo = FEATURE_DESCRIPTIONS[key];
                const entitlement = entitlements ? entitlements[key] : undefined;
                const isEnabled = entitlement?.enabled ?? true;
                const source = entitlement?.source ?? 'PLAN_DEFAULT';

                return (
                  <div
                    key={key}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="font-semibold text-sm text-slate-900">
                          {featureInfo.label}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          {key}
                        </span>
                        <Badge variant="slate" className="text-[10px]">
                          {featureInfo.module}
                        </Badge>
                        {source === 'CLIENT_OVERRIDE' && (
                          <Badge variant="purple" className="text-[10px]">
                            Client Override
                          </Badge>
                        )}
                        {source === 'MANUAL_OVERRIDE' && (
                          <Badge variant="indigo" className="text-[10px]">
                            Agency Custom
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 max-w-xl">
                        {featureInfo.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="flex items-center gap-2">
                        {isEnabled ? (
                          <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                            <CheckCircle2 className="h-4 w-4" />
                            Enabled
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                            <XCircle className="h-4 w-4" />
                            Disabled
                          </span>
                        )}
                      </div>

                      <Button
                        variant={isEnabled ? 'outline' : 'primary'}
                        size="sm"
                        className="text-xs min-w-[90px]"
                        onClick={() => handleToggle(key, isEnabled)}
                        disabled={updateEntitlementMutation.isPending}
                      >
                        {isEnabled ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
