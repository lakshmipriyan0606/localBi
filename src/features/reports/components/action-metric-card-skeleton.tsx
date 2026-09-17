import { ArrowUpRight, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ActionMetricCardSkeletonProps {
  icon?: LucideIcon | undefined;
  iconBg?: string | undefined;
  iconColor?: string | undefined;
  className?: string | undefined;
}

export function ActionMetricCardSkeleton({
  icon: Icon,
  iconBg = 'bg-slate-100/80',
  iconColor = 'text-slate-400/60',
  className,
}: ActionMetricCardSkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-slate-50/50 p-4 flex items-center justify-between gap-4 transition-all',
        className
      )}
    >
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div
          className={cn(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200/60 shadow-2xs',
            iconBg
          )}
        >
          {Icon ? (
            <Icon className={cn('h-5 w-5 animate-pulse', iconColor)} />
          ) : (
            <div className="h-5 w-5 rounded-md skeleton-shimmer" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="h-6 w-20 rounded-md skeleton-shimmer" />
          <div className="h-3.5 w-28 sm:w-32 rounded-md skeleton-shimmer" />
          <div className="h-2.5 w-36 sm:w-44 rounded-md skeleton-shimmer" />
        </div>
      </div>
      <ArrowUpRight className="h-4 w-4 text-slate-200 flex-shrink-0" />
    </div>
  );
}
