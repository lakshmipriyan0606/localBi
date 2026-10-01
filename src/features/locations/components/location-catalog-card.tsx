'use client';

import Link from 'next/link';
import { Package, ArrowRight, CheckCircle2, XCircle, Tags } from 'lucide-react';
import { useStoreProducts } from '@/features/catalog/hooks/use-catalog';

interface LocationCatalogCardProps {
  tenantSlug: string;
  storeId: string;
}

export function LocationCatalogCard({ tenantSlug, storeId }: LocationCatalogCardProps) {
  const { data, isLoading } = useStoreProducts(tenantSlug, storeId);

  const summary = data?.summary || {
    totalMapped: data?.mappings?.length || 0,
    availableCount: data?.mappings?.filter((m) => m.isAvailable).length || 0,
    unavailableCount:
      (data?.mappings?.length || 0) -
      (data?.mappings?.filter((m) => m.isAvailable).length || 0),
    categoriesRepresented: new Set(
      data?.mappings?.map((m) => m.product?.category?.id).filter(Boolean)
    ).size,
  };

  return (
    <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-indigo-600" />
          <h3 className="text-sm font-semibold text-slate-900">Store Catalog Summary</h3>
        </div>
        <Link
          href={`/client/${tenantSlug}/catalog`}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
        >
          <span>Manage in Catalog</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {isLoading ? (
        <div className="py-4 text-center text-xs text-slate-400">Loading catalog summary...</div>
      ) : (
        <div className="grid grid-cols-4 gap-4 text-center py-2">
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="text-xl font-bold text-slate-900">{summary.totalMapped}</div>
            <div className="text-xs text-slate-500 mt-0.5">Total Products</div>
          </div>

          <div className="p-3 bg-emerald-50 rounded-lg">
            <div className="text-xl font-bold text-emerald-700 flex items-center justify-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              <span>{summary.availableCount}</span>
            </div>
            <div className="text-xs text-emerald-600 mt-0.5">Available for Sale</div>
          </div>

          <div className="p-3 bg-amber-50 rounded-lg">
            <div className="text-xl font-bold text-amber-700 flex items-center justify-center gap-1">
              <XCircle className="h-4 w-4" />
              <span>{summary.unavailableCount}</span>
            </div>
            <div className="text-xs text-amber-600 mt-0.5">Unavailable</div>
          </div>

          <div className="p-3 bg-indigo-50 rounded-lg">
            <div className="text-xl font-bold text-indigo-700 flex items-center justify-center gap-1">
              <Tags className="h-4 w-4" />
              <span>{summary.categoriesRepresented}</span>
            </div>
            <div className="text-xs text-indigo-600 mt-0.5">Categories</div>
          </div>
        </div>
      )}
    </div>
  );
}
