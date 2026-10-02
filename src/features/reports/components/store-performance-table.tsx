'use client';

import { useState, useMemo } from 'react';
import { StorePerformanceRow } from '@/modules/reporting/reporting-types';
import { Search, ArrowUpDown, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface StorePerformanceTableProps {
  stores: StorePerformanceRow[];
  tenantSlug: string;
}

export function StorePerformanceTable({ stores, tenantSlug }: StorePerformanceTableProps) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<keyof StorePerformanceRow>('websiteActions');
  const [sortAsc, setSortAsc] = useState(false);

  const filteredStores = useMemo(() => {
    return stores.filter((s) =>
      s.storeName.toLowerCase().includes(search.toLowerCase()) ||
      s.city.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
    });
  }, [stores, search, sortField, sortAsc]);

  const handleSort = (field: keyof StorePerformanceRow) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Store Location Intelligence</h3>
          <p className="text-xs text-slate-500">Cross-module comparison of website actions, calls, rank, and reviews across stores</p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search stores or cities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 py-1.5 pl-9 pr-3 text-xs focus:border-indigo-500 focus:outline-hidden"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-y border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-2.5 px-3 cursor-pointer" onClick={() => handleSort('storeName')}>
                <div className="flex items-center gap-1">Store Location <ArrowUpDown className="h-3 w-3" /></div>
              </th>
              <th className="py-2.5 px-3 cursor-pointer" onClick={() => handleSort('city')}>
                <div className="flex items-center gap-1">City <ArrowUpDown className="h-3 w-3" /></div>
              </th>
              <th className="py-2.5 px-3 text-right cursor-pointer" onClick={() => handleSort('websiteActions')}>
                <div className="flex items-center justify-end gap-1">Website Actions <ArrowUpDown className="h-3 w-3" /></div>
              </th>
              <th className="py-2.5 px-3 text-right cursor-pointer" onClick={() => handleSort('calls')}>
                <div className="flex items-center justify-end gap-1">Tracked Calls <ArrowUpDown className="h-3 w-3" /></div>
              </th>
              <th className="py-2.5 px-3 text-right cursor-pointer" onClick={() => handleSort('leads')}>
                <div className="flex items-center justify-end gap-1">Form Leads <ArrowUpDown className="h-3 w-3" /></div>
              </th>
              <th className="py-2.5 px-3 text-right cursor-pointer" onClick={() => handleSort('rating')}>
                <div className="flex items-center justify-end gap-1">Rating <ArrowUpDown className="h-3 w-3" /></div>
              </th>
              <th className="py-2.5 px-3 text-right cursor-pointer" onClick={() => handleSort('top3Coverage')}>
                <div className="flex items-center justify-end gap-1">Top-3 Rank <ArrowUpDown className="h-3 w-3" /></div>
              </th>
              <th className="py-2.5 px-3 text-center">Listings Health</th>
              <th className="py-2.5 px-3 text-center">Drilldown</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filteredStores.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400">
                  No stores match the active filter criteria.
                </td>
              </tr>
            ) : (
              filteredStores.map((s) => (
                <tr key={s.storeId} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-900">{s.storeName}</td>
                  <td className="py-3 px-3 text-slate-500">{s.city}</td>
                  <td className="py-3 px-3 text-right font-medium">{s.websiteActions.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right font-medium">{s.calls.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right font-medium">{s.leads.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right">
                    {s.rating !== null ? (
                      <span className="font-semibold text-amber-600">
                        {s.rating.toFixed(1)} ★ <span className="text-slate-400 font-normal">({s.reviewsCount})</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    {s.top3Coverage !== null ? (
                      <span className="font-semibold text-emerald-600">{s.top3Coverage}%</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {s.listingIssues > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        {s.listingIssues} Issue{s.listingIssues > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Healthy
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <Link
                      href={`/client/${tenantSlug}/locations`}
                      className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      View <ExternalLink className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
