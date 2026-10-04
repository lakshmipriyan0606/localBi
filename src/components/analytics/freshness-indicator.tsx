'use client';

import React from 'react';
import { AnalyticsFormatters } from '@/shared/analytics/formatters';

export interface FreshnessIndicatorProps {
  timestamp?: Date | string | null | undefined;
  status?: 'SYNCED' | 'DELAYED' | 'STALE' | 'SYNCING';
  className?: string;
  showExactInTooltip?: boolean;
}

export function FreshnessIndicator({
  timestamp,
  status = 'SYNCED',
  className = '',
  showExactInTooltip = true,
}: FreshnessIndicatorProps) {
  const relativeText = AnalyticsFormatters.relativeFreshness(timestamp);
  const exactIso = timestamp ? new Date(timestamp).toUTCString() : 'N/A';

  const dotColor =
    status === 'SYNCING'
      ? 'bg-blue-500 animate-pulse'
      : status === 'STALE'
      ? 'bg-amber-500'
      : status === 'DELAYED'
      ? 'bg-rose-500'
      : 'bg-emerald-500';

  const tooltip = showExactInTooltip
    ? `Last synchronized: ${exactIso} (Status: ${status})`
    : undefined;

  return (
    <div
      className={`inline-flex items-center gap-1.5 text-xs text-slate-500 ${className}`}
      title={tooltip}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} aria-hidden="true" />
      <span>{relativeText}</span>
    </div>
  );
}
