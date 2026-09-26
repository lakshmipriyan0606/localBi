'use client';

import { useState } from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  Share2,
  Globe,
  Search,
  MapPin,
  Laptop,
} from 'lucide-react';
import { Ga4KpiGrid, Ga4KpiGridProps } from './ga4-kpi-grid';
import { Ga4TrendChart, Ga4TrendPoint } from './ga4-trend-chart';
import { Ga4ChannelsTable, Ga4ChannelRow } from './ga4-channels-table';
import { Ga4DevicesCard, Ga4DeviceRow } from './ga4-devices-card';
import { Ga4PagesTable, Ga4PageRow } from './ga4-pages-table';
import { Ga4QueriesTable, Ga4QueryRow } from './ga4-queries-table';
import { Ga4CountriesCard, Ga4CountryRow } from './ga4-countries-card';

export interface Ga4TabbedViewProps {
  tenantSlug: string;
  kpi: Ga4KpiGridProps;
  trend: Ga4TrendPoint[];
  channels: Ga4ChannelRow[];
  devices: Ga4DeviceRow[];
  pages: Ga4PageRow[];
  queries: Ga4QueryRow[];
  countries: Ga4CountryRow[];
  hasRealData?: boolean;
}

export type Ga4TabId =
  | 'overview'
  | 'trends'
  | 'channels'
  | 'devices'
  | 'pages'
  | 'queries'
  | 'geography';

export function Ga4TabbedView({
  tenantSlug,
  kpi,
  trend,
  channels,
  devices,
  pages,
  queries,
  countries,
  hasRealData = false,
}: Ga4TabbedViewProps) {
  const [activeTab, setActiveTab] = useState<Ga4TabId>('overview');

  const tabs: Array<{
    id: Ga4TabId;
    label: string;
    icon: any;
    badge?: string | number | undefined;
  }> = [
    {
      id: 'overview',
      label: 'Executive KPIs',
      icon: LayoutDashboard,
      badge: '5 KPIs',
    },
    {
      id: 'trends',
      label: 'GA4 Traffic Trends',
      icon: TrendingUp,
      badge: 'Velocity',
    },
    {
      id: 'channels',
      label: 'Traffic Channels',
      icon: Share2,
      badge: channels.length > 0 ? `${channels.length}` : undefined,
    },
    {
      id: 'devices',
      label: 'Device Hardware',
      icon: Laptop,
      badge: devices.length > 0 ? `${devices.length}` : undefined,
    },
    {
      id: 'pages',
      label: 'Landing Pages',
      icon: Globe,
      badge: pages.length > 0 ? `${pages.length}` : undefined,
    },
    {
      id: 'queries',
      label: 'Search Keywords',
      icon: Search,
      badge: queries.length > 0 ? `${queries.length}` : undefined,
    },
    {
      id: 'geography',
      label: 'Audience & Geography',
      icon: MapPin,
      badge: countries.length > 0 ? `${countries.length}` : undefined,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Modern Executive Navigation Tabs Bar */}
      <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-1.5 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer flex-shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon
                  className={`h-4 w-4 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'
                  }`}
                />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold transition-colors ${
                      isActive
                        ? 'bg-white/25 text-white'
                        : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-800'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Panels: Each Section is 100% Dedicated & Separate */}
      <div className="transition-all duration-300">
        {/* TAB 1: EXECUTIVE KPIS ONLY */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            <Ga4KpiGrid {...kpi} hasRealData={hasRealData} />
          </div>
        )}

        {/* TAB 2: GA4 TRAFFIC TRENDS ONLY */}
        {activeTab === 'trends' && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            <Ga4TrendChart data={trend} hasRealData={hasRealData} />
          </div>
        )}

        {/* TAB 3: TRAFFIC ACQUISITION CHANNELS ONLY */}
        {activeTab === 'channels' && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            <Ga4ChannelsTable channels={channels} hasRealData={hasRealData} />
          </div>
        )}

        {/* TAB 4: DEVICE HARDWARE & CONNECTED SOURCES ONLY */}
        {activeTab === 'devices' && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            <Ga4DevicesCard tenantSlug={tenantSlug} devices={devices} hasRealData={hasRealData} />
          </div>
        )}

        {/* TAB 5: LANDING PAGES & CONTENT ONLY */}
        {activeTab === 'pages' && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            <Ga4PagesTable pages={pages} hasRealData={hasRealData} />
          </div>
        )}

        {/* TAB 6: SEARCH KEYWORDS ONLY */}
        {activeTab === 'queries' && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            <Ga4QueriesTable queries={queries} hasRealData={hasRealData} />
          </div>
        )}

        {/* TAB 7: AUDIENCE & GEOGRAPHY ONLY */}
        {activeTab === 'geography' && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            <Ga4CountriesCard countries={countries} hasRealData={hasRealData} />
          </div>
        )}
      </div>
    </div>
  );
}
