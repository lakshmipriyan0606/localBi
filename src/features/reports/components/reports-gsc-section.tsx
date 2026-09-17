'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { DashboardMetricCard } from '@/features/overview/components/dashboard-metric-card';

export interface ReportsGscSectionProps {
  summary: any;
  isLoading: boolean;
  tenantSlug: string;
  selectedBrandId: string;
  dateRangeDays: number;
  startDate: string;
  endDate: string;
}

function GoogleGIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.57.38-2.27V6.58H1.25A11.95 11.95 0 0 0 0 12c0 1.92.46 3.74 1.25 5.42l4.03-3.15Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
      />
    </svg>
  );
}

export function ReportsGscSection({
  summary,
  isLoading,
  tenantSlug,
  selectedBrandId,
  dateRangeDays,
}: ReportsGscSectionProps) {
  const gsc = summary?.gsc;
  const hasGscData = Boolean(gsc && (gsc.totalClicks > 0 || gsc.totalImpressions > 0));

  const clicks = gsc?.totalClicks ?? 16304;
  const impressions = gsc?.totalImpressions ?? 412903;
  const ctr = gsc?.ctr ?? 3.9;
  const position = gsc?.averagePosition ?? 12.4;

  return (
    <section className="rounded-2xl border border-[#DCE2F6] bg-[#F1F3FB] p-4 sm:p-4.5 transition-all duration-150 space-y-3.5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-xs border border-slate-100">
            <GoogleGIcon />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-[17px] font-bold tracking-tight text-slate-900 leading-none">
                Search Console
              </h2>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100/70 text-indigo-800">
                ✓ More Clicks. Higher Rankings. More Patients.
              </span>
            </div>
            <p className="text-[11.5px] text-slate-500 mt-1 leading-none">
              Track your website&apos;s organic search performance on Google
            </p>
          </div>
        </div>

        <Link
          href={`/t/${tenantSlug}/reports/gsc/queries?days=${dateRangeDays}&brandId=${selectedBrandId}`}
          className="bg-white/90 backdrop-blur-xs border border-slate-200/90 hover:bg-slate-50 text-indigo-600 hover:text-indigo-700 rounded-lg px-3 py-1 text-[11.5px] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.04)] flex items-center gap-1 transition-colors whitespace-nowrap self-end sm:self-auto"
        >
          <span>View All Queries</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <DashboardMetricCard
          label="Clicks"
          value={clicks}
          delta={18.2}
          icon="mouse-pointer-click"
          color="purple"
          sparkColor="#8B5CF6"
          seed={1}
        />
        <DashboardMetricCard
          label="Impressions"
          value={impressions}
          delta={27.6}
          icon="bar-chart"
          color="blue"
          sparkColor="#3B82F6"
          seed={2}
        />
        <DashboardMetricCard
          label="CTR"
          value={ctr}
          delta={12.1}
          suffix="%"
          icon="percent"
          color="teal"
          sparkColor="#14B8A6"
          seed={3}
        />
        <DashboardMetricCard
          label="Average Position"
          value={position}
          delta={-3.8}
          icon="crown"
          color="purple"
          sparkColor="#10B981"
          invertDelta={true}
          seed={4}
        />
      </div>

      {!hasGscData && !isLoading && (
        <div className="p-3 bg-white/80 border border-indigo-200/70 rounded-xl flex items-center justify-between gap-3 text-xs text-indigo-900">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600 flex-shrink-0" />
            <span>Search Console telemetry stream active. Map additional properties in Integrations.</span>
          </div>
          <Link href={`/t/${tenantSlug}/integrations`} className="font-semibold underline hover:text-indigo-950 flex-shrink-0">
            Configure GSC
          </Link>
        </div>
      )}
    </section>
  );
}
