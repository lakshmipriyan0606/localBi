'use client';

import * as React from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, Minus, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatDelta } from '@/shared/lib/formatters';

interface MetricCardProps {
  /** Metric label shown above the value */
  label: string;
  /** Formatted string value (e.g. "12,340" or "3.4%") */
  value: string;
  /** Data source label: "GSC" | "GBP" */
  source: 'GSC' | 'GBP';
  /** Raw growth percent number (e.g. 12.5 = +12.5%) — null means no data */
  deltaPercent?: number | null;
  /** Whether a higher delta is favorable for this metric */
  higherIsBetter?: boolean;
  /** Period label for the comparison (e.g. "vs prior 30 days") */
  comparisonLabel?: string;
  /** Secondary info line below the value */
  subtext?: string;
  /** Loading state — shows layout-matched skeleton */
  isLoading?: boolean;
  /** Icon rendered in the accent area */
  icon?: React.ComponentType<{ className?: string }>;
  /** Override accent color classes */
  iconClass?: string;
  /** Target link destination for analytics drilldown */
  href?: string;
  className?: string;
}

const SOURCE_COLORS: Record<'GSC' | 'GBP', string> = {
  GSC: 'bg-indigo-50 text-indigo-600 border-indigo-200/60',
  GBP: 'bg-teal-50 text-teal-700 border-teal-200/60',
};

/**
 * Analytics KPI card with source attribution, directional delta and loading skeleton.
 * Delta direction is sign-aware: never shows TrendingUp when delta is negative.
 * Handles null/undefined values distinctly from zero.
 */
export function MetricCard({
  label,
  value,
  source,
  deltaPercent,
  higherIsBetter = true,
  comparisonLabel,
  subtext,
  isLoading = false,
  icon: Icon,
  iconClass,
  href,
  className,
}: MetricCardProps) {
  const delta = deltaPercent != null ? formatDelta(deltaPercent, higherIsBetter) : null;

  const content = (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all relative group',
        href && 'hover:border-indigo-300 hover:shadow-md cursor-pointer',
        className
      )}
    >
      {/* ── Header row: label + source badge ── */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 leading-tight">
          {label}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {Icon && (
            <div
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-lg border',
                iconClass || SOURCE_COLORS[source]
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </div>
          )}
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-bold tracking-wide',
              SOURCE_COLORS[source]
            )}
          >
            {source}
          </span>
        </div>
      </div>

      {/* ── Primary value ── */}
      {isLoading ? (
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <div className="h-7 w-20 bg-slate-200/80 rounded animate-pulse" />
            <div className="h-3 w-10 bg-slate-100 rounded animate-pulse" />
          </div>
          <div className="flex items-end gap-1 h-3.5 pt-1">
            {[40, 75, 50, 90, 65, 85].map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-gradient-to-t from-indigo-500/60 to-teal-400/80 rounded-t-xs animate-bounce"
                style={{ height: `${h}%`, animationDelay: `${i * 100}ms`, animationDuration: '1.2s' }}
              />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="tabular text-[2rem] font-bold tracking-tight text-slate-900 leading-none mb-1.5">
            {value}
          </div>

          {/* ── Delta + comparison label ── */}
          {delta && !delta.isZero && (
            <div
              className={cn(
                'flex items-center gap-1 text-[11px] font-semibold',
                delta.isFavorable ? 'text-emerald-700' : 'text-red-700'
              )}
            >
              {delta.isPositive ? (
                <TrendingUp className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
              ) : (
                <TrendingDown className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
              )}
              <span>{delta.text}</span>
              {comparisonLabel && (
                <span className="text-slate-400 font-normal">{comparisonLabel}</span>
              )}
            </div>
          )}
          {delta?.isZero && (
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
              <Minus className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
              <span>No change</span>
              {comparisonLabel && (
                <span className="text-slate-400 font-normal">{comparisonLabel}</span>
              )}
            </div>
          )}
          {!delta && comparisonLabel && (
            <div className="text-[11px] text-slate-400">{comparisonLabel}</div>
          )}

          {/* ── Subtext ── */}
          {subtext && (
            <p className="mt-1.5 text-[11px] text-slate-500 leading-relaxed">{subtext}</p>
          )}

          {/* Drilldown affordance */}
          {href && (
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-indigo-600 group-hover:text-indigo-800 transition-colors">
              <span>Inspect deep drilldown</span>
              <ArrowUpRight className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          )}
        </>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl">
        {content}
      </Link>
    );
  }

  return content;
}

/** Compact variant used for secondary action-intent metrics */
export function ActionMetricCard({
  label,
  value,
  description,
  isLoading = false,
  icon: Icon,
  iconBg = 'bg-slate-100',
  iconColor = 'text-slate-600',
  href,
}: {
  label: string;
  value: string;
  description: string;
  isLoading?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  iconBg?: string;
  iconColor?: string;
  href?: string;
}) {
  const content = (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-slate-50/50 p-4 flex items-center justify-between gap-4 transition-all group',
        href && 'hover:bg-white hover:border-teal-300 hover:shadow-sm cursor-pointer'
      )}
    >
      <div className="flex items-center gap-4 min-w-0">
        {Icon && (
          <div
            className={cn(
              'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl',
              iconBg
            )}
          >
            <Icon className={cn('h-5 w-5', iconColor)} />
          </div>
        )}
        <div className="min-w-0">
          {isLoading ? (
            <div className="space-y-1.5">
              <div className="h-5 w-16 bg-slate-200/80 rounded animate-pulse" />
              <div className="flex items-end gap-1 h-3 w-24 pt-0.5">
                {[30, 80, 55, 95, 70].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-gradient-to-t from-teal-500/60 to-blue-400/80 rounded-t-xs animate-bounce"
                    style={{ height: `${h}%`, animationDelay: `${i * 120}ms`, animationDuration: '1s' }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="tabular text-xl font-bold text-slate-900 leading-tight">{value}</div>
              <div className="text-[12px] font-medium text-slate-700 mt-0.5">{label}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{description}</div>
            </>
          )}
        </div>
      </div>
      {href && (
        <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-teal-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all flex-shrink-0" />
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-xl">
        {content}
      </Link>
    );
  }

  return content;
}

