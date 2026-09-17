'use client';

import Link from 'next/link';
import { Search, PhoneCall, Globe, Navigation, ArrowRight, Sparkles } from 'lucide-react';
import { ActionMetricCard } from './metric-card';
import { ActionMetricCardSkeleton } from './action-metric-card-skeleton';
import { formatNumber } from '@/shared/lib/formatters';

export interface ReportsGbpSectionProps {
  summary: any;
  isLoading: boolean;
  tenantSlug: string;
  selectedBrandId: string;
  dateRangeDays: number;
}

export function ReportsGbpSection({ summary, isLoading, tenantSlug, selectedBrandId, dateRangeDays }: ReportsGbpSectionProps) {
  if (isLoading) {
    return (
      <section aria-label="Loading customer action metrics" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-teal-600 animate-pulse" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Google Business Profile — Local Listings & Customer Actions
            </h2>
          </div>
          <span className="text-xs text-slate-400">Syncing telemetry…</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-300">
          <ActionMetricCardSkeleton icon={Search} iconBg="bg-teal-50 border border-teal-100" iconColor="text-teal-600" />
          <ActionMetricCardSkeleton icon={PhoneCall} iconBg="bg-blue-50 border border-blue-100" iconColor="text-blue-600" />
          <ActionMetricCardSkeleton icon={Globe} iconBg="bg-indigo-50 border border-indigo-100" iconColor="text-indigo-600" />
          <ActionMetricCardSkeleton icon={Navigation} iconBg="bg-emerald-50 border border-emerald-100" iconColor="text-emerald-600" />
        </div>
      </section>
    );
  }

  const gbp = summary?.gbp;
  const hasGbpData = Boolean(gbp && (gbp.totalViews > 0 || gbp.callClicks > 0 || gbp.websiteClicks > 0 || gbp.directionRequests > 0));

  return (
    <section aria-label="Google Business Profile customer action metrics" className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-teal-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Google Business Profile — Local Listings & Customer Actions
          </h2>
        </div>
        <Link
          href={`/t/${tenantSlug}/reports/gbp/locations?days=${dateRangeDays}&brandId=${selectedBrandId}`}
          className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1 hover:underline"
        >
          <span>View All Locations</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ActionMetricCard
          label="Profile Impressions"
          value={formatNumber(gbp?.totalViews)}
          description={`Search: ${formatNumber(gbp?.totalSearchViews)} · Maps: ${formatNumber(gbp?.totalMapsViews)}`}
          icon={Search}
          iconBg="bg-teal-100"
          iconColor="text-teal-700"
          href={`/t/${tenantSlug}/reports/gbp/locations?days=${dateRangeDays}&brandId=${selectedBrandId}`}
        />
        <ActionMetricCard
          label="Call-Button Clicks"
          value={formatNumber(gbp?.callClicks)}
          description="Taps on profile phone link (not completed calls)"
          icon={PhoneCall}
          iconBg="bg-blue-100"
          iconColor="text-blue-700"
          href={`/t/${tenantSlug}/reports/gbp/locations?days=${dateRangeDays}&brandId=${selectedBrandId}&sortBy=callClicks`}
        />
        <ActionMetricCard
          label="Website Link Clicks"
          value={formatNumber(gbp?.websiteClicks)}
          description="Link taps to site from listing (not confirmed web sessions)"
          icon={Globe}
          iconBg="bg-indigo-100"
          iconColor="text-indigo-700"
          href={`/t/${tenantSlug}/reports/gbp/locations?days=${dateRangeDays}&brandId=${selectedBrandId}&sortBy=websiteClicks`}
        />
        <ActionMetricCard
          label="Direction Requests"
          value={formatNumber(gbp?.directionRequests)}
          description="Navigation requests in Maps (not confirmed store visits)"
          icon={Navigation}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-700"
          href={`/t/${tenantSlug}/reports/gbp/locations?days=${dateRangeDays}&brandId=${selectedBrandId}&sortBy=directionRequests`}
        />
      </div>

      {!hasGbpData && (
        <div className="p-3.5 bg-teal-50/50 border border-teal-200/80 rounded-xl flex items-center justify-between gap-3 text-xs text-teal-900">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-teal-600 flex-shrink-0" />
            <span>No Google Business Profile metrics synced for this brand. Map your locations in the Integrations tab.</span>
          </div>
          <Link href={`/t/${tenantSlug}/integrations`} className="font-semibold underline hover:text-teal-950 flex-shrink-0">
            Configure GBP
          </Link>
        </div>
      )}
    </section>
  );
}
