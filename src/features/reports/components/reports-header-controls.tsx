'use client';

import { RefreshCw, Tag, MapPin } from 'lucide-react';
import { NiceSelect } from '@/components/ui/nice-select';

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
  onSync?: () => void;
  isSyncing?: boolean;
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
  onSync,
  isSyncing,
}: HeaderControlProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <NiceSelect
        label="BRAND"
        icon={<Tag className="w-3.5 h-3.5" />}
        options={brands.map(b => ({ id: b.id, name: b.name }))}
        value={selectedBrandId}
        onChange={onBrandChange}
        className="w-auto min-w-[140px]"
      />

      <NiceSelect
        label="LOCATION"
        icon={<MapPin className="w-3.5 h-3.5" />}
        options={[
          { id: "", name: `All (${brandLocations.length})` },
          ...brandLocations.map(l => ({ 
            id: l.id, 
            name: `${l.name}${l.storeCode ? ` (${l.storeCode})` : ''}`
          }))
        ]}
        value={selectedLocationId}
        onChange={onLocationChange}
        className="w-auto min-w-[160px]"
      />

      {/* Date range days toggle */}
      <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1" role="group">
        {([1, 7, 30, 90, 365] as const).map((days) => (
          <button
            key={days}
            type="button"
            onClick={() => onDateRangeChange(days)}
            className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
              dateRangeDays === days ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {days === 1 ? 'Today' : days === 365 ? 'All' : `${days}d`}
          </button>
        ))}
      </div>

      {onSync && (
        <button
          type="button"
          onClick={onSync}
          disabled={isSyncing || isFetching}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          title="Pull latest live metrics directly from Google Search Console API"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isSyncing || isFetching ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : isFetching ? 'Updating...' : 'Sync with Google'}</span>
        </button>
      )}
    </div>
  );
}
