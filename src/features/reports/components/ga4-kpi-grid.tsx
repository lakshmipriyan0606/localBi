'use client';

import { BarChart3 } from 'lucide-react';
import { DashboardMetricCard } from '@/features/overview/components/dashboard-metric-card';

export function Ga4KpiGrid() {
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
              ✓ From Visitors to Patients
            </span>
          </div>
          <p className="text-[11.5px] text-slate-500 mt-1 leading-none">
            Understand how visitors use your website and convert to patients
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        <DashboardMetricCard
          label="Users"
          value={12842}
          delta={22.6}
          icon="users"
          color="blue"
          sparkColor="#3B82F6"
          seed={1}
        />
        <DashboardMetricCard
          label="Sessions"
          value={18421}
          delta={18.9}
          icon="mouse-pointer-click"
          color="purple"
          sparkColor="#8B5CF6"
          seed={2}
        />
        <DashboardMetricCard
          label="Engaged Sessions"
          value={9538}
          delta={27.3}
          icon="activity"
          color="cyan"
          sparkColor="#14B8A6"
          seed={3}
        />
        <DashboardMetricCard
          label="Conversion Rate"
          value={4.8}
          delta={34.1}
          suffix="%"
          icon="target"
          color="blue"
          sparkColor="#3B82F6"
          seed={4}
        />
        <DashboardMetricCard
          label="Website Conversions"
          value={885}
          delta={28.6}
          icon="flag"
          color="purple"
          sparkColor="#8B5CF6"
          seed={5}
        />
      </div>
    </section>
  );
}
