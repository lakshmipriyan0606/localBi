'use client';

import { BarChart3 } from 'lucide-react';
import { DashboardSection } from './dashboard-section';
import { DashboardMetricCard } from './dashboard-metric-card';
import { LocationPerformanceMap } from './location-performance-map';
import { LocationRankingsTable } from './location-rankings-table';
import { WebInsightsRecommendations } from './web-insights-recommendations';

interface WebAnalyticsSectionProps {
  tenantSlug: string;
}

const WEB_CARDS = [
  {
    key: 'users',
    label: 'Users',
    value: 12842,
    delta: 22.6,
    icon: 'users',
    color: 'blue',
    sparkColor: '#3B82F6',
    seed: 1,
  },
  {
    key: 'sessions',
    label: 'Sessions',
    value: 18421,
    delta: 18.9,
    icon: 'mouse-pointer-click',
    color: 'purple',
    sparkColor: '#8B5CF6',
    seed: 2,
  },
  {
    key: 'engaged',
    label: 'Engaged Sessions',
    value: 9538,
    delta: 27.3,
    icon: 'activity',
    color: 'cyan',
    sparkColor: '#14B8A6',
    seed: 3,
  },
  {
    key: 'conv-rate',
    label: 'Conversion Rate',
    value: 4.8,
    delta: 34.1,
    suffix: '%',
    icon: 'target',
    color: 'blue',
    sparkColor: '#3B82F6',
    seed: 4,
  },
  {
    key: 'conversions',
    label: 'Website Conversions',
    value: 885,
    delta: 28.6,
    icon: 'flag',
    color: 'purple',
    sparkColor: '#8B5CF6',
    seed: 5,
  },
];

export function WebAnalyticsSection({ tenantSlug }: WebAnalyticsSectionProps) {
  return (
    <DashboardSection
      icon={
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600 shadow-xs">
          <BarChart3 className="w-4 h-4" />
        </div>
      }
      title="Web Analytics"
      badge="✓ From Visitors to Patients"
      badgeColor="bg-sky-100/80 text-sky-800"
      subtitle="Understand how visitors use your website and convert to patients"
      bgClass="bg-[#F0F7FD]"
      borderClass="border-[#D2E7F9]"
      reportHref={`/t/${tenantSlug}/reports/ga4`}
      reportLabel="View Analytics Report"
    >
      {/* Top Row: 5 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-3">
        {WEB_CARDS.map((card) => (
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

      {/* Bottom Row: Location Map + Location Rankings + Insights & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-stretch">
        <div className="lg:col-span-6 flex flex-col">
          <LocationPerformanceMap />
        </div>
        <div className="lg:col-span-3.5 lg:col-span-3 flex flex-col">
          <LocationRankingsTable />
        </div>
        <div className="lg:col-span-2.5 lg:col-span-3 flex flex-col">
          <WebInsightsRecommendations />
        </div>
      </div>
    </DashboardSection>
  );
}
