'use client';

import * as React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { StandardChartTooltip } from './chart-tooltip';
import { AnalyticsFormatters } from '@/shared/analytics/formatters';

export interface HorizontalBarItem {
  label: string;
  value: number;
  secondaryValue?: number | string | undefined;
  color?: string | undefined;
}

export interface HorizontalBarChartProps {
  data: HorizontalBarItem[];
  height?: number | string | undefined;
  valueFormatter?: ((val: number) => string) | undefined;
  barColor?: string | undefined;
  maxLabelLength?: number | undefined;
  className?: string | undefined;
}

export function HorizontalBarChart({
  data,
  height = '100%',
  valueFormatter = (v) => AnalyticsFormatters.number(v),
  barColor = '#4338CA',
  maxLabelLength = 24,
  className,
}: HorizontalBarChartProps) {
  const chartData = React.useMemo(() => {
    return data.map((item) => {
      const truncatedLabel =
        item.label.length > maxLabelLength
          ? `${item.label.slice(0, maxLabelLength)}...`
          : item.label;

      return {
        ...item,
        shortLabel: truncatedLabel,
      };
    });
  }, [data, maxLabelLength]);

  return (
    <div className={className} style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
        >
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#64748B', fontSize: 11 }}
            tickFormatter={(v) => AnalyticsFormatters.compact(v)}
          />
          <YAxis
            type="category"
            dataKey="shortLabel"
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#334155', fontSize: 11, fontWeight: 500 }}
            width={120}
          />
          <Tooltip
            content={
              <StandardChartTooltip
                labelFormatter={(lbl) => {
                  const match = data.find((d) => d.label.startsWith(String(lbl).replace('...', '')));
                  return match ? match.label : String(lbl);
                }}
                valueFormatter={(val) => valueFormatter(Number(val))}
              />
            }
          />
          <Bar
            dataKey="value"
            name="Total"
            fill={barColor}
            radius={[0, 4, 4, 0]}
            isAnimationActive={true}
            animationDuration={350}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
