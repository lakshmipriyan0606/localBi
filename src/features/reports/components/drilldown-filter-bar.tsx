'use client';

import { Search, Tag, MapPin } from 'lucide-react';
import { NiceSelect } from '@/components/ui/nice-select';
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
        <NiceSelect
          label="BRAND"
          icon={<Tag className="w-3.5 h-3.5" />}
          options={brands.map((b) => ({ id: b.id, name: b.name }))}
          value={selectedBrandId}
          onChange={onBrandChange}
          className="w-auto min-w-[140px]"
        />

        {/* Location Selector */}
        {brandLocations.length > 0 && onLocationChange && (
          <NiceSelect
            label="LOCATION"
            icon={<MapPin className="w-3.5 h-3.5" />}
            options={[
              { id: "", name: `All Locations (${brandLocations.length})` },
              ...brandLocations.map((l) => ({
                id: l.id,
                name: `${l.name}${l.city ? ` (${l.city})` : ''}`
              }))
            ]}
            value={selectedLocationId || ''}
            onChange={onLocationChange}
            className="w-auto min-w-[160px]"
          />
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
