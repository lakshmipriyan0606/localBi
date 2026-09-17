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
import { Calendar, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
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
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  const hasData = data.length > 0 && data.some((d) => d[seriesKey] > 0);

  if (!hasData) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <span className="text-[13px] font-semibold text-slate-700">{title}</span>
        </div>
        <div className="h-48 flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 text-center px-4">
          <Calendar className="h-7 w-7 text-slate-300 mb-2" />
          <p className="text-[12px] text-slate-400">No {unit} recorded for this period</p>
        </div>
      </div>
    );
  }

  // Sample dates for X-axis ticks — show ~6 evenly spaced labels
  const tickInterval = Math.max(1, Math.floor(data.length / 6));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <span className="text-[13px] font-semibold text-slate-700">{title}</span>
          <span className="text-[11px] text-slate-400">({unit})</span>
        </div>
      </div>

      <div className="h-48" aria-label={`${title} trend chart`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              horizontal
              vertical={false}
              stroke={CHART_COLORS.grid}
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: CHART_COLORS.axis }}
              tickLine={false}
              axisLine={false}
              interval={tickInterval}
              tickFormatter={(v) => formatAxisDate(v, 'short')}
            />
            <YAxis
              tick={{ fontSize: 10, fill: CHART_COLORS.axis }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatCompact}
              width={40}
            />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              content={ChartTooltip as any}
              cursor={{ stroke: CHART_COLORS.grid, strokeWidth: 1, strokeDasharray: '4 2' }}
            />
            <Line
              type="monotone"
              dataKey={seriesKey}
              name={seriesLabel}
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: color }}
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
}: TrendChartPanelProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Card header */}
      <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-[14px] font-bold text-slate-900">
            Daily Performance Trends
          </h3>
          <p className="text-[12px] text-slate-500 mt-0.5">
            {isLoading ? 'Loading…' : formatDateRange(startDate, endDate)}
            {!isLoading && ` · ${dateRangeDays} days`}
          </p>
        </div>
        <div
          className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] text-slate-500"
          title="Each source is shown on its own scale because GSC clicks and GBP profile views are independent metrics with unrelated magnitudes."
        >
          <Info className="h-3 w-3 flex-shrink-0" />
          <span>Separate Y-axes</span>
        </div>
      </div>

      {/* Two panels */}
      <div className="px-5 py-5 space-y-6">
        <TrendPanel
          data={data}
          seriesKey="clicks"
          seriesLabel="GSC Clicks"
          color={CHART_COLORS.gsc}
          title="Google Search — Clicks"
          unit="clicks"
          isLoading={isLoading}
        />

        {/* Divider */}
        {!isLoading && data.length > 0 && (
          <div className="border-t border-slate-100" />
        )}

        <TrendPanel
          data={data}
          seriesKey="views"
          seriesLabel="GBP Profile Views"
          color={CHART_COLORS.gbp}
          title="Business Profile — Views"
          unit="views"
          isLoading={isLoading}
        />
      </div>

      {/* Footer note */}
      {!isLoading && data.length > 0 && (
        <div className="px-5 pb-4">
          <p className="text-[10px] text-slate-400 leading-relaxed">
            GSC clicks and GBP views use independent Y-axes because they measure different user journeys at unrelated magnitudes.
            Displaying them on a shared axis would make the smaller series invisible and imply a relationship that does not exist.
          </p>
        </div>
      )}
    </div>
  );
}
