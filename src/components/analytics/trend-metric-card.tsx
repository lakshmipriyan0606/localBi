'use client';

import * as React from 'react';
import { MetricCard, type MetricCardProps } from './metric-card';

export interface TrendMetricCardProps extends Omit<MetricCardProps, 'sparkline'> {
  trendData?: number[] | undefined;
  trendColor?: string | undefined;
}

export function TrendMetricCard({
  trendData,
  trendColor,
  higherIsBetter = true,
  deltaPercent,
  ...props
}: TrendMetricCardProps) {
  // Sparkline generator
  const sparkline = React.useMemo(() => {
    if (!trendData || trendData.length < 2) return null;

    const min = Math.min(...trendData);
    const max = Math.max(...trendData);
    const range = max - min || 1;
    const width = 160;
    const height = 28;
    const padding = 2;

    const points = trendData.map((val, idx) => {
      const x = padding + (idx / (trendData.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((val - min) / range) * (height - 2 * padding);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const isPositive =
      deltaPercent !== undefined && deltaPercent !== null
        ? deltaPercent >= 0
        : trendData[trendData.length - 1] >= trendData[0];

    const strokeColor =
      trendColor ||
      (higherIsBetter
        ? isPositive
          ? 'var(--positive-trend, #10b981)'
          : 'var(--negative-trend, #ef4444)'
        : isPositive
        ? 'var(--negative-trend, #ef4444)'
        : 'var(--positive-trend, #10b981)');

    return (
      <div className="flex items-center justify-between gap-2 pt-1" aria-hidden="true">
        <span className="text-[10px] font-medium text-slate-400">Trend</span>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-28 h-6 overflow-visible"
        >
          <polyline
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points.join(' ')}
          />
        </svg>
      </div>
    );
  }, [trendData, trendColor, higherIsBetter, deltaPercent]);

  return (
    <MetricCard
      {...props}
      deltaPercent={deltaPercent}
      higherIsBetter={higherIsBetter}
      sparkline={sparkline}
    />
  );
}
