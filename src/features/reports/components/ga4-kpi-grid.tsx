'use client';

import { BarChart3 } from 'lucide-react';
import { DashboardMetricCard } from '@/features/overview/components/dashboard-metric-card';

export interface Ga4KpiGridProps {
  users?: number;
  usersDelta?: number;
  sessions?: number;
  sessionsDelta?: number;
  engagedSessions?: number;
  engagedSessionsDelta?: number;
  conversionRate?: number;
  conversionRateDelta?: number;
  conversions?: number;
  conversionsDelta?: number;
  brandName?: string;
  hasRealData?: boolean;
}

export function Ga4KpiGrid({
  users = 0,
  usersDelta = 0,
  sessions = 0,
  sessionsDelta = 0,
  engagedSessions = 0,
  engagedSessionsDelta = 0,
  conversionRate = 0,
  conversionRateDelta = 0,
  conversions = 0,
  conversionsDelta = 0,
  brandName,
  hasRealData = false,
}: Ga4KpiGridProps) {
  const customerLabel = hasRealData
    ? `Live Telemetry: ${brandName || 'Brand'}`
    : brandName
    ? `Visitors to ${brandName} Customers`
    : 'From Visitors to Customers';

  return (
    <section className="rounded-2xl border border-[#D2E7F9] bg-[#F0F7FD] p-4 sm:p-4.5 transition-all duration-150 space-y-3.5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600 shadow-xs">
          <BarChart3 className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-[17px] font-bold tracking-tight text-slate-900 leading-none">
              Web Analytics Telemetry
            </h2>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-sky-100/80 text-sky-800">
              ✓ {customerLabel}
            </span>
          </div>
          <p className="text-[11.5px] text-slate-500 mt-1 leading-none">
            Understand how visitors find and interact with your brand online
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        <DashboardMetricCard
          label="Users"
          value={users}
          delta={usersDelta}
          icon="users"
          color="blue"
          sparkColor="#3B82F6"
          seed={1}
        />
        <DashboardMetricCard
          label="Sessions"
          value={sessions}
          delta={sessionsDelta}
          icon="mouse-pointer-click"
          color="purple"
          sparkColor="#8B5CF6"
          seed={2}
        />
        <DashboardMetricCard
          label="Engaged Sessions"
          value={engagedSessions}
          delta={engagedSessionsDelta}
          icon="activity"
          color="cyan"
          sparkColor="#14B8A6"
          seed={3}
        />
        <DashboardMetricCard
          label="Conversion Rate"
          value={conversionRate}
          delta={conversionRateDelta}
          suffix="%"
          icon="target"
          color="blue"
          sparkColor="#3B82F6"
          seed={4}
        />
        <DashboardMetricCard
          label="Website Conversions"
          value={conversions}
          delta={conversionsDelta}
          icon="flag"
          color="purple"
          sparkColor="#8B5CF6"
          seed={5}
        />
      </div>
    </section>
  );
}
