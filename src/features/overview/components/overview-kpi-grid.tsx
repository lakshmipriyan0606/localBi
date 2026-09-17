'use client';

import { MousePointerClick, Eye, Globe, PhoneCall, Navigation } from 'lucide-react';
import { formatDateRange } from '@/shared/lib/formatters';
import { AnalyticsLoader } from '@/components/ui/analytics-loader';
import { OverviewKpiCard } from './overview-kpi-card';
import { OverviewKpiEmpty } from './overview-kpi-empty';

interface OverviewKpiGridProps {
  tenantSlug: string;
  primaryBrand: { id: string; name: string } | null;
  performanceSummary: any;
  startDate: string;
  endDate: string;
  isLoading?: boolean;
}

export function OverviewKpiGrid({
  tenantSlug,
  primaryBrand,
  performanceSummary,
  startDate,
  endDate,
  isLoading = false,
}: OverviewKpiGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <AnalyticsLoader key={i} variant="card" />
        ))}
      </div>
    );
  }

  const gsc = performanceSummary?.gsc;
  const gbp = performanceSummary?.gbp;
  const prev = performanceSummary?.previousPeriod;
  const hasData = Boolean(performanceSummary && (gsc?.totalClicks > 0 || gsc?.totalImpressions > 0 || gbp?.totalViews > 0));

  return (
    <section className="space-y-3" aria-label="Executive Performance Indicators">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-indigo-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            30-Day Executive Performance — {primaryBrand?.name || 'All Brands'}
          </h2>
        </div>
        <span className="text-xs text-slate-400">{formatDateRange(startDate, endDate)}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <OverviewKpiCard
          href={`/t/${tenantSlug}/reports/gsc/queries?days=30&brandId=${primaryBrand?.id}`}
          badgeLabel="GSC Clicks"
          badgeClass="text-indigo-700 bg-indigo-50"
          icon={MousePointerClick}
          iconColor="text-indigo-600"
          hoverBorder="hover:border-indigo-300"
          value={gsc?.totalClicks}
          subtext="Organic clicks"
          growthPercent={prev?.clicksGrowthPercent}
        />
        <OverviewKpiCard
          href={`/t/${tenantSlug}/reports/gsc/queries?days=30&brandId=${primaryBrand?.id}&sortBy=impressions`}
          badgeLabel="GSC Impr."
          badgeClass="text-indigo-700 bg-indigo-50"
          icon={Eye}
          iconColor="text-indigo-600"
          hoverBorder="hover:border-indigo-300"
          value={gsc?.totalImpressions}
          subtext="Search appearances"
          growthPercent={prev?.impressionsGrowthPercent}
        />
        <OverviewKpiCard
          href={`/t/${tenantSlug}/reports/gbp/locations?days=30&brandId=${primaryBrand?.id}`}
          badgeLabel="GBP Views"
          badgeClass="text-teal-700 bg-teal-50"
          icon={Globe}
          iconColor="text-teal-600"
          hoverBorder="hover:border-teal-300"
          value={gbp?.totalViews}
          subtext="Search & Maps"
        />
        <OverviewKpiCard
          href={`/t/${tenantSlug}/reports/gbp/locations?days=30&brandId=${primaryBrand?.id}&sortBy=callClicks`}
          badgeLabel="GBP Calls"
          badgeClass="text-blue-700 bg-blue-50"
          icon={PhoneCall}
          iconColor="text-blue-600"
          hoverBorder="hover:border-blue-300"
          value={gbp?.callClicks}
          subtext="Profile call taps"
        />
        <OverviewKpiCard
          href={`/t/${tenantSlug}/reports/gbp/locations?days=30&brandId=${primaryBrand?.id}&sortBy=directionRequests`}
          badgeLabel="GBP Maps"
          badgeClass="text-emerald-700 bg-emerald-50"
          icon={Navigation}
          iconColor="text-emerald-600"
          hoverBorder="hover:border-emerald-300"
          value={gbp?.directionRequests}
          subtext="Direction requests"
        />
      </div>

      {!hasData && <OverviewKpiEmpty tenantSlug={tenantSlug} brandName={primaryBrand?.name} />}
    </section>
  );
}
