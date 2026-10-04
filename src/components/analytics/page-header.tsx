'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { FreshnessIndicator } from './freshness-indicator';
import { StatusBadge, type StatusType } from './status-badge';

export interface BreadcrumbItem {
  label: string;
  href?: string | undefined;
  current?: boolean | undefined;
}

export interface AnalyticsPageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode | undefined;
  breadcrumbs?: BreadcrumbItem[] | undefined;
  status?: StatusType | string | undefined;
  statusLabel?: string | undefined;
  freshnessTimestamp?: Date | string | null | undefined;
  primaryAction?: React.ReactNode | undefined;
  secondaryActions?: React.ReactNode | undefined;
  className?: string | undefined;
}

export function AnalyticsPageHeader({
  title,
  description,
  breadcrumbs,
  status,
  statusLabel,
  freshnessTimestamp,
  primaryAction,
  secondaryActions,
  className,
}: AnalyticsPageHeaderProps) {
  return (
    <header className={cn('space-y-3 pb-5 border-b border-slate-200/80', className)}>
      {/* Breadcrumb line */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumbs">
          <ol className="flex items-center gap-1.5 text-xs text-slate-500">
            {breadcrumbs.map((item, index) => {
              const isLast = index === breadcrumbs.length - 1 || item.current;
              return (
                <li key={index} className="flex items-center gap-1.5">
                  {index > 0 && (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" aria-hidden="true" />
                  )}
                  {item.href && !isLast ? (
                    <Link
                      href={item.href}
                      className="hover:text-slate-900 transition-colors font-medium"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span
                      className={cn(
                        'truncate max-w-[200px]',
                        isLast ? 'text-slate-900 font-semibold' : 'text-slate-500'
                      )}
                      aria-current={isLast ? 'page' : undefined}
                    >
                      {item.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      {/* Main Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Title + Status + Description */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-[1.75rem] font-bold tracking-tight text-slate-900 leading-tight">
              {title}
            </h1>
            {status && (
              <StatusBadge status={status} customLabel={statusLabel} />
            )}
            {freshnessTimestamp && (
              <FreshnessIndicator timestamp={freshnessTimestamp} />
            )}
          </div>
          {description && (
            <p className="mt-1.5 text-sm text-slate-500 leading-relaxed max-w-3xl">
              {description}
            </p>
          )}
        </div>

        {/* Action buttons slot */}
        {(primaryAction || secondaryActions) && (
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            {secondaryActions}
            {primaryAction}
          </div>
        )}
      </div>
    </header>
  );
}
