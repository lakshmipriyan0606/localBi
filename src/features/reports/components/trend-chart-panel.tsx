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
import { ChartTooltipFrame, ChartEmptyState } from '@/components/charts';

interface TimeseriesPoint {
  date: string;
  clicks: number;
  views: number;
  impressions?: number;
  ctr?: number;
  position?: number;
}

interface TrendChartPanelProps {
  data: TimeseriesPoint[];
  isLoading: boolean;
  startDate: string;
  endDate: string;
  dateRangeDays: number;
  source?: 'all' | 'gsc' | 'gbp';
  activeGscMetrics?: string[];
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
    <ChartTooltipFrame
      title={label ? formatAxisDate(label, 'medium') : undefined}
      items={payload.map((entry) => ({
        label: entry.name || '',
        color: entry.color,
        value: entry.name === 'CTR'
          ? `${typeof entry.value === 'number' ? (entry.value <= 1 && entry.value > 0 ? (entry.value * 100).toFixed(1) : entry.value.toFixed(1)) : 0}%`
          : entry.name === 'Average Position'
          ? (typeof entry.value === 'number' ? entry.value.toFixed(1) : '—')
          : formatNumber(entry.value),
      }))}
    />
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
      <ChartEmptyState
        title={`No ${title} Data`}
        description={`No trend data available for ${title.toLowerCase()} in this time period.`}
        className="py-8"
      />
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

/** Multi-line trend panel for GSC */
function GscMultiTrendPanel({
  data,
  activeMetrics,
  isLoading,
}: {
  data: TimeseriesPoint[];
  activeMetrics: string[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return <AnalyticsLoader variant="hero" message={`Loading GSC trend data...`} />;
  }

  const hasData = data.length > 0 && data.some((d) => (d.clicks ?? 0) > 0 || (d.impressions ?? 0) > 0);

  if (!hasData) {
    return (
      <ChartEmptyState
        title="No GSC Trend Data"
        description="No trend data available for Google Search Console in this time period."
        className="py-8"
      />
    );
  }

  if (activeMetrics.length === 0) {
    return (
      <ChartEmptyState
        title="No Metrics Selected"
        description="Select a metric above to view its trend chart."
        className="py-8"
      />
    );
  }

  const useLeftAxis = activeMetrics.includes('clicks') || activeMetrics.includes('impressions');
  const useRightAxis = activeMetrics.includes('ctr') || activeMetrics.includes('position');

  return (
    <div className="space-y-3">
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: useRightAxis ? 0 : 10, left: useLeftAxis ? -20 : -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis
              dataKey="date"
              tickFormatter={(v) => formatAxisDate(v, 'short')}
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
              minTickGap={20}
            />
            {useLeftAxis && (
              <YAxis
                yAxisId="left"
                orientation="left"
                tickFormatter={formatCompact}
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
                width={45}
              />
            )}
            {useRightAxis && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={(v) => activeMetrics.includes('ctr') && !activeMetrics.includes('position') ? v + '%' : formatCompact(v)}
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
                width={45}
                reversed={activeMetrics.includes('position') && !activeMetrics.includes('ctr')} 
              />
            )}
            <Tooltip content={<ChartTooltip />} />
            
            {activeMetrics.includes('clicks') && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="clicks"
                name="Clicks"
                stroke="#8B5CF6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#8B5CF6", strokeWidth: 0 }}
              />
            )}
            {activeMetrics.includes('impressions') && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="impressions"
                name="Impressions"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#3B82F6", strokeWidth: 0 }}
              />
            )}
            {activeMetrics.includes('ctr') && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="ctr"
                name="CTR"
                stroke="#14B8A6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#14B8A6", strokeWidth: 0 }}
              />
            )}
            {activeMetrics.includes('position') && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="position"
                name="Average Position"
                stroke="#F59E0B"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#F59E0B", strokeWidth: 0 }}
              />
            )}
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
  activeGscMetrics = ['clicks', 'impressions', 'ctr', 'position'],
}: TrendChartPanelProps) {
  const showGsc = source === 'all' || source === 'gsc';
  const showGbp = source === 'all' || source === 'gbp';

  const chartTitle =
    source === 'gsc'
      ? 'Google Search Console — Performance Trends'
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
          <GscMultiTrendPanel
            data={data}
            activeMetrics={activeGscMetrics}
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
