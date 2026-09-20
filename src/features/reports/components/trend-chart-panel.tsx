'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Info } from 'lucide-react';
import { AnalyticsLoader } from '@/components/ui/analytics-loader';
import { formatAxisDate, formatCompact, formatNumber, formatDateRange } from '@/shared/lib/formatters';
import { CHART_COLORS } from '@/shared/config/design-tokens';

interface TimeseriesPoint {
  date: string;
  clicks: number;
  views: number;
}

interface TrendChartPanelProps {
  data: TimeseriesPoint[];
  isLoading: boolean;
  startDate: string;
  endDate: string;
  dateRangeDays: number;
  source?: 'all' | 'gsc' | 'gbp';
}

interface TooltipEntry {
  name?: string;
  value?: number;
  color?: string;
}

/** Custom tooltip with clean enterprise styling */
function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-lg p-3 min-w-[160px]">
      <div className="text-[11px] font-semibold text-slate-500 mb-2">
        {label ? formatAxisDate(label, 'medium') : ''}
      </div>
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-[12px] text-slate-600">{entry.name}</span>
          </div>
          <span className="text-[12px] font-bold text-slate-900 tabular">
            {formatNumber(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Single trend line panel with its own Y-axis */
function TrendPanel({
  data,
  seriesKey,
  seriesLabel,
  color,
  title,
  unit,
  isLoading,
}: {
  data: TimeseriesPoint[];
  seriesKey: 'clicks' | 'views';
  seriesLabel: string;
  color: string;
  title: string;
  unit: string;
  isLoading: boolean;
}) {
  if (isLoading) {
    return <AnalyticsLoader variant="hero" message={`Loading ${title} trend data...`} />;
  }

  const hasData = data.length > 0 && data.some((d) => d[seriesKey] > 0);

  if (!hasData) {
    return (
      <div className="py-8 text-center text-slate-400">
        <p className="text-xs">No trend data available for {title.toLowerCase()} in this time period.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          {title}
        </h4>
        <span className="text-xs text-slate-400">({unit})</span>
      </div>

      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis
              dataKey="date"
              tickFormatter={(v) => formatAxisDate(v, 'short')}
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
              minTickGap={20}
            />
            <YAxis
              tickFormatter={formatCompact}
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
              width={45}
            />
            <Tooltip content={<ChartTooltip />} />
            <Line
              type="monotone"
              dataKey={seriesKey}
              name={seriesLabel}
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Two aligned trend panels: GSC Clicks (above) and GBP Profile Views (below).
 *
 * WHY two panels instead of a dual-axis chart:
 * GBP views and GSC clicks operate on fundamentally different scales and
 * represent different user journeys (map discovery vs. organic search).
 * A shared or dual-axis chart would imply a causal or proportional relationship
 * that doesn't exist, and would make the smaller GSC series visually invisible.
 * Separate panels with shared date context are analytically honest.
 */
export function TrendChartPanel({
  data,
  isLoading,
  startDate,
  endDate,
  dateRangeDays,
  source = 'all',
}: TrendChartPanelProps) {
  const showGsc = source === 'all' || source === 'gsc';
  const showGbp = source === 'all' || source === 'gbp';

  const chartTitle =
    source === 'gsc'
      ? 'Google Search Console — Daily Clicks'
      : source === 'gbp'
      ? 'Google Business Profile — Daily Profile Views'
      : 'Daily Performance Trends';

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Card header */}
      <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-[14px] font-bold text-slate-900">
            {chartTitle}
          </h3>
          <p className="text-[12px] text-slate-500 mt-0.5">
            {isLoading ? 'Loading…' : formatDateRange(startDate, endDate)}
            {!isLoading && ` · ${dateRangeDays} days`}
          </p>
        </div>
        {source === 'all' && (
          <div
            className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] text-slate-500"
            title="Each source is shown on its own scale because GSC clicks and GBP profile views are independent metrics."
          >
            <Info className="h-3 w-3 flex-shrink-0" />
            <span>Separate Y-axes</span>
          </div>
        )}
      </div>

      {/* Panels */}
      <div className="px-5 py-5 space-y-6">
        {showGsc && (
          <TrendPanel
            data={data}
            seriesKey="clicks"
            seriesLabel="GSC Clicks"
            color={CHART_COLORS.gsc}
            title="Google Search — Clicks"
            unit="clicks"
            isLoading={isLoading}
          />
        )}

        {showGsc && showGbp && !isLoading && data.length > 0 && (
          <div className="border-t border-slate-100" />
        )}

        {showGbp && (
          <TrendPanel
            data={data}
            seriesKey="views"
            seriesLabel="GBP Profile Views"
            color={CHART_COLORS.gbp}
            title="Business Profile — Views"
            unit="views"
            isLoading={isLoading}
          />
        )}
      </div>

      {/* Footer note */}
      {source === 'all' && !isLoading && data.length > 0 && (
        <div className="px-5 pb-4">
          <p className="text-[10px] text-slate-400 leading-relaxed">
            GSC clicks and GBP views use independent Y-axes because they measure different user journeys at unrelated magnitudes.
          </p>
        </div>
      )}
    </div>
  );
}
