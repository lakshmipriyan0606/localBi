'use client';

import { MapPin } from 'lucide-react';
import { DashboardSection } from './dashboard-section';
import { DashboardMetricCard } from './dashboard-metric-card';

interface GbpSectionProps {
  tenantSlug: string;
}

const GBP_CARDS = [
  {
    key: 'profile-views',
    label: 'Profile Views',
    value: 25814,
    delta: 24.1,
    icon: 'eye',
    color: 'purple',
    sparkColor: '#10B981', // emerald sparkline
    seed: 1,
  },
  {
    key: 'calls',
    label: 'Calls',
    value: 958,
    delta: 12.3,
    icon: 'phone',
    color: 'blue',
    sparkColor: '#3B82F6',
    seed: 2,
  },
  {
    key: 'directions',
    label: 'Direction Requests',
    value: 1855,
    delta: 28.6,
    icon: 'navigation',
    color: 'teal',
    sparkColor: '#14B8A6',
    seed: 3,
  },
  {
    key: 'reviews',
    label: 'Reviews',
    value: 312,
    delta: 36.8,
    icon: 'star',
    color: 'amber',
    sparkColor: '#8B5CF6',
    seed: 4,
  },
  {
    key: 'photo-views',
    label: 'Photo Views',
    value: 7421,
    delta: 18.9,
    icon: 'image',
    color: 'blue',
    sparkColor: '#10B981',
    seed: 5,
  },
];

export function GbpSection({ tenantSlug }: GbpSectionProps) {
  return (
    <DashboardSection
      icon={
        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-600 shadow-xs">
          <MapPin className="w-4 h-4 fill-emerald-600 text-white" />
        </div>
      }
      title="Google Business Profile"
      badge="✓ Local Presence Drives Real Patients"
      badgeColor="bg-emerald-100/70 text-emerald-800"
      subtitle="Your Google Business Profile performance across all locations"
      bgClass="bg-[#EBF7F2]"
      borderClass="border-[#C5E8D8]"
      reportHref={`/t/${tenantSlug}/reports?tab=gbp`}
      reportLabel="View GBP Report"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {GBP_CARDS.map((card) => (
          <DashboardMetricCard
            key={card.key}
            label={card.label}
            value={card.value}
            delta={card.delta}
            icon={card.icon}
            color={card.color}
            sparkColor={card.sparkColor}
            seed={card.seed}
          />
        ))}
      </div>
    </DashboardSection>
  );
}
