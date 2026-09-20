'use client';

import { MapPin } from 'lucide-react';
import { DashboardSection } from './dashboard-section';
import { DashboardMetricCard } from './dashboard-metric-card';
import type { OverviewDataDto } from '@/modules/overview/overview-service';

interface GbpSectionProps {
  tenantSlug: string;
  data?: OverviewDataDto['gbp'] | undefined;
}

export function GbpSection({ tenantSlug, data }: GbpSectionProps) {
  const gbpCards = [
    {
      key: 'profile-views',
      label: 'Profile Views',
      value: data ? data.profileViews : 0,
      delta: data?.hasData ? data.profileViewsDelta : undefined,
      icon: 'eye',
      color: 'purple' as const,
      sparkColor: '#10B981',
      seed: 1,
    },
    {
      key: 'calls',
      label: 'Calls',
      value: data ? data.calls : 0,
      delta: data?.hasData ? data.callsDelta : undefined,
      icon: 'phone',
      color: 'blue' as const,
      sparkColor: '#3B82F6',
      seed: 2,
    },
    {
      key: 'directions',
      label: 'Direction Requests',
      value: data ? data.directions : 0,
      delta: data?.hasData ? data.directionsDelta : undefined,
      icon: 'navigation',
      color: 'teal' as const,
      sparkColor: '#14B8A6',
      seed: 3,
    },
    {
      key: 'reviews',
      label: 'Reviews',
      value: data ? data.reviews : 0,
      delta: data?.hasData ? data.reviewsDelta : undefined,
      icon: 'star',
      color: 'amber' as const,
      sparkColor: '#8B5CF6',
      seed: 4,
    },
    {
      key: 'photo-views',
      label: 'Photo Views',
      value: data ? data.photoViews : 0,
      delta: data?.hasData ? data.photoViewsDelta : undefined,
      icon: 'image',
      color: 'blue' as const,
      sparkColor: '#10B981',
      seed: 5,
    },
  ];

  return (
    <DashboardSection
      icon={
        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-600 shadow-xs">
          <MapPin className="w-4 h-4 fill-emerald-600 text-white" />
        </div>
      }
      title="Google Business Profile"
      badge="✓ Local Presence & Customer Reach"
      badgeColor="bg-emerald-100/70 text-emerald-800"
      subtitle="Your Google Business Profile performance across all locations"
      bgClass="bg-[#EBF7F2]"
      borderClass="border-[#C5E8D8]"
      reportHref={`/t/${tenantSlug}/reports?tab=gbp`}
      reportLabel="View GBP Report"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {gbpCards.map((card) => (
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
