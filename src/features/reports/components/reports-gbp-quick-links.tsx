'use client';

import Link from 'next/link';
import { Store, Search, MessageSquare, FileText, ArrowRight } from 'lucide-react';

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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Locations Matrix */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-teal-600" />
              <h3 className="text-sm font-bold text-slate-900">Locations Matrix</h3>
            </div>
            <Link
              href={`/client/${tenantSlug}/reports/gbp/locations?days=${dateRangeDays}&brandId=${selectedBrandId}`}
              className="text-xs font-semibold text-teal-600 hover:text-teal-800 flex items-center gap-1"
            >
              <span>View</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <p className="text-xs text-slate-500">
            Compare customer views, calls, directions, and website clicks across {brandLocations.length} branches.
          </p>
        </div>
        <div className="pt-2 border-t border-slate-100">
          <Link
            href={`/client/${tenantSlug}/reports/gbp/locations?days=${dateRangeDays}&brandId=${selectedBrandId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-1.5 rounded-lg border border-teal-200 hover:bg-teal-100 transition-colors w-full justify-center"
          >
            <span>Open Location Matrix</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* 2. Customer Reviews */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900">Customer Reviews</h3>
            </div>
            <Link
              href={`/client/${tenantSlug}/reports/gbp/reviews?days=${dateRangeDays}&brandId=${selectedBrandId}`}
              className="text-xs font-semibold text-amber-600 hover:text-amber-800 flex items-center gap-1"
            >
              <span>Manage</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <p className="text-xs text-slate-500">
            Monitor incoming customer ratings, filter unanswered feedback, and publish owner replies directly to Google.
          </p>
        </div>
        <div className="pt-2 border-t border-slate-100">
          <Link
            href={`/client/${tenantSlug}/reports/gbp/reviews?days=${dateRangeDays}&brandId=${selectedBrandId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors w-full justify-center"
          >
            <span>Open Review Explorer</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* 3. Posts & Updates */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Posts & Updates</h3>
            </div>
            <Link
              href={`/client/${tenantSlug}/reports/gbp/posts?brandId=${selectedBrandId}`}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>Manage</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <p className="text-xs text-slate-500">
            Publish announcements, promotional offers, and call-to-action buttons to your Google storefronts.
          </p>
        </div>
        <div className="pt-2 border-t border-slate-100">
          <Link
            href={`/client/${tenantSlug}/reports/gbp/posts?brandId=${selectedBrandId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-100 transition-colors w-full justify-center"
          >
            <span>Open Posts Manager</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* 4. Monthly Search Terms */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-teal-600" />
              <h3 className="text-sm font-bold text-slate-900">Search Keywords</h3>
            </div>
            <Link
              href={`/client/${tenantSlug}/reports/gbp/search-terms?brandId=${selectedBrandId}`}
              className="text-xs font-semibold text-teal-600 hover:text-teal-800 flex items-center gap-1"
            >
              <span>Explore</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <p className="text-xs text-slate-500">
            Customer queries directly triggering Google Business Profile impressions on Search and Maps.
          </p>
        </div>
        <div className="pt-2 border-t border-slate-100">
          <Link
            href={`/client/${tenantSlug}/reports/gbp/search-terms?brandId=${selectedBrandId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-1.5 rounded-lg border border-teal-200 hover:bg-teal-100 transition-colors w-full justify-center"
          >
            <span>Open Keyword Explorer</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
