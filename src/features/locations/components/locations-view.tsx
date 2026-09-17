'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { LocationTable } from './location-table';
import { LocationCreateDialog } from './location-create-dialog';
import { BrandOptionDto } from '../types/location-dto';
import { useLocationsQuery } from '../hooks/use-locations';
import { Input } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/error-state';
import { PageHeader } from '@/components/layout/page-header';

interface LocationsViewProps {
  tenantSlug: string;
  brands: BrandOptionDto[];
}

export function LocationsView({ tenantSlug, brands }: LocationsViewProps) {
  const [search, setSearch] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);

  const { data, isLoading, isError, error, refetch } = useLocationsQuery(tenantSlug, {
    search: search || undefined,
    brandId: selectedBrandId || undefined,
    includeArchived: includeArchived || undefined,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Location Directory"
        description="Register store locations with validated ISO country codes and IANA timezones."
        actions={<LocationCreateDialog tenantSlug={tenantSlug} brands={brands} />}
      />

      {/* Filter toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-xl w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search by store code or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
              aria-label="Search locations"
            />
          </div>

          {brands.length > 0 && (
            <select
              value={selectedBrandId}
              onChange={(e) => setSelectedBrandId(e.target.value)}
              aria-label="Filter by brand"
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
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

        <label className="flex items-center gap-2 text-[13px] font-medium text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span>Include archived</span>
        </label>
      </div>

      {isError ? (
        <ErrorState
          title="Failed to load locations"
          message={error?.message || 'An error occurred while loading store locations.'}
          onRetry={() => refetch()}
        />
      ) : (
        <LocationTable
          tenantSlug={tenantSlug}
          locations={data?.items}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
