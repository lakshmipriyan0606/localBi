'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Store, Search, BarChart3, Sparkles } from 'lucide-react';
import { GbpSection } from './gbp-section';
import { GscSection } from './gsc-section';
import { WebAnalyticsSection } from './web-analytics-section';
import type { OverviewDataDto } from '@/modules/overview/overview-service';

export type OverviewTabId = 'gbp' | 'gsc' | 'web';

interface OverviewTabsContainerProps {
  tenantSlug: string;
  initialTab?: OverviewTabId;
  overviewData?: OverviewDataDto;
}

interface TabItem {
  id: OverviewTabId;
  label: string;
  shortLabel: string;
  kpi: string;
  badge: string;
  icon: typeof Store;
  colorClass: {
    active: string;
    iconBg: string;
    iconColor: string;
    dotColor: string;
    borderActive: string;
  };
}

export function OverviewTabsContainer({
  tenantSlug,
  initialTab = 'gbp',
  overviewData,
}: OverviewTabsContainerProps) {
  const searchParams = useSearchParams();

  // Read URL query tab if provided
  const queryTab = searchParams.get('tab') as OverviewTabId | null;
  const [activeTab, setActiveTab] = useState<OverviewTabId>(
    queryTab && ['gbp', 'gsc', 'web'].includes(queryTab) ? queryTab : initialTab
  );

  // Sync state if URL changes externally
  useEffect(() => {
    if (queryTab && ['gbp', 'gsc', 'web'].includes(queryTab) && queryTab !== activeTab) {
      setActiveTab(queryTab);
    }
  }, [queryTab, activeTab]);

  const handleSelectTab = (tabId: OverviewTabId) => {
    setActiveTab(tabId);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tabId);
    window.history.replaceState({}, '', url.toString());
  };

  const gbpKpi = overviewData
    ? `${overviewData.gbp.profileViews.toLocaleString()} views • ${overviewData.gbp.calls.toLocaleString()} calls`
    : '0 views • 0 calls';

  const gscKpi = overviewData
    ? `${overviewData.gsc.clicks.toLocaleString()} clicks • ${overviewData.gsc.impressions.toLocaleString()} impr`
    : '0 clicks • 0 impr';

  const webKpi = overviewData
    ? `${overviewData.web.users.toLocaleString()} users • ${overviewData.web.conversions.toLocaleString()} conv`
    : '0 users • 0 conv';

  const tabs: TabItem[] = [
    {
      id: 'gbp',
      label: 'Google Business Profile',
      shortLabel: 'GBP Local',
      kpi: gbpKpi,
      badge: 'Local Presence',
      icon: Store,
      colorClass: {
        active: 'bg-[#EBF7F2] text-[#065F46] border-[#A7F3D0] shadow-xs',
        iconBg: 'bg-emerald-100 text-emerald-700',
        iconColor: 'text-emerald-700',
        dotColor: 'bg-emerald-500',
        borderActive: 'border-emerald-400',
      },
    },
    {
      id: 'gsc',
      label: 'Search Console',
      shortLabel: 'Search Console',
      kpi: gscKpi,
      badge: 'Rankings & Queries',
      icon: Search,
      colorClass: {
        active: 'bg-[#F1F3FB] text-[#3730A3] border-[#C7D2FE] shadow-xs',
        iconBg: 'bg-indigo-100 text-indigo-700',
        iconColor: 'text-indigo-700',
        dotColor: 'bg-indigo-500',
        borderActive: 'border-indigo-400',
      },
    },
    {
      id: 'web',
      label: 'Web Analytics & Map',
      shortLabel: 'Web Analytics',
      kpi: webKpi,
      badge: 'Storefronts & Map',
      icon: BarChart3,
      colorClass: {
        active: 'bg-[#F0F7FD] text-[#0369A1] border-[#BAE6FD] shadow-xs',
        iconBg: 'bg-sky-100 text-sky-700',
        iconColor: 'text-sky-700',
        dotColor: 'bg-sky-500',
        borderActive: 'border-sky-400',
      },
    },
  ];

  return (
    <div className="space-y-3.5">
      {/* Tab Selector Navigation Bar (3 Distinct Channels) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-2 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
        <div className="flex items-center justify-between gap-2 px-2 py-1 mb-1.5 border-b border-slate-100/80">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold uppercase tracking-wider text-slate-400">
              Overview Channels:
            </span>
            <span className="text-[11.5px] font-semibold text-slate-600">
              Select a channel to view its dedicated performance dashboard
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hidden sm:flex">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Click any tab to switch view</span>
          </div>
        </div>

        {/* 3 Channel Tabs Grid */}
        <div
          role="tablist"
          aria-label="Overview Channels"
          className="grid grid-cols-1 sm:grid-cols-3 gap-2.5"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => handleSelectTab(tab.id)}
                className={`relative flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                  isActive
                    ? tab.colorClass.active
                    : 'bg-slate-50/60 border-slate-200/60 text-slate-600 hover:bg-white hover:border-slate-300'
                }`}
              >
                {/* Channel Icon */}
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform ${
                    isActive ? tab.colorClass.iconBg : 'bg-white text-slate-500 shadow-xs border border-slate-200/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {/* Tab Label & Micro KPI */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-bold truncate leading-snug">
                      {tab.label}
                    </span>
                    {isActive && (
                      <span className={`w-1.5 h-1.5 rounded-full ${tab.colorClass.dotColor} flex-shrink-0`} />
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                    {tab.kpi}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dedicated Tab Content Display */}
      <div className="animate-in fade-in duration-200">
        {activeTab === 'gbp' && (
          <GbpSection tenantSlug={tenantSlug} data={overviewData?.gbp} />
        )}

        {activeTab === 'gsc' && (
          <GscSection tenantSlug={tenantSlug} data={overviewData?.gsc} />
        )}

        {activeTab === 'web' && (
          <WebAnalyticsSection tenantSlug={tenantSlug} data={overviewData?.web} />
        )}
      </div>
    </div>
  );
}
