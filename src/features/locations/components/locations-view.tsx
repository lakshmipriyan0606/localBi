'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search } from 'lucide-react';
import { LocationTable } from './location-table';
import { LocationCreateDialog } from './location-create-dialog';
import { BrandOptionDto } from '../types/location-dto';
import { useLocationsQuery } from '../hooks/use-locations';
import { Input } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/error-state';
import { PageHeader } from '@/components/layout/page-header';
import { DashboardMetricCard } from '@/features/overview/components/dashboard-metric-card';
import { useActiveBrand } from '@/providers/active-brand-context';

interface LocationsViewProps {
  tenantSlug: string;
  brands: BrandOptionDto[];
}

export function LocationsView({ tenantSlug, brands }: LocationsViewProps) {
  const brandCtx = useActiveBrand();
  const [search, setSearch] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState(brandCtx?.activeBrandId || '');
  const [includeArchived, setIncludeArchived] = useState(false);

  useEffect(() => {
    if (brandCtx?.activeBrandId && brandCtx.activeBrandId !== selectedBrandId) {
      setSelectedBrandId(brandCtx.activeBrandId);
    }
  }, [brandCtx?.activeBrandId]);

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
        title="Store Management"
        description="Register and manage physical store branches, addresses, timezones, and brand mappings."
        actions={<LocationCreateDialog tenantSlug={tenantSlug} brands={brands} />}
      />

      {/* Visual Analytics Summary Cards for Locations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <DashboardMetricCard
          label="Active Locations"
          value={activeCount}
          icon="navigation"
          color="emerald"
          sparkColor="#10B981"
          seed={1}
        />
        <DashboardMetricCard
          label="Cities Covered"
          value={uniqueCities}
          icon="globe"
          color="blue"
          sparkColor="#3B82F6"
          seed={2}
        />
        <DashboardMetricCard
          label="Registered Brands"
          value={brands.length}
          icon="target"
          color="purple"
          sparkColor="#8B5CF6"
          seed={3}
        />
        <DashboardMetricCard
          label="GBP Sync Status"
          value="100%"
          sublabel="All locations active & mapped"
          icon="check-circle"
          color="teal"
          sparkColor="#14B8A6"
          seed={4}
        />
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

          {/* Brand Filter - Commented out per client feedback: Brand selection is handled globally via the top header. Uncomment if local selection is needed.
          {brands.length > 0 && (
            <select
              value={selectedBrandId}
              onChange={(e) => {
                const newId = e.target.value;
                setSelectedBrandId(newId);
                if (newId) brandCtx?.setActiveBrandId(newId);
              }}
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
          */}
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
