'use client';

import * as React from 'react';
import Link from 'next/link';
import { MapPin, Phone, Navigation, Globe, Eye, ArrowRight } from 'lucide-react';
import { MetricCard } from '@/components/analytics/metric-card';
import { MetricCardSkeleton } from '@/components/analytics/analytics-skeletons';
import { AnalyticsComparisonEngine } from '@/shared/analytics/comparison';
import { AnalyticsFormatters } from '@/shared/analytics/formatters';
import type { PerformanceSummaryDto } from '@/modules/reports/reporting-service';

export interface ReportsGbpSectionProps {
  summary?: PerformanceSummaryDto | undefined | null;

  isLoading: boolean;
  tenantSlug: string;
  selectedBrandId: string;
  dateRangeDays: number;
}

export function ReportsGbpSection({
  summary,
  isLoading,
  tenantSlug,
  selectedBrandId,
  dateRangeDays,
}: ReportsGbpSectionProps) {
  const gbp = summary?.gbp;
  const prev = summary?.previousPeriod;

  const views = gbp?.totalViews ?? 0;
  const calls = gbp?.callClicks ?? 0;
  const directions = gbp?.directionRequests ?? 0;
  const websiteClicks = gbp?.websiteClicks ?? 0;

  const gbpStatus = gbp?.status;
  const mappedCount = gbp?.mappedLocationsCount ?? 0;
  const totalCount = gbp?.totalLocationsCount ?? 0;

  // Comparison deltas calculated with safe zero-division guard
  const viewsComp = AnalyticsComparisonEngine.calculateComparison({
    current: views,
    previous: prev?.views,
    comparisonType: 'PREVIOUS_PERIOD',
    higherIsBetter: true,
  });

  const callsComp = AnalyticsComparisonEngine.calculateComparison({
    current: calls,
    previous: prev?.calls,
    comparisonType: 'PREVIOUS_PERIOD',
    higherIsBetter: true,
  });

  const directionsComp = AnalyticsComparisonEngine.calculateComparison({
    current: directions,
    previous: prev?.directions,
    comparisonType: 'PREVIOUS_PERIOD',
    higherIsBetter: true,
  });

  const websiteClicksComp = AnalyticsComparisonEngine.calculateComparison({
    current: websiteClicks,
    previous: prev?.websiteClicks,
    comparisonType: 'PREVIOUS_PERIOD',
    higherIsBetter: true,
  });

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-base font-bold tracking-tight text-slate-900 leading-none">
              Google Business Profile
            </h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Local Presence & Reach
            </span>
            {gbpStatus === 'partial' && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                {mappedCount} of {totalCount} Locations Mapped
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Customer phone calls, driving directions, local profile impressions, and website link clicks.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
          <Link
            href={`/client/${tenantSlug}/reports/gbp/reviews?days=${dateRangeDays}&brandId=${selectedBrandId}`}
            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <span>Customer Reviews</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      {isLoading && !summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Profile Views"
            value={AnalyticsFormatters.compact(views)}
            deltaPercent={viewsComp.deltaPercent}
            deltaText={viewsComp.deltaFormatted}
            comparisonLabel="vs prior period"
            higherIsBetter={true}
            source="GBP"
            tooltip="Number of times your business profiles were viewed on Google Maps and Google Search."
            icon={Eye}
          />

          <MetricCard
            label="Call Actions"
            value={AnalyticsFormatters.number(calls)}
            deltaPercent={callsComp.deltaPercent}
            deltaText={callsComp.deltaFormatted}
            comparisonLabel="vs prior period"
            higherIsBetter={true}
            source="GBP"
            tooltip="Number of times customers tapped the 'Call' action on your Google Business Profile."
            icon={Phone}
          />

          <MetricCard
            label="Directions Requested"
            value={AnalyticsFormatters.number(directions)}
            deltaPercent={directionsComp.deltaPercent}
            deltaText={directionsComp.deltaFormatted}
            comparisonLabel="vs prior period"
            higherIsBetter={true}
            source="GBP"
            tooltip="Number of customers requesting driving directions to your storefront location."
            icon={Navigation}
          />

          <MetricCard
            label="Website Link Clicks"
            value={AnalyticsFormatters.number(websiteClicks)}
            deltaPercent={websiteClicksComp.deltaPercent}
            deltaText={websiteClicksComp.deltaFormatted}
            comparisonLabel="vs prior period"
            higherIsBetter={true}
            source="GBP"
            tooltip="Number of clicks on your business profile's website URL on Google Search and Maps."
            icon={Globe}
          />
        </div>
      )}
    </section>
  );
}
