import Link from 'next/link';
import { MousePointerClick, Eye, Globe, PhoneCall, Navigation } from 'lucide-react';
import { formatNumber, formatDateRange } from '@/shared/lib/formatters';

interface OverviewKpiGridProps {
  tenantSlug: string;
  primaryBrand: { id: string; name: string } | null;
  performanceSummary: any;
  startDate: string;
  endDate: string;
}

export function OverviewKpiGrid({
  tenantSlug,
  primaryBrand,
  performanceSummary,
  startDate,
  endDate,
}: OverviewKpiGridProps) {
  if (!performanceSummary) return null;

  const { gsc, gbp, previousPeriod } = performanceSummary;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-indigo-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            30-Day Executive Performance — {primaryBrand?.name}
          </h2>
        </div>
        <span className="text-xs text-slate-400">{formatDateRange(startDate, endDate)}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <Link
          href={`/t/${tenantSlug}/reports/gsc/queries?days=30&brandId=${primaryBrand?.id}`}
          className="p-4 bg-white border border-slate-200/90 rounded-xl shadow-2xs hover:border-indigo-300 transition-all group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">GSC Clicks</span>
            <MousePointerClick className="h-3.5 w-3.5 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">{formatNumber(gsc.totalClicks)}</p>
          <span className="text-[11px] text-emerald-700 font-semibold mt-1 inline-block">
            +{previousPeriod.clicksGrowthPercent}% vs prior
          </span>
        </Link>

        <Link
          href={`/t/${tenantSlug}/reports/gsc/queries?days=30&brandId=${primaryBrand?.id}&sortBy=impressions`}
          className="p-4 bg-white border border-slate-200/90 rounded-xl shadow-2xs hover:border-indigo-300 transition-all group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">GSC Impr.</span>
            <Eye className="h-3.5 w-3.5 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">{formatNumber(gsc.totalImpressions)}</p>
          <span className="text-[11px] text-emerald-700 font-semibold mt-1 inline-block">
            +{previousPeriod.impressionsGrowthPercent}% vs prior
          </span>
        </Link>

        <Link
          href={`/t/${tenantSlug}/reports/gbp/locations?days=30&brandId=${primaryBrand?.id}`}
          className="p-4 bg-white border border-slate-200/90 rounded-xl shadow-2xs hover:border-teal-300 transition-all group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">GBP Views</span>
            <Globe className="h-3.5 w-3.5 text-teal-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">{formatNumber(gbp.totalViews)}</p>
          <span className="text-[11px] text-slate-400 mt-1 inline-block">Search & Maps</span>
        </Link>

        <Link
          href={`/t/${tenantSlug}/reports/gbp/locations?days=30&brandId=${primaryBrand?.id}&sortBy=callClicks`}
          className="p-4 bg-white border border-slate-200/90 rounded-xl shadow-2xs hover:border-blue-300 transition-all group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">GBP Calls</span>
            <PhoneCall className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">{formatNumber(gbp.callClicks)}</p>
          <span className="text-[11px] text-slate-400 mt-1 inline-block">Profile call taps</span>
        </Link>

        <Link
          href={`/t/${tenantSlug}/reports/gbp/locations?days=30&brandId=${primaryBrand?.id}&sortBy=directionRequests`}
          className="p-4 bg-white border border-slate-200/90 rounded-xl shadow-2xs hover:border-emerald-300 transition-all group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">GBP Maps</span>
            <Navigation className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">{formatNumber(gbp.directionRequests)}</p>
          <span className="text-[11px] text-slate-400 mt-1 inline-block">Direction requests</span>
        </Link>
      </div>
    </section>
  );
}
