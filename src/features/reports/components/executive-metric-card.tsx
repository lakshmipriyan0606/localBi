'use client';

import { ArrowUpRight, ArrowDownRight, Minus, Info } from 'lucide-react';
import { MetricComparisonResult } from '@/modules/reporting/comparison-engine';
import { MetricSource } from '@/modules/reporting/metric-registry';

interface ExecutiveMetricCardProps {
  label: string;
  metric: MetricComparisonResult;
  source: MetricSource;
  unit?: string;
  format?: 'number' | 'percent' | 'rating' | 'position' | 'duration';
  tooltip?: string;
}

const SOURCE_BADGES: Record<MetricSource, { label: string; bg: string; text: string; border: string }> = {
  GA4: { label: 'GA4', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  GSC: { label: 'GSC', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  GBP: { label: 'GBP', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  LOCALBI: { label: 'LocalBi', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  TELEPHONY: { label: 'Telephony', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  MERCHANT: { label: 'Merchant', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  LOCAL_RANK_PROVIDER: { label: 'Rank', bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  DIRECTORY_PROVIDER: { label: 'Directory', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
};

export function ExecutiveMetricCard({
  label,
  metric,
  source,
  unit,
  format = 'number',
  tooltip,
}: ExecutiveMetricCardProps) {
  const badge = SOURCE_BADGES[source] || {
    label: source,
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
  };

  const formatValue = (val: number): string => {
    if (format === 'percent') return `${val}%`;
    if (format === 'rating') return `${val.toFixed(1)} ★`;
    if (format === 'position') return val > 0 ? `#${val.toFixed(1)}` : 'N/A';
    if (format === 'duration') return `${val}m`;
    return val.toLocaleString();
  };

  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs transition-all hover:border-slate-300 hover:shadow-sm">
      {/* Header: Label & Source Badge */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate" title={label}>
          {label}
        </span>
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
        >
          {badge.label}
        </span>
      </div>

      {/* Main Metric Value */}
      <div className="my-2">
        <div className="text-2xl font-extrabold tracking-tight text-slate-900">
          {formatValue(metric.currentValue)}
          {unit && <span className="ml-1 text-sm font-semibold text-slate-500">{unit}</span>}
        </div>
      </div>

      {/* Footer: Comparison Trend & Baseline description */}
      <div className="flex items-center justify-between gap-1 pt-2 border-t border-slate-100 text-xs">
        <div className="flex items-center gap-1 font-medium">
          {metric.trend === 'UP' && (
            <span className="flex items-center text-emerald-600">
              <ArrowUpRight className="h-3.5 w-3.5" />
              {metric.displayFormatted}
            </span>
          )}
          {metric.trend === 'DOWN' && (
            <span className="flex items-center text-rose-600">
              <ArrowDownRight className="h-3.5 w-3.5" />
              {metric.displayFormatted}
            </span>
          )}
          {metric.trend === 'NEUTRAL' && (
            <span className="flex items-center text-slate-500">
              <Minus className="h-3.5 w-3.5" />
              0.0%
            </span>
          )}
          {metric.trend === 'NEW' && (
            <span className="px-1.5 py-0.2 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700">
              New
            </span>
          )}
          {metric.trend === 'UNAVAILABLE' && (
            <span className="text-slate-400">N/A</span>
          )}

          {metric.baselineDescription && (
            <span className="text-slate-400 text-[11px] truncate max-w-[130px]" title={metric.baselineDescription}>
              {metric.baselineDescription}
            </span>
          )}
        </div>

        {tooltip && (
          <span className="text-slate-400 hover:text-slate-600 cursor-help" title={tooltip}>
            <Info className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </div>
  );
}
