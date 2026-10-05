'use client';

import * as React from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, Minus, HelpCircle, ArrowUpRight, AlertTriangle, RefreshCw, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { SourceBadge } from './source-badge';
import { FreshnessIndicator } from './freshness-indicator';
import type { MetricSource } from '@/modules/reporting/metric-registry';

export type MetricCardState =
  | 'DATA'
  | 'NO_DATA'
  | 'NOT_CONNECTED'
  | 'REAUTH_REQUIRED'
  | 'STALE'
  | 'SYNCING'
  | 'PARTIAL'
  | 'UPSTREAM_ERROR';

export interface MetricCardProps {
  label?: string | undefined;
  title?: string | undefined;
  value: string | number;
  format?: 'number' | 'compact' | 'percent' | 'duration' | 'currency' | 'position' | 'raw';
  deltaPercent?: number | null | undefined;
  deltaText?: string | undefined;
  description?: string | undefined;
  trend?: 'positive' | 'negative' | 'neutral' | string | undefined;
  comparisonLabel?: string | undefined;
  higherIsBetter?: boolean | undefined;
  source?: MetricSource | string | undefined;
  freshnessTimestamp?: Date | string | null | undefined;
  state?: MetricCardState | undefined;
  errorMessage?: string | undefined;
  tooltip?: string | undefined;
  isLoading?: boolean | undefined;
  isRefreshing?: boolean | undefined;
  sparkline?: React.ReactNode | undefined;
  href?: string | undefined;
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode | undefined;
  onRetry?: (() => void) | undefined;
  className?: string | undefined;
}

export function MetricCard({
  label,
  title,
  value,
  deltaPercent,
  deltaText,
  description,
  trend,
  comparisonLabel,
  higherIsBetter = true,
  source,
  freshnessTimestamp,
  state = 'DATA',
  errorMessage,
  tooltip,
  isLoading = false,
  isRefreshing = false,
  sparkline,
  href,
  icon: Icon,
  onRetry,
  className = '',
}: MetricCardProps) {
  const cardLabel = label || title || '';
  const cardComparison = comparisonLabel || description;
  // Determine trend status
  let trendType: 'positive' | 'negative' | 'neutral' = 'neutral';
  let formattedDelta = deltaText;

  if (deltaPercent !== undefined && deltaPercent !== null) {
    if (deltaPercent > 0) {
      trendType = higherIsBetter ? 'positive' : 'negative';
      if (!formattedDelta) formattedDelta = `+${deltaPercent.toFixed(1)}%`;
    } else if (deltaPercent < 0) {
      trendType = higherIsBetter ? 'negative' : 'positive';
      if (!formattedDelta) formattedDelta = `${deltaPercent.toFixed(1)}%`;
    } else {
      trendType = 'neutral';
      if (!formattedDelta) formattedDelta = '0.0%';
    }
  }

  const renderValueAndStatus = () => {
    if (isLoading) {
      return (
        <div className="space-y-2 py-1">
          <div className="h-8 w-28 bg-slate-200/80 rounded animate-pulse" />
          <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />
        </div>
      );
    }

    switch (state) {
      case 'NOT_CONNECTED':
        return (
          <div className="py-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Not Connected
            </span>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Connect this source in brand integrations.
            </p>
          </div>
        );

      case 'REAUTH_REQUIRED':
        return (
          <div className="py-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
              Re-auth Required
            </span>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Provider token expired.
            </p>
          </div>
        );

      case 'UPSTREAM_ERROR':
        return (
          <div className="py-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                Error
              </span>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold underline"
                >
                  Retry
                </button>
              )}
            </div>
            <p className="text-[11px] text-rose-600 mt-1.5 line-clamp-1">
              {errorMessage || 'Failed to fetch provider metrics.'}
            </p>
          </div>
        );

      case 'SYNCING':
        return (
          <div className="py-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold">
              <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
              Syncing...
            </span>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Data is currently synchronizing.
            </p>
          </div>
        );

      case 'NO_DATA':
        return (
          <div className="py-1">
            <div className="text-2xl font-bold tracking-tight text-slate-400">
              —
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              No activity in selected window
            </p>
          </div>
        );

      case 'DATA':
      case 'PARTIAL':
      case 'STALE':
      default:
        return (
          <>
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
                {value}
              </div>
              {state === 'STALE' && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  Stale
                </span>
              )}
              {state === 'PARTIAL' && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  Partial
                </span>
              )}
            </div>

            {/* Trend & Comparison */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
              {formattedDelta && formattedDelta !== '—' && formattedDelta !== 'N/A' ? (
                <div
                  className={cn(
                    'inline-flex items-center gap-0.5 font-semibold text-[11px] px-1.5 py-0.5 rounded',
                    trendType === 'positive' && 'text-emerald-700 bg-emerald-50',
                    trendType === 'negative' && 'text-rose-700 bg-rose-50',
                    trendType === 'neutral' && 'text-slate-600 bg-slate-100'
                  )}
                >
                  {trendType === 'positive' ? (
                    <TrendingUp className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                  ) : trendType === 'negative' ? (
                    <TrendingDown className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                  ) : (
                    <Minus className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                  )}
                  <span>{formattedDelta}</span>
                </div>
              ) : formattedDelta === 'New' ? (
                <span className="inline-flex items-center text-[11px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                  New
                </span>
              ) : formattedDelta === 'N/A' ? (
                <span className="text-[11px] text-slate-400 font-medium">N/A</span>
              ) : null}

              {cardComparison && (
                <span className="text-[11px] text-slate-500 font-normal truncate max-w-[170px]">
                  {cardComparison}
                </span>
              )}
            </div>
          </>
        );
    }
  };

  const cardContent = (
    <div
      className={cn(
        'relative bg-white rounded-xl border border-slate-200 p-5 shadow-xs transition-all duration-150',
        href && 'hover:border-indigo-300 hover:shadow-md cursor-pointer group',
        isRefreshing && 'opacity-80',
        className
      )}
    >
      {/* Top row: Label, Tooltip, Source, Icon */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
            {cardLabel}
          </span>
          {tooltip && (
            <span
              className="text-slate-400 hover:text-slate-600 cursor-help flex-shrink-0"
              title={tooltip}
              aria-label={tooltip}
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {source && <SourceBadge source={source} size="sm" />}
          {Icon && (
            <div className="p-1 rounded-md bg-slate-50 border border-slate-100 text-slate-500">
              {React.isValidElement(Icon) ? (
                Icon
              ) : typeof Icon === 'function' || (typeof Icon === 'object' && Icon !== null) ? (
                // @ts-expect-error ComponentType invocation
                <Icon className="w-3.5 h-3.5" />
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Main value display */}
      <div className="min-h-[56px] flex flex-col justify-center">
        {renderValueAndStatus()}
      </div>

      {/* Sparkline slot */}
      {sparkline && !isLoading && state === 'DATA' && (
        <div className="mt-3 pt-2 border-t border-slate-100">{sparkline}</div>
      )}

      {/* Footer: Freshness & Drilldown link */}
      {(freshnessTimestamp || href) && (
        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          {freshnessTimestamp ? (
            <FreshnessIndicator timestamp={freshnessTimestamp} />
          ) : (
            <span />
          )}

          {href && (
            <span className="inline-flex items-center gap-0.5 font-semibold text-indigo-600 group-hover:text-indigo-800 transition-colors">
              <span>Drill down</span>
              <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}
