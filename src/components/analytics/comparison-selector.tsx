'use client';

import React from 'react';
import { ArrowLeftRight } from 'lucide-react';
import type { ComparisonType } from '@/shared/analytics/date-range';

export interface ComparisonSelectorProps {
  value: ComparisonType;
  onChange: (type: ComparisonType) => void;
  disabled?: boolean;
  className?: string;
}

export function ComparisonSelector({
  value,
  onChange,
  disabled = false,
  className = '',
}: ComparisonSelectorProps) {
  return (
    <div className={`inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs shadow-xs ${className}`}>
      <ArrowLeftRight className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
      <span className="text-slate-500 font-medium">Compare:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ComparisonType)}
        disabled={disabled}
        aria-label="Comparison period"
        className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1 disabled:opacity-50"
      >
        <option value="PREVIOUS_PERIOD">Previous Period</option>
        <option value="PREVIOUS_YEAR">Previous Year</option>
        <option value="NONE">No comparison</option>
      </select>
    </div>
  );
}
