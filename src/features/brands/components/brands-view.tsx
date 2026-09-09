'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { BrandTable } from './brand-table';
import { BrandCreateDialog } from './brand-create-dialog';
import { useBrandsQuery } from '../hooks/use-brands';
import { Input } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/error-state';

interface BrandsViewProps {
  tenantSlug: string;
}

export function BrandsView({ tenantSlug }: BrandsViewProps) {
  const [search, setSearch] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);

  const { data, isLoading, isError, error, refetch } = useBrandsQuery(tenantSlug, {
    search: search || undefined,
    includeArchived: includeArchived || undefined,
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Brand Administration
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage client brand identities and configure tenant-scoped brand access.
          </p>
        </div>

        <BrandCreateDialog tenantSlug={tenantSlug} />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            type="text"
            placeholder="Search brands by name or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
            aria-label="Search brands"
          />
        </div>

        <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span>Include archived brands</span>
        </label>
      </div>

      {/* Table / Error Display */}
      {isError ? (
        <ErrorState
          title="Failed to load brands"
          message={error?.message || 'An error occurred while loading brand records.'}
          onRetry={() => refetch()}
        />
      ) : (
        <BrandTable
          tenantSlug={tenantSlug}
          brands={data?.items}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
