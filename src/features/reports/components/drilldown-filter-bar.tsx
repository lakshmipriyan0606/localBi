'use client';

import { Search, Tag, MapPin } from 'lucide-react';
import { NiceSelect } from '@/components/ui/nice-select';

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
  startDate?: string;
  endDate?: string;
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
}: DrilldownFilterBarProps) {
  const brandLocations = locations.filter((l) => l.brandId === selectedBrandId);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2 bg-white border border-slate-200 rounded-xl shadow-2xs">
      <div className="flex flex-wrap items-center gap-2">
        {/* Brand Selector - Commented out per client feedback: Brand selection is handled globally via the top header. Uncomment if local selection is needed.
        {brands.length > 1 && (
          <NiceSelect
            icon={<Tag className="w-3.5 h-3.5 text-slate-500" />}
            options={brands.map((b) => ({ id: b.id, name: b.name }))}
            value={selectedBrandId}
            onChange={onBrandChange}
            className="w-auto min-w-[130px]"
          />
        )}
        */}

        {/* Location Selector */}
        {brandLocations.length > 0 && onLocationChange && (
          <NiceSelect
            icon={<MapPin className="w-3.5 h-3.5 text-slate-500" />}
            options={[
              { id: "", name: `All Locations (${brandLocations.length})` },
              ...brandLocations.map((l) => ({
                id: l.id,
                name: `${l.name}${l.city ? ` (${l.city})` : ''}`
              }))
            ]}
            value={selectedLocationId || ''}
            onChange={onLocationChange}
            className="w-auto min-w-[150px]"
          />
        )}

        {/* Date Presets */}
        <div className="flex items-center rounded-lg border border-slate-200/80 bg-slate-50 p-0.5">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => onDateRangeChange(days)}
              className={`px-2.5 py-1 text-xs rounded-md transition-all cursor-pointer ${
                dateRangeDays === days
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      {/* Search Filter */}
      <div className="relative min-w-[200px] flex-1 sm:flex-initial">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full text-xs pl-8 pr-7 py-1.5 bg-slate-50/80 border border-slate-200 rounded-lg focus:bg-white focus:ring-1.5 focus:ring-indigo-500/30 focus:border-indigo-500 focus:outline-none transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 text-xs font-bold cursor-pointer"
            title="Clear search"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
