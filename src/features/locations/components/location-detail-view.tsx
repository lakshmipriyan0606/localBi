'use client';

import Link from 'next/link';
import {
  MapPin,
  Building2,
  Globe,
  PhoneCall,
  Navigation,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  BarChart2,
} from 'lucide-react';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/shared/lib/formatters';

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
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumbs
        items={[
          { label: 'Locations', href: `/t/${tenantSlug}/locations` },
          { label: location.name, current: true },
        ]}
        tenantSlug={tenantSlug}
      />

      {/* Header */}
      <PageHeader
        title={location.name}
        description={
          <>
            Store location under brand{' '}
            <strong className="text-slate-800 font-semibold">{location.brandName}</strong>{' '}
            in {location.city}, {location.state}.
          </>
        }
        badge={
          <div className="flex items-center gap-2">
            {location.storeCode && (
              <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-semibold">
                {location.storeCode}
              </span>
            )}
            <Badge
              className={
                mapping.isMapped && mapping.verified
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : mapping.isMapped
                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }
            >
              {mapping.isMapped && mapping.verified
                ? 'GBP Connected & Verified'
                : mapping.isMapped
                ? 'GBP Mapped (Unverified)'
                : 'Not Mapped'}
            </Badge>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/t/${tenantSlug}/reports/gbp/locations?brandId=${location.brandId}&locationId=${location.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <BarChart2 className="h-3.5 w-3.5" />
              <span>View Local Reports</span>
            </Link>
          </div>
        }
      />

      {/* Google Business Profile Status Banner */}
      <div
        className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          mapping.isMapped && mapping.verified
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
            : mapping.isMapped
            ? 'bg-amber-50/70 border-amber-200 text-amber-900'
            : 'bg-slate-50 border-slate-200 text-slate-800'
        }`}
      >
        <div className="flex items-start gap-3">
          {mapping.isMapped && mapping.verified ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-semibold text-sm">
              {mapping.isMapped
                ? `Connected to Google Business Profile: ${mapping.resourceName || mapping.externalResourceId}`
                : 'Google Business Profile not linked to this storefront'}
            </p>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              {mapping.isMapped && mapping.verified
                ? 'Voice of Merchant verification confirmed. Google Search and Maps impressions and customer actions are syncing.'
                : mapping.isMapped
                ? 'Google Business Profile resource mapped, but Google Voice of Merchant verification is incomplete.'
                : 'Link this location to a discovered Google Business Profile in the Integrations portal to enable local SEO performance tracking.'}
            </p>
          </div>
        </div>

        <Link
          href={`/t/${tenantSlug}/integrations`}
          className="flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:underline flex-shrink-0"
        >
          <span>Manage Mapping</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* 30-Day Performance Overview Grid */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          30-Day Performance & Consumer Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className="text-xs font-medium text-slate-500">Profile Impressions</span>
            <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
              {formatNumber(metricsSummary.totalViews)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Search: {formatNumber(metricsSummary.searchViews)} · Maps: {formatNumber(metricsSummary.mapsViews)}
            </p>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Phone Call Clicks</span>
              <PhoneCall className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
              {formatNumber(metricsSummary.callClicks)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Taps on profile call button
            </p>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Website Link Clicks</span>
              <Globe className="h-4 w-4 text-teal-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
              {formatNumber(metricsSummary.websiteClicks)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Taps on profile website link
            </p>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Direction Requests</span>
              <Navigation className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
              {formatNumber(metricsSummary.directionRequests)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Driving route requests in Maps
            </p>
          </div>
        </div>
      </div>

      {/* Location Details & Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Physical Address Card */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <MapPin className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-900">Physical Storefront Details</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Street Address</span>
              <span className="font-medium text-slate-900 text-right">{location.addressLine1}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">City / Locality</span>
              <span className="font-medium text-slate-900">{location.city}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">State / Province</span>
              <span className="font-medium text-slate-900">{location.state}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Postal Code</span>
              <span className="font-mono font-medium text-slate-900">{location.postalCode}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Country ISO Code</span>
              <span className="font-mono font-semibold text-slate-900">{location.country}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">IANA Timezone</span>
              <span className="font-mono text-slate-700">{location.timezone}</span>
            </div>
          </div>
        </div>

        {/* Integration & Scope Context */}
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building2 className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-900">Brand & Tenant Hierarchy</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Client Workspace</span>
              <span className="font-semibold text-slate-900">{tenantName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Parent Brand</span>
              <span className="font-semibold text-slate-900">{location.brandName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Internal Store Code</span>
              <span className="font-mono font-bold text-slate-800">{location.storeCode || '—'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Google External Resource</span>
              <span className="font-mono text-slate-600 truncate max-w-[200px]">
                {mapping.externalResourceId || 'Not linked'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Voice of Merchant</span>
              <span className={`font-semibold ${mapping.verified ? 'text-emerald-700' : 'text-amber-700'}`}>
                {mapping.verified ? 'Verified Active' : 'Pending Verification'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
