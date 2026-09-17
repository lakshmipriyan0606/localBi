'use client';

import * as React from 'react';
import { useState } from 'react';
import { Laptop, Smartphone, Tablet, Search as SearchIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AnalyticsLoader } from '@/components/ui/analytics-loader';
import { cn } from '@/lib/cn';
import { formatNumber, formatPercent, formatPosition } from '@/shared/lib/formatters';
import type {
  QueryDimensionRow,
  PageDimensionRow,
  DeviceDimensionRow,
} from '@/modules/reports/reporting-service';

type DimensionTab = 'queries' | 'pages' | 'devices';

interface DimensionBreakdownProps {
  queries?: QueryDimensionRow[];
  pages?: PageDimensionRow[];
  devices?: DeviceDimensionRow[];
  isLoading: boolean;
}

function TabButton({
  active,
  onClick,
  children,
  id,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  id: string;
}) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className={cn(
        'px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all cursor-pointer whitespace-nowrap',
        active
          ? 'bg-white text-indigo-700 shadow-sm border border-slate-200'
          : 'text-slate-600 hover:text-slate-900'
      )}
    >
      {children}
    </button>
  );
}


function QueriesTable({ queries }: { queries: QueryDimensionRow[] }) {
  if (queries.length === 0) {
    return (
      <div className="py-12 text-center">
        <SearchIcon className="h-8 w-8 text-slate-300 mx-auto mb-2" />
        <p className="text-[13px] text-slate-400">No search queries recorded for this period.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-5 px-5">
      <table className="w-full text-left text-[12px] min-w-[500px]">
        <thead>
          <tr className="border-b border-slate-100">
            {['Search Query', 'Clicks', 'Impressions', 'CTR', 'Position'].map((h) => (
              <th
                key={h}
                className={cn(
                  'pb-2.5 font-semibold text-[10px] uppercase tracking-wider text-slate-400',
                  h !== 'Search Query' && 'text-right'
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {queries.map((q) => (
            <tr key={q.queryText} className="hover:bg-slate-50/60 transition-colors">
              <td className="py-2.5 pr-4 font-medium text-slate-800 max-w-[280px] truncate">
                {q.queryText}
              </td>
              <td className="py-2.5 text-right font-semibold text-slate-900 tabular">
                {formatNumber(q.clicks)}
              </td>
              <td className="py-2.5 text-right text-slate-600 tabular">
                {formatNumber(q.impressions)}
              </td>
              <td className="py-2.5 text-right text-slate-600 tabular">
                {formatPercent(q.ctr)}
              </td>
              <td className="py-2.5 text-right font-semibold text-slate-700 tabular">
                {formatPosition(q.position)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PagesTable({ pages }: { pages: PageDimensionRow[] }) {
  if (pages.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-[13px] text-slate-400">No landing pages recorded for this period.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-5 px-5">
      <table className="w-full text-left text-[12px] min-w-[560px]">
        <thead>
          <tr className="border-b border-slate-100">
            {['Landing Page', 'Clicks', 'Impressions', 'CTR', 'Position'].map((h) => (
              <th
                key={h}
                className={cn(
                  'pb-2.5 font-semibold text-[10px] uppercase tracking-wider text-slate-400',
                  h !== 'Landing Page' && 'text-right'
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {pages.map((p) => (
            <tr key={p.fullUrl} className="hover:bg-slate-50/60 transition-colors">
              <td className="py-2.5 pr-4 max-w-[320px]">
                <span
                  className="font-mono text-[11px] text-slate-700 truncate block"
                  title={p.fullUrl}
                >
                  {p.fullUrl}
                </span>
              </td>
              <td className="py-2.5 text-right font-semibold text-slate-900 tabular">
                {formatNumber(p.clicks)}
              </td>
              <td className="py-2.5 text-right text-slate-600 tabular">
                {formatNumber(p.impressions)}
              </td>
              <td className="py-2.5 text-right text-slate-600 tabular">
                {formatPercent(p.ctr)}
              </td>
              <td className="py-2.5 text-right font-semibold text-slate-700 tabular">
                {formatPosition(p.position)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DevicesGrid({ devices }: { devices: DeviceDimensionRow[] }) {
  const totalClicks = devices.reduce((s, d) => s + d.clicks, 0) || 1;

  if (devices.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-[13px] text-slate-400">No device data recorded for this period.</p>
      </div>
    );
  }

  const DEVICE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    MOBILE: Smartphone,
    DESKTOP: Laptop,
    TABLET: Tablet,
  };

  const DEVICE_COLORS: Record<string, string> = {
    MOBILE: 'bg-indigo-600',
    DESKTOP: 'bg-teal-600',
    TABLET: 'bg-violet-600',
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {devices.map((d) => {
        const Icon = DEVICE_ICONS[d.device] || Laptop;
        const pct = Math.round((d.clicks / totalClicks) * 100);
        const barColor = DEVICE_COLORS[d.device] || 'bg-slate-600';

        return (
          <div
            key={d.device}
            className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-slate-800 text-[13px]">
                <Icon className="h-4 w-4 text-indigo-600" />
                <span className="capitalize">{d.device.toLowerCase()}</span>
              </div>
              <Badge variant="secondary" className="text-[10px] tabular">
                {pct}%
              </Badge>
            </div>

            {/* Bar */}
            <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', barColor)}
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="flex justify-between text-[11px] text-slate-500 pt-0.5">
              <span className="tabular">{formatNumber(d.clicks)} clicks</span>
              <span className="tabular">{formatNumber(d.impressions)} impr.</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Tabbed dimension breakdown for GSC analytics: queries, pages, devices.
 * Each tab has independent loading skeleton and empty state.
 */
export function DimensionBreakdown({
  queries = [],
  pages = [],
  devices = [],
  isLoading,
}: DimensionBreakdownProps) {
  const [activeTab, setActiveTab] = useState<DimensionTab>('queries');

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header with tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 pt-5 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-[14px] font-bold text-slate-900">Search Dimension Analytics</h3>
          <p className="text-[12px] text-slate-500 mt-0.5">
            Query terms, top landing pages and device split from Google Search Console
          </p>
        </div>

        <div
          className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg"
          role="tablist"
          aria-label="Dimension analytics"
        >
          <TabButton
            id="dim-tab-queries"
            active={activeTab === 'queries'}
            onClick={() => setActiveTab('queries')}
          >
            Top Queries
          </TabButton>
          <TabButton
            id="dim-tab-pages"
            active={activeTab === 'pages'}
            onClick={() => setActiveTab('pages')}
          >
            Top Pages
          </TabButton>
          <TabButton
            id="dim-tab-devices"
            active={activeTab === 'devices'}
            onClick={() => setActiveTab('devices')}
          >
            Devices
          </TabButton>
        </div>
      </div>

      {/* Tab content */}
      <div className="px-5 py-4" role="tabpanel" aria-labelledby={`dim-tab-${activeTab}`}>
        {isLoading ? (
          <AnalyticsLoader variant="hero" message={`Aggregating Google Search Console ${activeTab} telemetry...`} />
        ) : activeTab === 'queries' ? (
          <QueriesTable queries={queries} />
        ) : activeTab === 'pages' ? (
          <PagesTable pages={pages} />
        ) : (
          <DevicesGrid devices={devices} />
        )}
      </div>
    </div>
  );
}
