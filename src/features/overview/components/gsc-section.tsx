'use client';

import { DashboardSection } from './dashboard-section';
import { DashboardMetricCard } from './dashboard-metric-card';
import { GscAchievementCard } from './gsc-achievement-card';
import { GscPerformanceChart } from './gsc-performance-chart';
import { GscSearchQueriesTable } from './gsc-search-queries-table';
import { GscKeywordOpportunities } from './gsc-keyword-opportunities';

interface GscSectionProps {
  tenantSlug: string;
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

const GSC_CARDS = [
  {
    key: 'clicks',
    label: 'Clicks',
    value: 16304,
    delta: 18.2,
    icon: 'mouse-pointer-click',
    color: 'purple',
    sparkColor: '#8B5CF6',
    seed: 1,
  },
  {
    key: 'impressions',
    label: 'Impressions',
    value: 412903,
    delta: 27.6,
    icon: 'bar-chart',
    color: 'blue',
    sparkColor: '#3B82F6',
    seed: 2,
  },
  {
    key: 'ctr',
    label: 'CTR',
    value: 3.9,
    delta: 12.1,
    suffix: '%',
    icon: 'percent',
    color: 'teal',
    sparkColor: '#14B8A6',
    seed: 3,
  },
  {
    key: 'position',
    label: 'Average Position',
    value: 12.4,
    delta: -3.8,
    icon: 'crown',
    color: 'purple',
    sparkColor: '#10B981', // green sparkline for position improvements
    invertDelta: true,
    seed: 4,
  },
];

export function GscSection({ tenantSlug }: GscSectionProps) {
  return (
    <DashboardSection
      icon={
        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-xs border border-slate-100">
          <GoogleGIcon />
        </div>
      }
      title="Search Console"
      badge="✓ More Clicks. Higher Rankings. More Patients."
      badgeColor="bg-indigo-100/70 text-indigo-800"
      subtitle="Track your website's search performance on Google"
      bgClass="bg-[#F1F3FB]"
      borderClass="border-[#DCE2F6]"
      reportHref={`/t/${tenantSlug}/reports?tab=gsc`}
      reportLabel="View Search Console Report"
    >
      {/* Top Row: 4 KPI Cards + 1 Achievement Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-3">
        {GSC_CARDS.map((card) => (
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
        <GscAchievementCard tenantSlug={tenantSlug} />
      </div>

      {/* Analytics Row: Search Trend + Top Queries + Keyword Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-stretch">
        <div className="lg:col-span-6 flex flex-col">
          <GscPerformanceChart />
        </div>
        <div className="lg:col-span-3.5 lg:col-span-4 flex flex-col">
          <GscSearchQueriesTable tenantSlug={tenantSlug} />
        </div>
        <div className="lg:col-span-2.5 lg:col-span-2 flex flex-col">
          <GscKeywordOpportunities tenantSlug={tenantSlug} />
        </div>
      </div>
    </DashboardSection>
  );
}
