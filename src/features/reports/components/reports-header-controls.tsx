'use client';

import { RefreshCw } from 'lucide-react';

export interface HeaderControlProps {
  brands: Array<{ id: string; name: string }>;
  selectedBrandId: string;
  onBrandChange: (id: string) => void;
  brandLocations: Array<{ id: string; name: string; storeCode: string | null }>;
  selectedLocationId: string;
  onLocationChange: (id: string) => void;
  dateRangeDays: number;
  onDateRangeChange: (days: any) => void;
  isFetching?: boolean;
}

export function ReportsHeaderControls({
  brands,
  selectedBrandId,
  onBrandChange,
  brandLocations,
  selectedLocationId,
  onLocationChange,
  dateRangeDays,
  onDateRangeChange,
  isFetching,
}: HeaderControlProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Brand selector */}
      <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-2xs">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Brand</span>
        <select
          id="report-brand-selector"
          value={selectedBrandId}
          onChange={(e) => onBrandChange(e.target.value)}
          className="text-xs font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
          aria-label="Select brand"
        >
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* Location selector */}
      <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-2xs">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Location</span>
        <select
          id="report-location-selector"
          value={selectedLocationId}
          onChange={(e) => onLocationChange(e.target.value)}
          className="text-xs font-medium text-slate-800 bg-transparent focus:outline-none cursor-pointer max-w-[160px]"
          aria-label="Filter by location"
        >
          <option value="">All ({brandLocations.length})</option>
          {brandLocations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
              {l.storeCode ? ` (${l.storeCode})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Date range days toggle */}
      <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1" role="group">
        {([7, 30, 90] as const).map((days) => (
          <button
            key={days}
            type="button"
            onClick={() => onDateRangeChange(days)}
            className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
              dateRangeDays === days ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {days}d
          </button>
        ))}
      </div>

      {isFetching && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-[11px] font-semibold text-indigo-700 animate-pulse">
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span>Syncing telemetry...</span>
        </div>
      )}
    </div>
  );
}
