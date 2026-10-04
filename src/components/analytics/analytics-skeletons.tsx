'use client';

import * as React from 'react';
import { cn } from '@/lib/cn';

export function MetricCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-slate-200 p-5 shadow-xs animate-pulse space-y-3',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="h-3.5 w-24 bg-slate-200 rounded" />
        <div className="h-4 w-12 bg-slate-100 rounded-full" />
      </div>
      <div className="h-8 w-32 bg-slate-200 rounded" />
      <div className="flex items-center gap-2">
        <div className="h-4 w-14 bg-slate-100 rounded" />
        <div className="h-3 w-20 bg-slate-100 rounded" />
      </div>
    </div>
  );
}

export function MetricGridSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {Array.from({ length: count }).map((_, idx) => (
        <MetricCardSkeleton key={idx} />
      ))}
    </div>
  );
}

export function ChartSkeleton({
  heightClass = 'h-[300px]',
  className,
}: {
  heightClass?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'w-full bg-white rounded-xl border border-slate-200 p-5 shadow-xs animate-pulse flex flex-col justify-between',
        heightClass,
        className
      )}
    >
      {/* Chart Header Skeleton */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="space-y-1.5">
          <div className="h-4 w-36 bg-slate-200 rounded" />
          <div className="h-3 w-56 bg-slate-100 rounded" />
        </div>
        <div className="h-6 w-20 bg-slate-100 rounded-md" />
      </div>

      {/* Chart Area Bars or Wave */}
      <div className="flex-1 flex items-end gap-2 pt-6 pb-2 px-2">
        {[35, 55, 40, 70, 60, 85, 45, 90, 65, 80, 50, 75].map((h, i) => (
          <div
            key={i}
            className="flex-1 bg-slate-100 rounded-t"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>

      {/* Chart Axis Skeleton */}
      <div className="flex justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-300">
        <div className="h-2.5 w-12 bg-slate-100 rounded" />
        <div className="h-2.5 w-12 bg-slate-100 rounded" />
        <div className="h-2.5 w-12 bg-slate-100 rounded" />
        <div className="h-2.5 w-12 bg-slate-100 rounded" />
      </div>
    </div>
  );
}

export function TableSkeleton({
  rows = 5,
  cols = 4,
  className,
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'w-full bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden animate-pulse',
        className
      )}
    >
      {/* Table Head */}
      <div className="flex items-center gap-4 bg-slate-50/75 border-b border-slate-200 px-4 py-3">
        {Array.from({ length: cols }).map((_, idx) => (
          <div
            key={idx}
            className={cn(
              'h-3 bg-slate-200 rounded',
              idx === 0 ? 'flex-1' : 'w-24'
            )}
          />
        ))}
      </div>

      {/* Table Rows */}
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="flex items-center gap-4 px-4 py-3.5">
            {Array.from({ length: cols }).map((_, cIdx) => (
              <div
                key={cIdx}
                className={cn(
                  'h-3.5 bg-slate-100 rounded',
                  cIdx === 0 ? 'flex-1 max-w-sm' : 'w-20'
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
