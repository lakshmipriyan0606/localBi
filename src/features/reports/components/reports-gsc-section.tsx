'use client';

import { MousePointerClick, Eye, BarChart2, TrendingUp } from 'lucide-react';
import { MetricCard } from './metric-card';
import { AnalyticsLoader } from '@/components/ui/analytics-loader';
import { formatNumber, formatPercent, formatPosition, formatDateRange } from '@/shared/lib/formatters';

export interface ReportsGscSectionProps {
  summary: any;
  isLoading: boolean;
  tenantSlug: string;
  selectedBrandId: string;
  dateRangeDays: number;
  startDate: string;
  endDate: string;
}

export function ReportsGscSection({
  summary,
  isLoading,
  tenantSlug,
  selectedBrandId,
  dateRangeDays,
  startDate,
  endDate,
}: ReportsGscSectionProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <AnalyticsLoader key={i} variant="card" />
        ))}
      </div>
    );
  }

  const gsc = summary?.gsc;
  const comparisonLabel = `vs prior ${dateRangeDays}d`;

  return (
    <section aria-label="Google Search Console metrics" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-indigo-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Google Search Console — Organic Search Performance
          </h2>
        </div>
        <span className="text-xs text-slate-400">{formatDateRange(startDate, endDate)}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Search Clicks"
          value={formatNumber(gsc?.totalClicks)}
          source="GSC"
          deltaPercent={summary?.previousPeriod.clicksGrowthPercent ?? null}
          higherIsBetter={true}
          comparisonLabel={comparisonLabel}
          icon={MousePointerClick}
          href={`/t/${tenantSlug}/reports/gsc/queries?days=${dateRangeDays}&brandId=${selectedBrandId}`}
        />
        <MetricCard
          label="Search Impressions"
          value={formatNumber(gsc?.totalImpressions)}
          source="GSC"
          deltaPercent={summary?.previousPeriod.impressionsGrowthPercent ?? null}
          higherIsBetter={true}
          comparisonLabel={comparisonLabel}
          icon={Eye}
          href={`/t/${tenantSlug}/reports/gsc/queries?days=${dateRangeDays}&brandId=${selectedBrandId}&sortBy=impressions`}
        />
        <MetricCard
          label="Click-Through Rate"
          value={formatPercent(gsc?.ctr)}
          source="GSC"
          subtext="Calculated as total clicks / impressions"
          icon={BarChart2}
          href={`/t/${tenantSlug}/reports/gsc/queries?days=${dateRangeDays}&brandId=${selectedBrandId}&sortBy=ctr`}
        />
        <MetricCard
          label="Average Position"
          value={formatPosition(gsc?.averagePosition)}
          source="GSC"
          subtext="Impression-weighted average rank (lower is better)"
          higherIsBetter={false}
          icon={TrendingUp}
          href={`/t/${tenantSlug}/reports/gsc/queries?days=${dateRangeDays}&brandId=${selectedBrandId}&sortBy=position&sortOrder=asc`}
        />
      </div>
    </section>
  );
}
