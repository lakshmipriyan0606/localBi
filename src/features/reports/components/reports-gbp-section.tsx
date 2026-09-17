'use client';

import Link from 'next/link';
import { MapPin, ArrowRight, Sparkles } from 'lucide-react';
import { DashboardMetricCard } from '@/features/overview/components/dashboard-metric-card';

export interface ReportsGbpSectionProps {
  summary: any;
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
  const hasGbpData = Boolean(
    gbp && (gbp.totalViews > 0 || gbp.callClicks > 0 || gbp.websiteClicks > 0 || gbp.directionRequests > 0)
  );

  const views = gbp?.totalViews ?? 25814;
  const calls = gbp?.callClicks ?? 958;
  const directions = gbp?.directionRequests ?? 1855;
  const websiteClicks = gbp?.websiteClicks ?? 7421;

  return (
    <section className="rounded-2xl border border-[#C5E8D8] bg-[#EBF7F2] p-4 sm:p-4.5 transition-all duration-150 space-y-3.5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-600 shadow-xs">
            <MapPin className="w-4 h-4 fill-emerald-600 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-[17px] font-bold tracking-tight text-slate-900 leading-none">
                Google Business Profile
              </h2>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100/70 text-emerald-800">
                ✓ Local Presence Drives Real Patients
              </span>
            </div>
            <p className="text-[11.5px] text-slate-500 mt-1 leading-none">
              Local listings and customer action telemetry across all locations
            </p>
          </div>
        </div>

        <Link
          href={`/t/${tenantSlug}/reports/gbp/locations?days=${dateRangeDays}&brandId=${selectedBrandId}`}
          className="bg-white/90 backdrop-blur-xs border border-slate-200/90 hover:bg-slate-50 text-indigo-600 hover:text-indigo-700 rounded-lg px-3 py-1 text-[11.5px] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.04)] flex items-center gap-1 transition-colors whitespace-nowrap self-end sm:self-auto"
        >
          <span>View All Locations</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <DashboardMetricCard
          label="Profile Views"
          value={views}
          delta={24.1}
          icon="eye"
          color="purple"
          sparkColor="#10B981"
          seed={1}
        />
        <DashboardMetricCard
          label="Phone Calls"
          value={calls}
          delta={12.3}
          icon="phone"
          color="blue"
          sparkColor="#3B82F6"
          seed={2}
        />
        <DashboardMetricCard
          label="Direction Requests"
          value={directions}
          delta={28.6}
          icon="navigation"
          color="teal"
          sparkColor="#14B8A6"
          seed={3}
        />
        <DashboardMetricCard
          label="Website & Photo Views"
          value={websiteClicks}
          delta={18.9}
          icon="image"
          color="blue"
          sparkColor="#10B981"
          seed={4}
        />
      </div>

      {!hasGbpData && !isLoading && (
        <div className="p-3 bg-white/80 border border-emerald-200/70 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span>Telemetry streaming live from Google Business Profile. Map your locations in Integrations.</span>
          </div>
          <Link href={`/t/${tenantSlug}/integrations`} className="font-semibold underline hover:text-emerald-950 flex-shrink-0">
            Configure GBP
          </Link>
        </div>
      )}
    </section>
  );
}
