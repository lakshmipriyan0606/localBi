import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/cn';

interface MetricCardSkeletonProps {
  className?: string | undefined;
}

export function MetricCardSkeleton({ className }: MetricCardSkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-all flex flex-col justify-between',
        className
      )}
    >
      <div>
        {/* Top header row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="h-3.5 w-28 rounded-md skeleton-shimmer" />
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="h-7 w-7 rounded-lg border border-slate-200/60 skeleton-shimmer" />
            <div className="h-4 w-9 rounded-full skeleton-shimmer" />
          </div>
        </div>

        {/* Big number */}
        <div className="h-9 w-24 rounded-lg skeleton-shimmer my-3" />

        {/* Delta comparison */}
        <div className="h-3.5 w-36 rounded-md skeleton-shimmer" />

        {/* Subtext */}
        <div className="h-2.5 w-44 rounded-md skeleton-shimmer mt-2" />
      </div>

      {/* Bottom drilldown bar */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
        <div className="h-3 w-28 rounded-md skeleton-shimmer" />
        <ArrowUpRight className="h-3 w-3 text-slate-200" />
      </div>
    </div>
  );
}
