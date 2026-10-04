'use client';

import React, { useState } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';
import type { DateRangePreset } from '@/shared/analytics/date-range';

export interface DateRangeSelectorProps {
  preset: DateRangePreset;
  startDate?: string | undefined;
  endDate?: string | undefined;
  onPresetChange: (preset: DateRangePreset) => void;
  onCustomChange?: (startDate: string, endDate: string) => void;
  isLoading?: boolean;
  className?: string;
}

const PRESET_BUTTONS: Array<{ preset: DateRangePreset; label: string }> = [
  { preset: 'LAST_7_DAYS', label: '7D' },
  { preset: 'LAST_28_DAYS', label: '28D' },
  { preset: 'LAST_30_DAYS', label: '30D' },
  { preset: 'LAST_90_DAYS', label: '90D' },
];

export function DateRangeSelector({
  preset,
  startDate,
  endDate,
  onPresetChange,
  onCustomChange,
  isLoading = false,
  className = '',
}: DateRangeSelectorProps) {
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [tempStart, setTempStart] = useState(startDate || '');
  const [tempEnd, setTempEnd] = useState(endDate || '');

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempStart && tempEnd && tempStart <= tempEnd) {
      if (onCustomChange) {
        onCustomChange(tempStart, tempEnd);
      } else {
        onPresetChange('CUSTOM');
      }
      setIsCustomOpen(false);
    }
  };

  return (
    <div className={`relative inline-flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-xs ${className}`}>
      {/* Preset Buttons */}
      <div className="flex items-center gap-0.5" role="group" aria-label="Date range presets">
        {PRESET_BUTTONS.map((btn) => {
          const isActive = preset === btn.preset;
          return (
            <button
              key={btn.preset}
              type="button"
              disabled={isLoading}
              onClick={() => onPresetChange(btn.preset)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-50'
              }`}
              aria-pressed={isActive}
            >
              {btn.label}
            </button>
          );
        })}
      </div>

      {/* Custom Button & Dropdown */}
      <div className="relative">
        <button
          type="button"
          disabled={isLoading}
          onClick={() => setIsCustomOpen(!isCustomOpen)}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
            preset === 'CUSTOM'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-50'
          }`}
          aria-expanded={isCustomOpen}
          aria-haspopup="dialog"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Custom</span>
          <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
        </button>

        {isCustomOpen && (
          <div
            className="absolute right-0 top-full mt-1.5 z-50 w-72 bg-white border border-slate-200 rounded-xl shadow-lg p-4 animate-in fade-in zoom-in-95 duration-150"
            role="dialog"
            aria-label="Custom Date Range Picker"
          >
            <form onSubmit={handleApplyCustom} className="space-y-3">
              <div className="text-xs font-semibold text-slate-800">Select Date Window</div>
              <div className="space-y-2">
                <div>
                  <label htmlFor="custom-start-date" className="block text-[11px] font-medium text-slate-500 mb-1">
                    Start Date
                  </label>
                  <input
                    id="custom-start-date"
                    type="date"
                    value={tempStart}
                    onChange={(e) => setTempStart(e.target.value)}
                    max={tempEnd || undefined}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="custom-end-date" className="block text-[11px] font-medium text-slate-500 mb-1">
                    End Date
                  </label>
                  <input
                    id="custom-end-date"
                    type="date"
                    value={tempEnd}
                    onChange={(e) => setTempEnd(e.target.value)}
                    min={tempStart || undefined}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCustomOpen(false)}
                  className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!tempStart || !tempEnd || tempStart > tempEnd}
                  className="flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  Apply
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
