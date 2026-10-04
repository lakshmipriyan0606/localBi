'use client';

import * as React from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ChartSkeleton } from '@/components/analytics/analytics-skeletons';
import { ChartEmptyState } from './chart-empty-state';

export interface ChartContainerProps {
  title: string;
  subtitle?: string | undefined;
  badge?: React.ReactNode | undefined;
  actions?: React.ReactNode | undefined;
  isLoading?: boolean | undefined;
  isRefreshing?: boolean | undefined;
  isError?: boolean | undefined;
  errorMessage?: string | undefined;
  isEmpty?: boolean | undefined;
  emptyTitle?: string | undefined;
  emptyMessage?: string | undefined;
  onRetry?: (() => void) | undefined;
  heightClass?: string | undefined;
  className?: string | undefined;
  children: React.ReactNode;
  accessibleSummary?: string | undefined;
}

export function ChartContainer({
  title,
  subtitle,
  badge,
  actions,
  isLoading = false,
  isRefreshing = false,
  isError = false,
  errorMessage,
  isEmpty = false,
  emptyTitle,
  emptyMessage,
  onRetry,
  heightClass = 'h-[320px]',
  className,
  children,
  accessibleSummary,
}: ChartContainerProps) {
  return (
    <div
      role="region"
      aria-label={title}
      className={cn(
        'bg-white rounded-xl border border-slate-200 p-5 shadow-xs transition-all relative flex flex-col justify-between',
        className
      )}
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              {title}
            </h3>
            {badge}
            {isRefreshing && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                <RefreshCw className="w-3 h-3 animate-spin text-indigo-500" />
                <span>Refreshing...</span>
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Screen-reader accessible summary */}
      {accessibleSummary && (
        <div className="sr-only" aria-live="polite">
          {accessibleSummary}
        </div>
      )}

      {/* Content Area */}
      <div className={cn('relative w-full mt-3', heightClass)}>
        {isLoading ? (
          <ChartSkeleton heightClass={heightClass} className="border-0 shadow-none p-0" />
        ) : isError ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center rounded-xl bg-rose-50/50 border border-dashed border-rose-200">
            <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
            <h4 className="text-xs font-bold text-rose-900">Failed to render chart</h4>
            <p className="text-[11px] text-rose-600 mt-1 max-w-sm">
              {errorMessage || 'An error occurred while preparing timeseries visual data.'}
            </p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-3 px-3 py-1 text-xs font-semibold bg-rose-600 text-white rounded-md hover:bg-rose-700"
              >
                Retry
              </button>
            )}
          </div>
        ) : isEmpty ? (
          <ChartEmptyState
            title={emptyTitle || 'No timeseries data'}
            message={emptyMessage || 'No data recorded for this dimension during the chosen window.'}
            heightClass={heightClass}
            className="border-0 bg-transparent"
          />
        ) : (
          <div className={cn('w-full h-full', isRefreshing && 'opacity-70 transition-opacity')}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
