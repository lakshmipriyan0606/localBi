'use client';

import { useMemo } from 'react';
import { Award, BarChart2, PieChart } from 'lucide-react';
import { DashboardMetricCard } from '@/features/overview/components/dashboard-metric-card';

export interface DrilldownVisualAnalyticsProps<T> {
  data: T[] | undefined;
  sourceBadge: 'GSC' | 'GBP';
  title?: string | undefined;
}

interface ParsedEntity {
  name: string;
  primaryValue: number;
  secondaryValue: number;
  rateValue?: number | undefined;
  rateLabel?: string | undefined;
  extra?: string | undefined;
}

export function DrilldownVisualAnalytics<T>({
  data,
  sourceBadge,
}: DrilldownVisualAnalyticsProps<T>) {
  const parsedData = useMemo((): ParsedEntity[] => {
    if (!data || data.length === 0) return [];

    return data.map((item) => {
      const record = item as Record<string, unknown>;

      // Extract entity name based on known fields
      const name =
        String(
          record['locationName'] ??
            record['query'] ??
            record['keyword'] ??
            record['countryName'] ??
            record['pageUrl'] ??
            record['deviceType'] ??
            'Unknown'
        );

      // Extract primary metric (clicks, totalViews, impressions)
      const primaryValue = Number(
        record['totalViews'] ??
          record['clicks'] ??
          record['impressions'] ??
          0
      );

      // Extract secondary metric (impressions, searchViews, etc.)
      const secondaryValue = Number(
        record['impressions'] ??
          record['searchViews'] ??
          record['callClicks'] ??
          0
      );

      // Extract rate metric (CTR, position, etc.)
      let rateValue: number | undefined;
      let rateLabel: string | undefined;

      const ctrVal = record['ctr'];
      const posVal = record['position'];
      const mapsVal = record['mapsViews'];

      if (typeof ctrVal === 'number') {
        rateValue = ctrVal;
        rateLabel = `${rateValue.toFixed(1)}% CTR`;
      } else if (typeof posVal === 'number') {
        rateValue = posVal;
        rateLabel = `Rank ${rateValue.toFixed(1)}`;
      } else if (typeof mapsVal === 'number') {
        rateValue = mapsVal;
        rateLabel = `${rateValue.toLocaleString()} Maps`;
      }

      const cityVal = record['city'];
      const countryCodeVal = record['countryCode'];

      const extra = cityVal
        ? String(cityVal)
        : countryCodeVal
        ? String(countryCodeVal)
        : undefined;

      return {
        name,
        primaryValue,
        secondaryValue,
        rateValue,
        rateLabel,
        extra,
      };
    });
  }, [data]);

  // Aggregate totals
  const summary = useMemo(() => {
    if (parsedData.length === 0) {
      return {
        totalPrimary: 0,
        totalSecondary: 0,
        topItem: null as ParsedEntity | null,
        avgPrimary: 0,
      };
    }

    const totalPrimary = parsedData.reduce((acc, it) => acc + it.primaryValue, 0);
    const totalSecondary = parsedData.reduce((acc, it) => acc + it.secondaryValue, 0);
    const sorted = [...parsedData].sort((a, b) => b.primaryValue - a.primaryValue);
    const topItem = sorted[0] ?? null;
    const avgPrimary = Math.round(totalPrimary / parsedData.length);

    return { totalPrimary, totalSecondary, topItem, avgPrimary };
  }, [parsedData]);

  // Top 5 items for horizontal distribution chart and donut breakdown
  const topItems = useMemo(() => {
    return [...parsedData]
      .sort((a, b) => b.primaryValue - a.primaryValue)
      .slice(0, 5);
  }, [parsedData]);

  if (!data || data.length === 0) return null;

  const isGbp = sourceBadge === 'GBP';
  const primaryMetricName = isGbp ? 'Total Views' : 'Total Clicks';
  const secondaryMetricName = isGbp ? 'Search Views' : 'Total Impressions';

  // Distinct palette for distribution charts
  const BAR_COLORS = [
    { bg: 'from-indigo-500 to-indigo-600', text: 'text-indigo-600', pill: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { bg: 'from-teal-500 to-emerald-500', text: 'text-teal-600', pill: 'bg-teal-50 text-teal-700 border-teal-200' },
    { bg: 'from-purple-500 to-violet-600', text: 'text-purple-600', pill: 'bg-purple-50 text-purple-700 border-purple-200' },
    { bg: 'from-blue-500 to-sky-500', text: 'text-blue-600', pill: 'bg-blue-50 text-blue-700 border-blue-200' },
    { bg: 'from-amber-500 to-orange-500', text: 'text-amber-600', pill: 'bg-amber-50 text-amber-700 border-amber-200' },
  ];

  return (
    <div className="space-y-4">
      {/* 1. Top KPI Summary Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <DashboardMetricCard
          label={primaryMetricName}
          value={summary.totalPrimary}
          icon={isGbp ? 'eye' : 'mouse-pointer-click'}
          color={isGbp ? 'teal' : 'indigo'}
          sparkColor={isGbp ? '#10B981' : '#6366F1'}
          seed={1}
        />
        <DashboardMetricCard
          label={secondaryMetricName}
          value={summary.totalSecondary}
          icon="bar-chart"
          color="blue"
          sparkColor="#3B82F6"
          seed={2}
        />
        <DashboardMetricCard
          label="Tracked Entities"
          value={parsedData.length}
          icon="globe"
          color="purple"
          sparkColor="#8B5CF6"
          seed={3}
        />
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-[0_1px_3px_rgba(15,23,42,0.03)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between h-[108px] overflow-hidden">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-amber-50 ring-1 ring-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
              <Award className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11.5px] font-medium text-slate-600 tracking-tight truncate">
              Top Performer
            </span>
          </div>
          <div className="mt-1 min-w-0">
            <div className="text-[14px] font-bold text-slate-900 truncate leading-tight">
              {summary.topItem?.name || 'None'}
            </div>
            <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
              <span>{summary.topItem?.primaryValue.toLocaleString()} volume</span>
              {summary.topItem && summary.totalPrimary > 0 && (
                <span className="text-[9.5px] font-semibold text-slate-400">
                  ({Math.round((summary.topItem.primaryValue / summary.totalPrimary) * 100)}% share)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Visual Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
        {/* Horizontal Distribution Chart (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-4 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-indigo-600" />
                <h3 className="text-[13.5px] font-bold text-slate-900 tracking-tight">
                  Top Performers Distribution
                </h3>
              </div>
              <span className="text-[11px] font-medium text-slate-500">
                by {primaryMetricName}
              </span>
            </div>

            <div className="space-y-3 mt-2">
              {topItems.map((item, idx) => {
                const maxVal = topItems[0]?.primaryValue || 1;
                const pct = Math.max(8, Math.round((item.primaryValue / maxVal) * 100));
                const sharePct =
                  summary.totalPrimary > 0
                    ? Math.round((item.primaryValue / summary.totalPrimary) * 100)
                    : 0;
                const theme = BAR_COLORS[idx % BAR_COLORS.length]!;

                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-[11.5px] gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-4 text-center font-bold text-slate-400 text-[10px]">
                          #{idx + 1}
                        </span>
                        <span className="font-semibold text-slate-800 truncate">
                          {item.name}
                        </span>
                        {item.extra && (
                          <span className="text-[10px] text-slate-400 hidden sm:inline">
                            • {item.extra}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-bold text-slate-900 tabular-nums">
                          {item.primaryValue.toLocaleString()}
                        </span>
                        <span
                          className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded border ${theme.pill}`}
                        >
                          {sharePct}%
                        </span>
                      </div>
                    </div>

                    {/* Gradient Progress Bar */}
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${theme.bg} rounded-full transition-all duration-700`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Showing top {topItems.length} entities</span>
            <span className="font-semibold text-slate-700">
              Avg: {summary.avgPrimary.toLocaleString()} / entity
            </span>
          </div>
        </div>

        {/* Proportional Donut Share Card (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-4 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-purple-600" />
                <h3 className="text-[13.5px] font-bold text-slate-900 tracking-tight">
                  Volume Share & Concentration
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/70">
                Breakdown
              </span>
            </div>

            {/* Circular representation & share percentages */}
            <div className="flex items-center justify-center gap-4 py-2">
              <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
                <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="36"
                    fill="none"
                    stroke="#F1F5F9"
                    strokeWidth="10"
                  />
                  {topItems.map((item, idx) => {
                    const share =
                      summary.totalPrimary > 0
                        ? item.primaryValue / summary.totalPrimary
                        : 0;
                    const strokeLen = 2 * Math.PI * 36 * share;
                    const strokeOffset = idx * 30;
                    const colors = ['#6366F1', '#10B981', '#8B5CF6', '#3B82F6', '#F59E0B'];
                    return (
                      <circle
                        key={item.name}
                        cx="48"
                        cy="48"
                        r="36"
                        fill="none"
                        stroke={colors[idx % colors.length]}
                        strokeWidth="10"
                        strokeDasharray={`${strokeLen} 300`}
                        strokeDashoffset={-strokeOffset}
                        strokeLinecap="round"
                        className="transition-all duration-700"
                      />
                    );
                  })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[16px] font-black text-slate-900 leading-none">
                    {summary.totalPrimary > 0
                      ? `${Math.round(
                          (topItems.reduce((s, it) => s + it.primaryValue, 0) /
                            summary.totalPrimary) *
                            100
                        )}%`
                      : '0%'}
                  </span>
                  <span className="text-[8px] font-semibold text-slate-400 mt-0.5">
                    Top 5 Share
                  </span>
                </div>
              </div>

              {/* Legend with shares */}
              <div className="space-y-1.5 min-w-0 flex-1">
                {topItems.slice(0, 4).map((item, idx) => {
                  const sharePct =
                    summary.totalPrimary > 0
                      ? Math.round((item.primaryValue / summary.totalPrimary) * 100)
                      : 0;
                  const dots = ['bg-[#6366F1]', 'bg-[#10B981]', 'bg-[#8B5CF6]', 'bg-[#3B82F6]'];
                  return (
                    <div
                      key={item.name}
                      className="flex items-center justify-between text-[11px] gap-2"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${dots[idx % dots.length]}`}
                        />
                        <span className="text-slate-700 font-medium truncate">
                          {item.name}
                        </span>
                      </div>
                      <span className="font-bold text-slate-900 tabular-nums">
                        {sharePct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <p className="text-[10.5px] text-slate-400 mt-2 text-center">
            Concentration reflects organic audience acquisition across top assets
          </p>
        </div>
      </div>
    </div>
  );
}
