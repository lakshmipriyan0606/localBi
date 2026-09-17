'use client';

import Link from 'next/link';
import { Store, Layers, SearchCode, MapPin, TrendingUp, Search, FileText, Globe, MonitorSmartphone } from 'lucide-react';

interface ReportsSubNavProps {
  activeSource: 'gbp' | 'gsc';
  tenantSlug: string;
  selectedBrandId: string;
  dateRangeDays: number;
}

export function ReportsSubNav({
  activeSource,
  tenantSlug,
  selectedBrandId,
  dateRangeDays,
}: ReportsSubNavProps) {
  if (activeSource === 'gbp') {
    return (
      <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-slate-100/90 rounded-xl border border-slate-200 text-xs font-semibold">
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-teal-800 shadow-2xs border border-teal-200/80 font-bold">
          <Store className="h-3.5 w-3.5 text-teal-600" />
          <span>Performance Hub</span>
        </span>
        <Link
          href={`/t/${tenantSlug}/reports/gbp/locations?days=${dateRangeDays}&brandId=${selectedBrandId}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-colors whitespace-nowrap"
        >
          <Layers className="h-3.5 w-3.5 text-slate-400" />
          <span>Location Matrix</span>
        </Link>
        <Link
          href={`/t/${tenantSlug}/reports/gbp/search-terms?brandId=${selectedBrandId}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-colors whitespace-nowrap"
        >
          <SearchCode className="h-3.5 w-3.5 text-slate-400" />
          <span>Monthly Search Terms</span>
        </Link>
        <Link
          href={`/t/${tenantSlug}/locations`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-colors whitespace-nowrap"
        >
          <MapPin className="h-3.5 w-3.5 text-slate-400" />
          <span>Storefront Directory</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-slate-100/90 rounded-xl border border-slate-200 text-xs font-semibold">
      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-indigo-800 shadow-2xs border border-indigo-200/80 font-bold">
        <TrendingUp className="h-3.5 w-3.5 text-indigo-600" />
        <span>Search Performance</span>
      </span>
      <Link
        href={`/t/${tenantSlug}/reports/gsc/queries?days=${dateRangeDays}&brandId=${selectedBrandId}`}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-colors whitespace-nowrap"
      >
        <Search className="h-3.5 w-3.5 text-slate-400" />
        <span>Search Queries</span>
      </Link>
      <Link
        href={`/t/${tenantSlug}/reports/gsc/pages?days=${dateRangeDays}&brandId=${selectedBrandId}`}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-colors whitespace-nowrap"
      >
        <FileText className="h-3.5 w-3.5 text-slate-400" />
        <span>Landing Pages</span>
      </Link>
      <Link
        href={`/t/${tenantSlug}/reports/gsc/countries?days=${dateRangeDays}&brandId=${selectedBrandId}`}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-colors whitespace-nowrap"
      >
        <Globe className="h-3.5 w-3.5 text-slate-400" />
        <span>Country Distribution</span>
      </Link>
      <Link
        href={`/t/${tenantSlug}/reports/gsc/devices?days=${dateRangeDays}&brandId=${selectedBrandId}`}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-colors whitespace-nowrap"
      >
        <MonitorSmartphone className="h-3.5 w-3.5 text-slate-400" />
        <span>Device Platforms</span>
      </Link>
    </div>
  );
}
