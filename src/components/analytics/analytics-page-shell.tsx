'use client';

import * as React from 'react';
import { cn } from '@/lib/cn';
import { AnalyticsPageHeader, type BreadcrumbItem } from './page-header';
import { FilterBar, type ActiveFilterChip } from './filter-bar';
import type { StatusType } from './status-badge';
import type { DateRangePreset } from '@/shared/analytics/date-range';
import type { ComparisonType } from '@/shared/analytics/comparison';

export interface AnalyticsPageShellProps {
  // Page Header Props
  title: React.ReactNode;
  description?: React.ReactNode | undefined;
  breadcrumbs?: BreadcrumbItem[] | undefined;
  status?: StatusType | string | undefined;
  statusLabel?: string | undefined;
  freshnessTimestamp?: Date | string | null | undefined;
  primaryAction?: React.ReactNode | undefined;
  secondaryActions?: React.ReactNode | undefined;

  // Filter Bar Props
  preset?: DateRangePreset | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
  onPresetChange?: ((preset: DateRangePreset) => void) | undefined;
  onCustomDateChange?: ((start: string, end: string) => void) | undefined;
  comparison?: ComparisonType | undefined;
  onComparisonChange?: ((comp: ComparisonType) => void) | undefined;
  showComparison?: boolean | undefined;
  filterChips?: ActiveFilterChip[] | undefined;
  onClearAllChips?: (() => void) | undefined;
  filterControls?: React.ReactNode | undefined;
  isBusy?: boolean | undefined;

  // Sub-header notification or alert banner
  banner?: React.ReactNode | undefined;

  // Children / Sections
  children: React.ReactNode;
  className?: string | undefined;
}

export function AnalyticsPageShell({
  title,
  description,
  breadcrumbs,
  status,
  statusLabel,
  freshnessTimestamp,
  primaryAction,
  secondaryActions,
  preset,
  startDate,
  endDate,
  onPresetChange,
  onCustomDateChange,
  comparison,
  onComparisonChange,
  showComparison = true,
  filterChips,
  onClearAllChips,
  filterControls,
  isBusy = false,
  banner,
  children,
  className,
}: AnalyticsPageShellProps) {
  return (
    <div className={cn('space-y-6 max-w-[1600px] mx-auto pb-12', className)}>
      {/* 1. Header */}
      <AnalyticsPageHeader
        title={title}
        description={description}
        breadcrumbs={breadcrumbs}
        status={status}
        statusLabel={statusLabel}
        freshnessTimestamp={freshnessTimestamp}
        primaryAction={primaryAction}
        secondaryActions={secondaryActions}
      />

      {/* 2. Optional Notification Banner */}
      {banner && <div className="animate-in fade-in duration-200">{banner}</div>}

      {/* 3. Filter Bar (if filters provided) */}
      {(preset || filterControls || filterChips?.length) && (
        <FilterBar
          preset={preset}
          startDate={startDate}
          endDate={endDate}
          onPresetChange={onPresetChange}
          onCustomDateChange={onCustomDateChange}
          comparison={comparison}
          onComparisonChange={onComparisonChange}
          showComparison={showComparison}
          chips={filterChips}
          onClearAllChips={onClearAllChips}
          isBusy={isBusy}
        >
          {filterControls}
        </FilterBar>
      )}

      {/* 4. Page Content / Analytics Sections */}
      <main className="space-y-6">
        {children}
      </main>
    </div>
  );
}
