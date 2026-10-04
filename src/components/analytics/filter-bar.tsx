'use client';

import * as React from 'react';
import { X, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/cn';
import { DateRangeSelector } from './date-range-selector';
import { ComparisonSelector } from './comparison-selector';
import type { DateRangePreset } from '@/shared/analytics/date-range';
import type { ComparisonType } from '@/shared/analytics/comparison';

export interface ActiveFilterChip {
  id: string;
  label: string;
  value: string;
  onRemove: () => void;
}

export interface FilterBarProps {
  // Date Controls
  preset?: DateRangePreset | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
  onPresetChange?: ((preset: DateRangePreset) => void) | undefined;
  onCustomDateChange?: ((start: string, end: string) => void) | undefined;

  // Comparison Controls
  comparison?: ComparisonType | undefined;
  onComparisonChange?: ((comp: ComparisonType) => void) | undefined;
  showComparison?: boolean | undefined;

  // Active Chips
  chips?: ActiveFilterChip[] | undefined;
  onClearAllChips?: (() => void) | undefined;

  // Extra controls slot (e.g. Store picker, Brand picker, Custom dropdowns)
  children?: React.ReactNode | undefined;
  
  // Refresh / Busy state
  isBusy?: boolean | undefined;
  className?: string | undefined;
}

export function FilterBar({
  preset,
  startDate,
  endDate,
  onPresetChange,
  onCustomDateChange,
  comparison,
  onComparisonChange,
  showComparison = true,
  chips = [],
  onClearAllChips,
  children,
  isBusy = false,
  className,
}: FilterBarProps) {
  const hasActiveChips = chips.length > 0;

  return (
    <div className={cn('space-y-2.5', className)}>
      {/* Primary Toolbar Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/80">
        {/* Left side: Context selectors (Brand, Location, Source) */}
        <div className="flex flex-wrap items-center gap-2">
          {children}
        </div>

        {/* Right side: Date presets and Comparison */}
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {preset && onPresetChange && (
            <DateRangeSelector
              preset={preset}
              startDate={startDate}
              endDate={endDate}
              onPresetChange={onPresetChange}
              onCustomChange={onCustomDateChange}
              isLoading={isBusy}
            />
          )}

          {showComparison && comparison && onComparisonChange && (
            <ComparisonSelector
              value={comparison}
              onChange={onComparisonChange}
              disabled={isBusy}
            />
          )}
        </div>
      </div>

      {/* Active Filter Chips Row */}
      {hasActiveChips && (
        <div className="flex flex-wrap items-center gap-1.5 px-1 py-0.5">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
            Active Filters:
          </span>

          {chips.map((chip) => (
            <span
              key={chip.id}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white border border-slate-200 text-slate-700 shadow-2xs group"
            >
              <span className="text-slate-400 font-normal">{chip.label}:</span>
              <span className="font-semibold text-slate-800">{chip.value}</span>
              <button
                type="button"
                onClick={chip.onRemove}
                className="ml-0.5 text-slate-400 hover:text-rose-600 rounded-full p-0.5 focus:outline-none focus:ring-1 focus:ring-rose-500"
                aria-label={`Remove filter ${chip.label}: ${chip.value}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {onClearAllChips && chips.length > 1 && (
            <button
              type="button"
              onClick={onClearAllChips}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 ml-1 py-0.5 px-1.5 rounded hover:bg-indigo-50 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear All</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
