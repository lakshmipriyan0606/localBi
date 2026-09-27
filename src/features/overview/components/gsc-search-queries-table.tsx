'use client';

import Link from 'next/link';
import { Search, ArrowRight } from 'lucide-react';
import type { OverviewGscQueryItem } from '@/modules/overview/overview-service';

interface GscSearchQueriesTableProps {
  tenantSlug: string;
  queries?: OverviewGscQueryItem[] | undefined;
}

export function GscSearchQueriesTable({ tenantSlug, queries = [] }: GscSearchQueriesTableProps) {
  return (
    <div className="bg-gradient-to-br from-[#FAFAFF] to-[#F5F5FA] rounded-2xl border border-indigo-100 p-4 sm:p-5 shadow-sm transition-all duration-300 hover:shadow-md flex flex-col justify-between h-full relative overflow-hidden">
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
            <Search className="w-4 h-4 drop-shadow-sm" />
          </div>
          <h3 className="text-[15px] font-bold text-slate-900 tracking-tight">
            Top Search Queries
          </h3>
        </div>

        <Link
          href={`/client/${tenantSlug}/reports/gsc/queries`}
          className="inline-flex items-center gap-1.5 text-[12px] font-bold text-indigo-700 hover:text-indigo-800 transition-colors group/link px-3 py-1.5 rounded-lg hover:bg-indigo-50/70"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-0.5" />
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-1 flex-1 relative z-10">
        {queries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-slate-500 text-[12px] bg-white/50 rounded-xl border border-dashed border-indigo-200 mx-1">
            <Search className="w-6 h-6 stroke-1 text-indigo-300 mb-2" />
            <span>No search keywords recorded yet</span>
          </div>
        ) : (
          <table className="w-full text-[12px] text-left border-separate border-spacing-y-1">
            <thead>
              <tr className="text-[10px] uppercase font-bold text-indigo-400/80 tracking-wider">
                <th className="pb-2 px-3 font-bold w-10">#</th>
                <th className="pb-2 px-2 font-bold">Query</th>
                <th className="pb-2 px-2 font-bold text-right">Clicks</th>
                <th className="pb-2 px-2 font-bold text-right">Impressions</th>
                <th className="pb-2 px-2 font-bold text-right">CTR</th>
                <th className="pb-2 px-3 font-bold text-right">Position</th>
              </tr>
            </thead>
            <tbody>
              {queries.map((row, idx) => {
                const isTopRank = Number(row.position) < 3.0;
                return (
                  <tr key={`${row.query}-${idx}`} className="group hover:bg-white transition-all bg-white/60 shadow-xs border border-transparent hover:border-indigo-100 rounded-xl overflow-hidden">
                    <td className="py-2.5 px-3 text-slate-400 font-medium rounded-l-lg">{idx + 1}</td>
                    <td className="py-2.5 px-2">
                      <span className="font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">
                        {row.query}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right font-semibold text-slate-700 tabular-nums">
                      {row.clicks.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-right font-medium text-slate-600 tabular-nums">
                      {row.impressions.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-right font-medium text-slate-600 tabular-nums">
                      {row.ctr}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-bold rounded-r-lg">
                      <span className={isTopRank ? 'text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md' : 'text-slate-700'}>
                        {row.position}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
