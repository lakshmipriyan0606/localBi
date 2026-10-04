'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Inbox,
  AlertTriangle,
  Unplug,
  FilterX,
  RotateCcw,
  PlusCircle,
  LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';

export type AnalyticsEmptyVariant =
  | 'NO_DATA'
  | 'NOT_CONNECTED'
  | 'FILTERED_EMPTY'
  | 'ERROR';

export interface AnalyticsEmptyStateProps {
  variant?: AnalyticsEmptyVariant | undefined;
  title?: string | undefined;
  description?: string | undefined;
  icon?: LucideIcon | undefined;
  actionText?: string | undefined;
  actionHref?: string | undefined;
  onAction?: (() => void) | undefined;
  className?: string | undefined;
}

export function AnalyticsEmptyState({
  variant = 'NO_DATA',
  title,
  description,
  icon,
  actionText,
  actionHref,
  onAction,
  className,
}: AnalyticsEmptyStateProps) {
  // Default configurations based on variant
  let DefaultIcon = Inbox;
  let defaultTitle = 'No data recorded yet';
  let defaultDesc = 'No metrics were recorded for the selected date window and criteria.';
  let defaultAction = actionText;

  switch (variant) {
    case 'NOT_CONNECTED':
      DefaultIcon = Unplug;
      defaultTitle = title || 'Data Source Not Connected';
      defaultDesc =
        description ||
        'Link this provider in brand integrations to activate live reporting and synchronization.';
      defaultAction = actionText || 'Manage Connections';
      break;

    case 'FILTERED_EMPTY':
      DefaultIcon = FilterX;
      defaultTitle = title || 'No Matching Results';
      defaultDesc =
        description ||
        'None of your records match the active filter criteria. Try resetting or broadening your filters.';
      defaultAction = actionText || 'Clear Filters';
      break;

    case 'ERROR':
      DefaultIcon = AlertTriangle;
      defaultTitle = title || 'Unable to Load Analytics';
      defaultDesc =
        description ||
        'An error occurred while fetching metrics from the reporting service. Please try again.';
      defaultAction = actionText || 'Retry Request';
      break;

    case 'NO_DATA':
    default:
      DefaultIcon = Inbox;
      defaultTitle = title || 'No Data Available';
      defaultDesc =
        description ||
        'Data will appear here as soon as synchronized impressions, clicks, or events are logged.';
      break;
  }

  const IconComponent = icon || DefaultIcon;
  const finalTitle = title || defaultTitle;
  const finalDesc = description || defaultDesc;

  return (
    <div
      className={cn(
        'w-full rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 sm:p-12 flex flex-col items-center justify-center text-center select-none animate-in fade-in-50 duration-200',
        className
      )}
    >
      <div
        className={cn(
          'w-12 h-12 rounded-2xl flex items-center justify-center mb-3 shadow-xs',
          variant === 'ERROR'
            ? 'bg-rose-50 text-rose-600 border border-rose-100'
            : variant === 'NOT_CONNECTED'
            ? 'bg-amber-50 text-amber-600 border border-amber-100'
            : variant === 'FILTERED_EMPTY'
            ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
            : 'bg-white text-slate-400 border border-slate-200'
        )}
      >
        <IconComponent className="w-6 h-6" />
      </div>

      <h3 className="text-base font-bold text-slate-900 tracking-tight">
        {finalTitle}
      </h3>
      <p className="text-xs text-slate-500 mt-1 max-w-md leading-relaxed">
        {finalDesc}
      </p>

      {(onAction || actionHref) && (
        <div className="mt-4">
          {actionHref ? (
            <Link
              href={actionHref}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition-colors"
            >
              {variant === 'NOT_CONNECTED' && <PlusCircle className="w-3.5 h-3.5" />}
              <span>{defaultAction}</span>
            </Link>
          ) : (
            <Button
              type="button"
              variant={variant === 'ERROR' ? 'outline' : 'default'}
              size="sm"
              onClick={onAction}
              className="text-xs"
            >
              {variant === 'ERROR' && <RotateCcw className="w-3.5 h-3.5 mr-1" />}
              {variant === 'FILTERED_EMPTY' && <RotateCcw className="w-3.5 h-3.5 mr-1" />}
              {defaultAction}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
