'use client';

import Link from 'next/link';
import { MousePointerClick, Eye, BarChart2, TrendingUp, Sparkles } from 'lucide-react';
import { MetricCard } from './metric-card';
import { MetricCardSkeleton } from './metric-card-skeleton';
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
      <section aria-label="Loading search metrics" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Google Search Console — Organic Search Performance
            </h2>
          </div>
          <span className="text-xs text-slate-400">Syncing telemetry…</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-300">
          {[1, 2, 3, 4].map((i) => (
            <MetricCardSkeleton key={i} />
          ))}
        </div>
      </section>
    );
  }

  const gsc = summary?.gsc;
  const hasGscData = Boolean(gsc && (gsc.totalClicks > 0 || gsc.totalImpressions > 0));
  const comparisonLabel = `vs prior ${dateRangeDays}d`;

  return (
    <section aria-label="Google Search Console metrics" className="space-y-4 animate-in fade-in duration-300">
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
          deltaPercent={summary?.previousPeriod?.clicksGrowthPercent ?? null}
          higherIsBetter={true}
          comparisonLabel={comparisonLabel}
          icon={MousePointerClick}
          href={`/t/${tenantSlug}/reports/gsc/queries?days=${dateRangeDays}&brandId=${selectedBrandId}`}
        />
        <MetricCard
          label="Search Impressions"
          value={formatNumber(gsc?.totalImpressions)}
          source="GSC"
          deltaPercent={summary?.previousPeriod?.impressionsGrowthPercent ?? null}
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

      {!hasGscData && (
        <div className="p-3.5 bg-indigo-50/50 border border-indigo-200/80 rounded-xl flex items-center justify-between gap-3 text-xs text-indigo-900">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600 flex-shrink-0" />
            <span>No Search Console data synced for this brand. Map your Search Console property in Integrations.</span>
          </div>
          <Link href={`/t/${tenantSlug}/integrations`} className="font-semibold underline hover:text-indigo-950 flex-shrink-0">
            Configure GSC
          </Link>
        </div>
      )}
    </section>
  );
}
