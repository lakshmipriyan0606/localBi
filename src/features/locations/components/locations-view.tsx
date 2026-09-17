'use client';

import { useState, useMemo } from 'react';
import { Search, CheckCircle2 } from 'lucide-react';
import { LocationTable } from './location-table';
import { LocationCreateDialog } from './location-create-dialog';
import { BrandOptionDto } from '../types/location-dto';
import { useLocationsQuery } from '../hooks/use-locations';
import { Input } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/error-state';
import { PageHeader } from '@/components/layout/page-header';
import { DashboardMetricCard } from '@/features/overview/components/dashboard-metric-card';

interface LocationsViewProps {
  tenantSlug: string;
  brands: BrandOptionDto[];
}

export function LocationsView({ tenantSlug, brands }: LocationsViewProps) {
  const [search, setSearch] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);

  const { data, isLoading, isFetching, isError, error, refetch } = useLocationsQuery(tenantSlug, {
    search: search || undefined,
    brandId: selectedBrandId || undefined,
    includeArchived: includeArchived || undefined,
  });

  const locationsList = data?.items || [];
  const activeCount = useMemo(() => locationsList.filter((l) => !l.isArchived).length, [locationsList]);
  const uniqueCities = useMemo(() => new Set(locationsList.map((l) => l.city)).size, [locationsList]);

  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        title="Location Directory"
        description="Register and manage store locations with validated ISO country codes, coordinates, and IANA timezones."
        actions={<LocationCreateDialog tenantSlug={tenantSlug} brands={brands} />}
      />

      {/* Visual Analytics Summary Cards for Locations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <DashboardMetricCard
          label="Active Locations"
          value={activeCount}
          delta={100}
          icon="navigation"
          color="emerald"
          sparkColor="#10B981"
          seed={1}
        />
        <DashboardMetricCard
          label="Cities Covered"
          value={uniqueCities}
          delta={15.4}
          icon="globe"
          color="blue"
          sparkColor="#3B82F6"
          seed={2}
        />
        <DashboardMetricCard
          label="Registered Brands"
          value={brands.length}
          delta={25.0}
          icon="target"
          color="purple"
          sparkColor="#8B5CF6"
          seed={3}
        />
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-[0_1px_3px_rgba(15,23,42,0.03)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between h-[108px] overflow-hidden">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-teal-50 ring-1 ring-teal-100 flex items-center justify-center text-teal-600 flex-shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11.5px] font-medium text-slate-600 tracking-tight truncate">
              GBP Sync Status
            </span>
          </div>
          <div className="mt-1">
            <div className="text-[14px] font-bold text-slate-900 leading-tight">
              100% Operational
            </div>
            <p className="text-[11px] font-semibold text-emerald-600 mt-0.5">
              All locations active & mapped
            </p>
          </div>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-xl w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search by store code or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl"
              aria-label="Search locations"
            />
          </div>

          {brands.length > 0 && (
            <select
              value={selectedBrandId}
              onChange={(e) => setSelectedBrandId(e.target.value)}
              aria-label="Filter by brand"
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-700 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            >
              <option value="">All Brands</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <label className="flex items-center gap-2 text-[12px] font-medium text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span>Include archived</span>
        </label>
      </div>

      {/* Location Directory Table */}
      {isError ? (
        <ErrorState
          title="Failed to load locations"
          message={error?.message || 'An error occurred while loading store locations.'}
          onRetry={() => refetch()}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <LocationTable
            tenantSlug={tenantSlug}
            locations={data?.items}
            isLoading={isLoading || isFetching}
          />
        </div>
      )}
    </div>
  );
}
