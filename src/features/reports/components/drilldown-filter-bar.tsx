'use client';

import { Search } from 'lucide-react';
import { formatDateRange } from '@/shared/lib/formatters';

interface DrilldownFilterBarProps {
  brands: Array<{ id: string; name: string; slug: string }>;
  locations: Array<{ id: string; brandId: string; name: string; city: string }>;
  selectedBrandId: string;
  onBrandChange: (brandId: string) => void;
  selectedLocationId?: string | undefined;
  onLocationChange?: ((locationId: string) => void) | undefined;
  dateRangeDays: number;
  onDateRangeChange: (days: number) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string | undefined;
  startDate: string;
  endDate: string;
}

export function DrilldownFilterBar({
  brands,
  locations,
  selectedBrandId,
  onBrandChange,
  selectedLocationId,
  onLocationChange,
  dateRangeDays,
  onDateRangeChange,
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Filter results...',
  startDate,
  endDate,
}: DrilldownFilterBarProps) {
  const brandLocations = locations.filter((l) => l.brandId === selectedBrandId);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
      <div className="flex flex-wrap items-center gap-3">
        {/* Brand Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Brand:</span>
          <select
            value={selectedBrandId}
            onChange={(e) => onBrandChange(e.target.value)}
            className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Location Selector */}
        {brandLocations.length > 0 && onLocationChange && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Location:</span>
            <select
              value={selectedLocationId || ''}
              onChange={(e) => onLocationChange(e.target.value)}
              className="text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">All Locations ({brandLocations.length})</option>
              {brandLocations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} {l.city ? `(${l.city})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Date Presets */}
        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => onDateRangeChange(days)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                dateRangeDays === days
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {days}d
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-400">{formatDateRange(startDate, endDate)}</span>
      </div>

      {/* Search Filter */}
      <div className="relative min-w-[220px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors"
        />
      </div>
    </div>
  );
}
