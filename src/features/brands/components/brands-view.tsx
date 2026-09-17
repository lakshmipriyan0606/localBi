'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { BrandTable } from './brand-table';
import { BrandCreateDialog } from './brand-create-dialog';
import { useBrandsQuery } from '../hooks/use-brands';
import { Input } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/error-state';
import { PageHeader } from '@/components/layout/page-header';

interface BrandsViewProps {
  tenantSlug: string;
}

export function BrandsView({ tenantSlug }: BrandsViewProps) {
  const [search, setSearch] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);

  const { data, isLoading, isFetching, isError, error, refetch } = useBrandsQuery(tenantSlug, {
    search: search || undefined,
    includeArchived: includeArchived || undefined,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Brand Administration"
        description="Manage client brand identities and configure tenant-scoped brand access."
        actions={<BrandCreateDialog tenantSlug={tenantSlug} />}
      />

      {/* Filter toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            type="text"
            placeholder="Search brands by name or slug…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
            aria-label="Search brands"
          />
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
          title="Failed to load brands"
          message={error?.message || 'An error occurred while loading brand records.'}
          onRetry={() => refetch()}
        />
      ) : (
        <BrandTable
          tenantSlug={tenantSlug}
          brands={data?.items}
          isLoading={isLoading || isFetching}
        />
      )}
    </div>
  );
}
