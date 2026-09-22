'use client';

import Link from 'next/link';
import { BarChart3, Plug, ArrowRight } from 'lucide-react';
import { DashboardSection } from './dashboard-section';
import { DashboardMetricCard } from './dashboard-metric-card';
import { LocationPerformanceMap } from './location-performance-map';
import { LocationRankingsTable } from './location-rankings-table';
import type { OverviewDataDto } from '@/modules/overview/overview-service';

interface WebAnalyticsSectionProps {
  tenantSlug: string;
  data?: OverviewDataDto['web'] | undefined;
  isConnected?: boolean;
}

export function WebAnalyticsSection({ tenantSlug, data, isConnected = false }: WebAnalyticsSectionProps) {
  const hasData = Boolean(data?.hasData);
  const webCards = [
    {
      key: 'users',
      label: 'Users',
      value: data ? data.users : 0,
      delta: hasData ? data?.usersDelta : undefined,
      icon: 'users',
      color: 'blue' as const,
      sparkColor: '#3B82F6',
      seed: 1,
    },
    {
      key: 'sessions',
      label: 'Sessions',
      value: data ? data.sessions : 0,
      delta: hasData ? data?.sessionsDelta : undefined,
      icon: 'mouse-pointer-click',
      color: 'purple' as const,
      sparkColor: '#8B5CF6',
      seed: 2,
    },
    {
      key: 'engaged',
      label: 'Engaged Sessions',
      value: data ? data.engagedSessions : 0,
      delta: hasData ? data?.engagedSessionsDelta : undefined,
      icon: 'activity',
      color: 'cyan' as const,
      sparkColor: '#14B8A6',
      seed: 3,
    },
    {
      key: 'conv-rate',
      label: 'Conversion Rate',
      value: data ? data.conversionRate : 0,
      delta: hasData ? data?.conversionRateDelta : undefined,
      suffix: '%',
      icon: 'target',
      color: 'blue' as const,
      sparkColor: '#3B82F6',
      seed: 4,
    },
    {
      key: 'conversions',
      label: 'Website Conversions',
      value: data ? data.conversions : 0,
      delta: hasData ? data?.conversionsDelta : undefined,
      icon: 'flag',
      color: 'purple' as const,
      sparkColor: '#8B5CF6',
      seed: 5,
    },
  ];

  return (
    <DashboardSection
      icon={
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600 shadow-xs">
          <BarChart3 className="w-4 h-4" />
        </div>
      }
      title="Web Analytics"
      badge="✓ From Visitors to Customers"
      badgeColor="bg-sky-100/80 text-sky-800"
      subtitle="Understand how visitors use your website and convert to customers"
      bgClass="bg-[#F0F7FD]"
      borderClass="border-[#D2E7F9]"
      reportHref={`/client/${tenantSlug}/reports/ga4`}
      reportLabel="View Analytics Report"
    >
      {!isConnected ? (
        <div className="bg-white/60 border border-dashed border-sky-300 rounded-xl p-6 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 mb-3 shadow-sm">
            <Plug className="w-6 h-6" />
          </div>
          <h3 className="text-[14px] font-bold text-slate-900 mb-1">
            Connect Web Analytics
          </h3>
          <p className="text-[12px] text-slate-500 max-w-md mb-4">
            Link your Google account to track website visitors, session engagement, and conversion metrics across all your locations.
          </p>
          <Link
            href={`/client/${tenantSlug}/integrations`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-[12px] font-semibold shadow-sm transition-colors"
          >
            <span>Connect Account</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <>
          {/* Top Row: 5 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-3">
            {webCards.map((card) => (
              <DashboardMetricCard
                key={card.key}
                label={card.label}
                value={card.value}
                delta={card.delta}
                icon={card.icon}
                color={card.color}
                sparkColor={card.sparkColor}
                suffix={card.suffix}
                seed={card.seed}
              />
            ))}
          </div>

          {/* Bottom Row: Location Map (7 cols) + Location Rankings (5 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-stretch">
            <div className="lg:col-span-7 flex flex-col">
              <LocationPerformanceMap locations={data?.locations} />
            </div>
            <div className="lg:col-span-5 flex flex-col">
              <LocationRankingsTable rankings={data?.rankings} />
            </div>
          </div>
        </>
      )}
    </DashboardSection>
  );
}
