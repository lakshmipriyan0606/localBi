'use client';

import Link from 'next/link';
import { BarChart2 } from 'lucide-react';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { LocationStatusBanner } from './location-status-banner';
import { LocationKpiGrid } from './location-kpi-grid';
import { LocationMetaCards } from './location-meta-cards';

export interface LocationDetailProps {
  tenantSlug: string;
  tenantName: string;
  location: {
    id: string;
    name: string;
    storeCode: string | null;
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    timezone: string;
    brandName: string;
    brandId: string;
  };
  mapping: {
    isMapped: boolean;
    resourceName: string | null;
    externalResourceId: string | null;
    verified: boolean;
  };
  metricsSummary: {
    searchViews: number;
    mapsViews: number;
    totalViews: number;
    callClicks: number;
    websiteClicks: number;
    directionRequests: number;
  };
}

export function LocationDetailView({
  tenantSlug,
  tenantName,
  location,
  mapping,
  metricsSummary,
}: LocationDetailProps) {
  const isVerified = mapping.isMapped && mapping.verified;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Locations', href: `/client/${tenantSlug}/locations` },
          { label: location.name, current: true },
        ]}
        tenantSlug={tenantSlug}
      />

      <PageHeader
        title={location.name}
        description={`Store location under brand ${location.brandName} in ${location.city}, ${location.state}.`}
        badge={
          <div className="flex items-center gap-2">
            {location.storeCode && (
              <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-semibold">
                {location.storeCode}
              </span>
            )}
            <Badge
              className={
                isVerified
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : mapping.isMapped
                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }
            >
              {isVerified ? 'GBP Connected & Verified' : mapping.isMapped ? 'GBP Mapped (Unverified)' : 'Not Mapped'}
            </Badge>
          </div>
        }
        actions={
          <Link
            href={`/client/${tenantSlug}/reports/gbp/locations?brandId=${location.brandId}&locationId=${location.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <BarChart2 className="h-3.5 w-3.5" />
            <span>View Local Reports</span>
          </Link>
        }
      />

      <LocationStatusBanner tenantSlug={tenantSlug} mapping={mapping} />
      <LocationKpiGrid metricsSummary={metricsSummary} />
      <LocationMetaCards tenantName={tenantName} location={location} mapping={mapping} />
    </div>
  );
}
