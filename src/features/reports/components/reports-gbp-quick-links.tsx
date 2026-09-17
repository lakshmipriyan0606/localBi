'use client';

import Link from 'next/link';
import { Store, Search, ArrowRight } from 'lucide-react';

interface QuickLinksProps {
  tenantSlug: string;
  selectedBrandId: string;
  dateRangeDays: number;
  brandLocations: Array<{ id: string; name: string; city: string }>;
}

export function ReportsGbpQuickLinks({
  tenantSlug,
  selectedBrandId,
  dateRangeDays,
  brandLocations,
}: QuickLinksProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900">Storefront Locations Matrix</h3>
          </div>
          <Link
            href={`/t/${tenantSlug}/reports/gbp/locations?days=${dateRangeDays}&brandId=${selectedBrandId}`}
            className="text-xs font-semibold text-teal-600 hover:text-teal-800 flex items-center gap-1"
          >
            <span>Open Matrix</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <p className="text-xs text-slate-500">
          Inspect customer interactions across {brandLocations.length} storefront branches.
        </p>
        <div className="divide-y divide-slate-100">
          {brandLocations.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-400">
              No storefront locations registered for this brand yet.
            </div>
          ) : (
            brandLocations.slice(0, 4).map((loc) => (
              <div key={loc.id} className="py-2 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-800">{loc.name}</span>
                <span className="text-slate-400 font-mono">{loc.city}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900">Monthly Search Terms</h3>
          </div>
          <Link
            href={`/t/${tenantSlug}/reports/gbp/search-terms?brandId=${selectedBrandId}`}
            className="text-xs font-semibold text-teal-600 hover:text-teal-800 flex items-center gap-1"
          >
            <span>View Terms</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <p className="text-xs text-slate-500">
          Customer queries directly triggering Google Business Profile impressions on Search and Maps.
        </p>
        <div className="pt-2">
          <Link
            href={`/t/${tenantSlug}/reports/gbp/search-terms?brandId=${selectedBrandId}`}
            className="inline-flex items-center gap-2 text-xs font-semibold text-teal-700 bg-teal-50 px-3 py-2 rounded-lg border border-teal-200 hover:bg-teal-100 transition-colors"
          >
            <span>Open Monthly Search Terms Explorer</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
