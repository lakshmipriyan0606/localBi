'use client';

import * as React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { StandardChartTooltip } from './chart-tooltip';
import { AnalyticsFormatters } from '@/shared/analytics/formatters';

export interface BarSeriesConfig {
  key: string;
  name: string;
  color?: string | undefined;
  stackId?: string | undefined;
}

export interface BarComparisonChartProps {
  data: Array<Record<string, unknown>>;
  series: BarSeriesConfig[];
  categoryKey: string;
  height?: number | string | undefined;
  yAxisFormatter?: ((value: number) => string) | undefined;
  tooltipValueFormatter?: ((value: number | string, name?: string) => string) | undefined;
  showLegend?: boolean | undefined;
  className?: string | undefined;
}

const DEFAULT_BAR_COLORS = ['#4338CA', '#0F766E', '#F59E0B', '#6366F1'];

export function BarComparisonChart({
  data,
  series,
  categoryKey,
  height = '100%',
  yAxisFormatter = (v) => AnalyticsFormatters.compact(v),
  tooltipValueFormatter,
  showLegend = true,
  className,
}: BarComparisonChartProps) {
  return (
    <div className={className} style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis
            dataKey={categoryKey}
            tickLine={false}
            axisLine={{ stroke: '#E2E8F0' }}
            tick={{ fill: '#64748B', fontSize: 11 }}
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
            content={<StandardChartTooltip valueFormatter={tooltipValueFormatter} />}
          />
          {showLegend && series.length > 1 && (
            <Legend
              verticalAlign="top"
              align="right"
              iconType="square"
              wrapperStyle={{ paddingBottom: 12, fontSize: 11 }}
            />
          )}
          {series.map((s, index) => {
            const color = s.color || DEFAULT_BAR_COLORS[index % DEFAULT_BAR_COLORS.length];
            return (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.name}
                fill={color}
                stackId={s.stackId}
                radius={[4, 4, 0, 0]}
                isAnimationActive={true}
                animationDuration={350}
              />
            );
          })}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
