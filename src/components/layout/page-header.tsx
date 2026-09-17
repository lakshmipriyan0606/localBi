import * as React from 'react';
import { cn } from '@/lib/cn';

interface PageHeaderProps {
  /** Primary page title — renders as h1 */
  title: React.ReactNode;
  /** Supporting description text */
  description?: React.ReactNode;
  /** Optional badge or status indicator beside the title */
  badge?: React.ReactNode;
  /** Actions rendered in the top-right: buttons, filter controls */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Consistent page-level header used across all feature pages.
 * Handles responsive layout: stacks on mobile, aligns on desktop.
 */
export function PageHeader({
  title,
  description,
  badge,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between',
        className
      )}
    >
      {/* Left: title + description */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.75rem] leading-tight">
            {title}
          </h1>
          {badge && <div className="flex items-center">{badge}</div>}
        </div>
        {description && (
          <p className="mt-1.5 text-sm text-slate-500 leading-relaxed max-w-2xl">
            {description}
          </p>
        )}
      </div>

      {/* Right: action slot */}
      {actions && (
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
