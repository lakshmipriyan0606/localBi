'use client';

import * as React from 'react';
import { ArrowDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { AnalyticsFormatters } from '@/shared/analytics/formatters';

export interface FunnelStage {
  name: string;
  count: number;
  color?: string | undefined;
}

export interface FunnelChartProps {
  stages: FunnelStage[];
  className?: string | undefined;
}

const DEFAULT_STAGE_COLORS = [
  'bg-indigo-600',
  'bg-indigo-500',
  'bg-teal-600',
  'bg-teal-500',
  'bg-emerald-600',
];

export function FunnelChart({ stages, className }: FunnelChartProps) {
  const topCount = stages[0]?.count || 1;

  return (
    <div className={cn('space-y-3 py-2', className)}>
      {stages.map((stage, index) => {
        const percentOfTop = topCount > 0 ? (stage.count / topCount) * 100 : 0;
        const prevStage = stages[index - 1];
        const stepConversion =
          prevStage && prevStage.count > 0
            ? (stage.count / prevStage.count) * 100
            : 100;
        const colorClass = stage.color || DEFAULT_STAGE_COLORS[index % DEFAULT_STAGE_COLORS.length];

        return (
          <div key={stage.name} className="space-y-1">
            {/* Stage Info */}
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800">{stage.name}</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 tabular-nums">
                  {AnalyticsFormatters.number(stage.count)}
                </span>
                <span className="text-slate-400 font-medium text-[11px]">
                  ({percentOfTop.toFixed(1)}%)
                </span>
              </div>
            </div>

            {/* Stage Bar */}
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-300', colorClass)}
                style={{ width: `${Math.max(percentOfTop, 1)}%` }}
              />
            </div>

            {/* Dropoff / Conversion rate between stages */}
            {index < stages.length - 1 && (
              <div className="flex items-center gap-1 text-[10px] text-slate-400 pl-2 pt-0.5">
                <ArrowDown className="w-3 h-3 text-slate-400" />
                <span>
                  {stepConversion.toFixed(1)}% conversion to next stage ({(100 - stepConversion).toFixed(1)}% drop-off)
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
