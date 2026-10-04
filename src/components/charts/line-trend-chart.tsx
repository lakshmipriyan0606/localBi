'use client';

import * as React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { StandardChartTooltip } from './chart-tooltip';
import { AnalyticsFormatters } from '@/shared/analytics/formatters';

export interface LineSeriesConfig {
  key: string;
  name: string;
  color?: string | undefined;
  strokeWidth?: number | undefined;
  isComparison?: boolean | undefined;
}

export interface LineTrendChartProps {
  data: Array<Record<string, unknown>>;
  series: LineSeriesConfig[];
  xAxisKey?: string | undefined;
  height?: number | string | undefined;
  timezone?: string | undefined;
  yAxisFormatter?: ((value: number) => string) | undefined;
  tooltipValueFormatter?: ((value: number | string, name?: string) => string) | undefined;
  showLegend?: boolean | undefined;
  className?: string | undefined;
}

const DEFAULT_COLORS = ['#4338CA', '#0F766E', '#7C3AED'];

export function LineTrendChart({
  data,
  series,
  xAxisKey = 'date',
  height = '100%',
  timezone,
  yAxisFormatter = (v) => AnalyticsFormatters.compact(v),
  tooltipValueFormatter,
  showLegend = true,
  className,
}: LineTrendChartProps) {
  return (
    <div className={className} style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis
            dataKey={xAxisKey}
            tickLine={false}
            axisLine={{ stroke: '#E2E8F0' }}
            tick={{ fill: '#64748B', fontSize: 11 }}
            tickFormatter={(val: string) => {
              if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
                return AnalyticsFormatters.date(val, 'short', timezone);
              }
              return String(val);
            }}
            dy={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#64748B', fontSize: 11 }}
            tickFormatter={yAxisFormatter}
            dx={-4}
          />
          <Tooltip
            content={
              <StandardChartTooltip
                timezone={timezone}
                valueFormatter={tooltipValueFormatter}
              />
            }
          />
          {showLegend && series.length > 1 && (
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ paddingBottom: 12, fontSize: 11 }}
            />
          )}
          {series.map((s, index) => {
            const color = s.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
            return (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={color}
                strokeWidth={s.strokeWidth || (s.isComparison ? 1.5 : 2.5)}
                strokeDasharray={s.isComparison ? '4 4' : undefined}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: color }}
                isAnimationActive={true}
                animationDuration={350}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
