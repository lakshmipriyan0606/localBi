'use client';

import * as React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { StandardChartTooltip } from './chart-tooltip';
import { AnalyticsFormatters } from '@/shared/analytics/formatters';

export interface AreaSeriesConfig {
  key: string;
  name: string;
  color?: string | undefined;
  fillOpacity?: number | undefined;
}

export interface AreaTrendChartProps {
  data: Array<Record<string, unknown>>;
  series: AreaSeriesConfig[];
  xAxisKey?: string | undefined;
  height?: number | string | undefined;
  timezone?: string | undefined;
  yAxisFormatter?: ((value: number) => string) | undefined;
  tooltipValueFormatter?: ((value: number | string, name?: string) => string) | undefined;
  showLegend?: boolean | undefined;
  className?: string | undefined;
}

const DEFAULT_AREA_COLORS = ['#4338CA', '#0F766E', '#7C3AED'];

export function AreaTrendChart({
  data,
  series,
  xAxisKey = 'date',
  height = '100%',
  timezone,
  yAxisFormatter = (v) => AnalyticsFormatters.compact(v),
  tooltipValueFormatter,
  showLegend = false,
  className,
}: AreaTrendChartProps) {
  return (
    <div className={className} style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
          <defs>
            {series.map((s, index) => {
              const color = s.color || DEFAULT_AREA_COLORS[index % DEFAULT_AREA_COLORS.length];
              const gradientId = `area-gradient-${s.key}`;
              return (
                <linearGradient key={gradientId} id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={s.fillOpacity || 0.25} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.01} />
                </linearGradient>
              );
            })}
          </defs>
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
            const color = s.color || DEFAULT_AREA_COLORS[index % DEFAULT_AREA_COLORS.length];
            const gradientId = `area-gradient-${s.key}`;
            return (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={color}
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#${gradientId})`}
                isAnimationActive={true}
                animationDuration={350}
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
