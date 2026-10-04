'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Clock, MousePointerClick, BarChart2, Percent, Target } from 'lucide-react';
import { MetricCard } from '@/components/analytics/metric-card';
import { MetricCardSkeleton } from '@/components/analytics/analytics-skeletons';
import { AnalyticsComparisonEngine } from '@/shared/analytics/comparison';
import { AnalyticsFormatters } from '@/shared/analytics/formatters';
import type { PerformanceSummaryDto } from '@/modules/reports/reporting-service';

export interface ReportsGscSectionProps {
  summary?: PerformanceSummaryDto | undefined | null;

  isLoading: boolean;
  tenantSlug: string;
  selectedBrandId: string;
  dateRangeDays: number;
  startDate: string;
  endDate: string;
  activeMetrics?: string[];
  onToggleMetric?: (metric: string) => void;
}

export function ReportsGscSection({
  summary,
  isLoading,
  tenantSlug,
  selectedBrandId,
  dateRangeDays,
  activeMetrics = ['clicks', 'impressions', 'ctr', 'position'],
  onToggleMetric,
}: ReportsGscSectionProps) {
  const gsc = summary?.gsc;
  const prev = summary?.previousPeriod;
  const hasGscData = Boolean(gsc && (gsc.totalClicks > 0 || gsc.totalImpressions > 0));

  const clicks = gsc?.totalClicks ?? 0;
  const impressions = gsc?.totalImpressions ?? 0;
  const ctr = gsc?.ctr ? Number((gsc.ctr * 100).toFixed(1)) : 0;
  const position = gsc?.averagePosition ? Number(gsc.averagePosition.toFixed(1)) : 0;

  // Comparison deltas calculated with safe zero-division guard
  const clicksComp = AnalyticsComparisonEngine.calculateComparison({
    current: clicks,
    previous: prev?.clicks,
    comparisonType: 'PREVIOUS_PERIOD',
    higherIsBetter: true,
  });

  const impressionsComp = AnalyticsComparisonEngine.calculateComparison({
    current: impressions,
    previous: prev?.impressions,
    comparisonType: 'PREVIOUS_PERIOD',
    higherIsBetter: true,
  });

  const ctrComp = AnalyticsComparisonEngine.calculateComparison({
    current: ctr,
    previous: prev?.ctr ? prev.ctr * 100 : undefined,
    comparisonType: 'PREVIOUS_PERIOD',
    higherIsBetter: true,
  });

  const positionComp = AnalyticsComparisonEngine.calculateComparison({
    current: position,
    previous: prev?.position,
    comparisonType: 'PREVIOUS_PERIOD',
    higherIsBetter: false, // lower rank is better
  });

  const lagDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 3);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  })();

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-base font-bold tracking-tight text-slate-900 leading-none">
              Google Search Console
            </h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Organic Search Intelligence
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Organic keyword impressions, search clicks, click-through rate, and average rank on Google.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-[11px] font-medium text-amber-800"
            title={`Google Search Console operates with an unavoidable 48 to 72 hour processing delay. Google's newest search data is through ${lagDate}.`}
          >
            <Clock className="w-3 h-3 text-amber-600 shrink-0" />
            <span>Google Data: Through {lagDate} (48h processing lag)</span>
          </div>

          <Link
            href={`/client/${tenantSlug}/reports/gsc/queries?days=${dateRangeDays}&brandId=${selectedBrandId}`}
            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <span>View All Queries</span>
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
          <div
            onClick={onToggleMetric ? () => onToggleMetric('clicks') : undefined}
            className={onToggleMetric ? 'cursor-pointer' : undefined}
          >
            <MetricCard
              label="Organic Clicks"
              value={AnalyticsFormatters.number(clicks)}
              deltaPercent={clicksComp.deltaPercent}
              deltaText={clicksComp.deltaFormatted}
              comparisonLabel="vs prior period"
              higherIsBetter={true}
              source="GSC"
              tooltip="Total clicks on website links appearing in Google Search results."
              icon={MousePointerClick}
              className={activeMetrics.includes('clicks') ? 'ring-2 ring-indigo-500 shadow-sm' : ''}
            />
          </div>

          <div
            onClick={onToggleMetric ? () => onToggleMetric('impressions') : undefined}
            className={onToggleMetric ? 'cursor-pointer' : undefined}
          >
            <MetricCard
              label="Search Impressions"
              value={AnalyticsFormatters.compact(impressions)}
              deltaPercent={impressionsComp.deltaPercent}
              deltaText={impressionsComp.deltaFormatted}
              comparisonLabel="vs prior period"
              higherIsBetter={true}
              source="GSC"
              tooltip="Number of times any URL from your website appeared in Google Search results."
              icon={BarChart2}
              className={activeMetrics.includes('impressions') ? 'ring-2 ring-indigo-500 shadow-sm' : ''}
            />
          </div>

          <div
            onClick={onToggleMetric ? () => onToggleMetric('ctr') : undefined}
            className={onToggleMetric ? 'cursor-pointer' : undefined}
          >
            <MetricCard
              label="Click-Through Rate"
              value={`${ctr}%`}
              deltaPercent={ctrComp.deltaPercent}
              deltaText={ctrComp.deltaFormatted}
              comparisonLabel="vs prior period"
              higherIsBetter={true}
              source="GSC"
              tooltip="Percentage of organic impressions that resulted in a click (Clicks / Impressions)."
              icon={Percent}
              className={activeMetrics.includes('ctr') ? 'ring-2 ring-indigo-500 shadow-sm' : ''}
            />
          </div>

          <div
            onClick={onToggleMetric ? () => onToggleMetric('position') : undefined}
            className={onToggleMetric ? 'cursor-pointer' : undefined}
          >
            <MetricCard
              label="Average Position"
              value={position > 0 ? position.toFixed(1) : '—'}
              deltaPercent={positionComp.deltaPercent}
              deltaText={positionComp.deltaFormatted}
              comparisonLabel="vs prior period"
              higherIsBetter={false}
              source="GSC"
              tooltip="Average Google Search ranking position for queries where your site appeared (lower number indicates higher rank)."
              icon={Target}
              className={activeMetrics.includes('position') ? 'ring-2 ring-indigo-500 shadow-sm' : ''}
            />
          </div>
        </div>
      )}
    </section>
  );
}
