import React from 'react';
import { Info, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface ChartEmptyStateProps {
  title?: string | undefined;
  message?: string | undefined;
  description?: string | undefined;
  icon?: LucideIcon | undefined;
  className?: string | undefined;
  heightClass?: string | undefined;
  action?: React.ReactNode | undefined;
}

/**
 * Enterprise Empty State for Chart Containers
 *
 * Distinguishes zero/empty data from loading or error states with clear,
 * actionable guidance.
 */
export function ChartEmptyState({
  title = 'No data recorded yet',
  message,
  description,
  icon: Icon = Info,
  className,
  heightClass = 'h-[210px]',
  action,
}: ChartEmptyStateProps) {
  const displayText = description ?? message ?? 'Metrics will appear here once Search Console, Google Business Profile, or tracking events are synced.';

  return (
    <div
      className={cn(
        'w-full rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center p-6 text-center select-none',
        heightClass,
        className
      )}
    >
      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2.5">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs font-semibold text-slate-700">{title}</p>
      {displayText && (
        <p className="text-[11px] text-slate-500 mt-1 max-w-xs leading-relaxed">
          {displayText}
        </p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
