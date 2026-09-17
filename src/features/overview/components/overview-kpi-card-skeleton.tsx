import { cn } from '@/lib/cn';

interface OverviewKpiCardSkeletonProps {
  className?: string | undefined;
}

export function OverviewKpiCardSkeleton({ className }: OverviewKpiCardSkeletonProps) {
  return (
    <div
      className={cn(
        'p-4 bg-white border border-slate-200/90 rounded-xl shadow-2xs block transition-all',
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="h-4 w-16 rounded skeleton-shimmer" />
        <div className="h-3.5 w-3.5 rounded-full skeleton-shimmer" />
      </div>
      <div className="h-7 w-20 rounded-lg skeleton-shimmer my-1.5" />
      <div className="h-3 w-24 rounded-md skeleton-shimmer mt-2" />
    </div>
  );
}
