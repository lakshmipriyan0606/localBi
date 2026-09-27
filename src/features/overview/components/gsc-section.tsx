'use client';

import Link from 'next/link';
import { Plug, ArrowRight } from 'lucide-react';
import { DashboardSection } from './dashboard-section';
import { DashboardMetricCard } from './dashboard-metric-card';
import { GscPerformanceChart } from './gsc-performance-chart';
import { GscSearchQueriesTable } from './gsc-search-queries-table';
import type { OverviewDataDto } from '@/modules/overview/overview-service';

interface GscSectionProps {
  tenantSlug: string;
  data?: OverviewDataDto['gsc'] | undefined;
  isConnected?: boolean;
}

function GoogleGIcon() {
  return (
    <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24">
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

export function GscSection({ tenantSlug, data, isConnected = false }: GscSectionProps) {
  const hasData = Boolean(data?.hasData);
  const gscCards = [
    {
      key: 'clicks',
      label: 'Clicks',
      value: data ? data.clicks : 0,
      delta: hasData ? data?.clicksDelta : undefined,
      icon: 'mouse-pointer-click',
      color: 'purple' as const,
      sparkColor: '#8B5CF6',
      seed: 1,
    },
    {
      key: 'impressions',
      label: 'Impressions',
      value: data ? data.impressions : 0,
      delta: hasData ? data?.impressionsDelta : undefined,
      icon: 'bar-chart',
      color: 'blue' as const,
      sparkColor: '#3B82F6',
      seed: 2,
    },
    {
      key: 'ctr',
      label: 'CTR',
      value: data ? data.ctr : 0,
      delta: hasData ? data?.ctrDelta : undefined,
      suffix: '%',
      icon: 'percent',
      color: 'teal' as const,
      sparkColor: '#14B8A6',
      seed: 3,
    },
    {
      key: 'position',
      label: 'Average Position',
      value: data ? data.position : 0,
      delta: hasData ? data?.positionDelta : undefined,
      icon: 'crown',
      color: 'purple' as const,
      sparkColor: '#10B981',
      invertDelta: true,
      seed: 4,
    },
  ];

  return (
    <DashboardSection
      icon={
        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-xs border border-slate-100">
          <GoogleGIcon />
        </div>
      }
      title="Search Console"
      badge="✓ More Clicks. Higher Rankings."
      badgeColor="bg-indigo-100/70 text-indigo-800"
      subtitle="Track your website's search performance on Google · Google updates with a standard 48h latency (latest data: Sep 24)"
      bgClass="bg-[#F1F3FB]"
      borderClass="border-[#DCE2F6]"
      reportHref={`/client/${tenantSlug}/reports?tab=gsc`}
      reportLabel="View Search Console Report"
    >
      {!isConnected ? (
        <div className="bg-white/60 border border-dashed border-indigo-300 rounded-xl p-6 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mb-3 shadow-sm">
            <Plug className="w-6 h-6" />
          </div>
          <h3 className="text-[14px] font-bold text-slate-900 mb-1">
            Connect Google Search Console
          </h3>
          <p className="text-[12px] text-slate-500 max-w-md mb-4">
            Link your Google account to automatically track your website's search performance, monitor keyword rankings, and uncover new SEO opportunities.
          </p>
          <Link
            href={`/client/${tenantSlug}/integrations`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[12px] font-semibold shadow-sm transition-colors"
          >
            <span>Connect Account</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <>
          {/* Top Row: 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mb-3">
            {gscCards.map((card) => (
              <DashboardMetricCard
                key={card.key}
                label={card.label}
                value={card.value}
                delta={card.delta}
                icon={card.icon}
                color={card.color}
                sparkColor={card.sparkColor}
                suffix={card.suffix}
                invertDelta={card.invertDelta}
                seed={card.seed}
              />
            ))}
          </div>

          {/* Analytics Row: Search Trend + Top Queries */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-stretch">
            <div className="lg:col-span-7 flex flex-col">
              <GscPerformanceChart trendData={data?.trendData} />
            </div>
            <div className="lg:col-span-5 flex flex-col">
              <GscSearchQueriesTable tenantSlug={tenantSlug} queries={data?.queries} />
            </div>
          </div>
        </>
      )}
    </DashboardSection>
  );
}
