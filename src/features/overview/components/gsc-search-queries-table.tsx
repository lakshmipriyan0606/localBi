'use client';

import Link from 'next/link';
import { Search, ArrowRight } from 'lucide-react';
import { GSC_TOP_QUERIES } from './dashboard-mock-data';

interface GscSearchQueriesTableProps {
  tenantSlug: string;
}

export function GscSearchQueriesTable({ tenantSlug }: GscSearchQueriesTableProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-indigo-600" />
          <h3 className="text-[13.5px] font-bold text-slate-900 tracking-tight">
            Top Search Queries
          </h3>
        </div>

        <Link
          href={`/t/${tenantSlug}/reports/gsc/queries`}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <span>View All Queries</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-1 flex-1">
        <table className="w-full text-[11.5px] text-left">
          <thead>
            <tr className="border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400">
              <th className="pb-2 font-bold w-6 pl-1">#</th>
              <th className="pb-2 font-bold">Query</th>
              <th className="pb-2 font-bold text-right">Clicks</th>
              <th className="pb-2 font-bold text-right">Impressions</th>
              <th className="pb-2 font-bold text-right">CTR</th>
              <th className="pb-2 font-bold text-right pr-1">Position</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {GSC_TOP_QUERIES.map((row, idx) => {
              const isTopRank = parseFloat(row.position) < 3.0;
              const isBlueLink = idx >= 3;
              return (
                <tr key={row.query} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2 text-slate-400 font-medium pl-1">{idx + 1}</td>
                  <td className="py-2">
                    <span
                      className={`font-medium ${
                        isBlueLink
                          ? 'text-indigo-600 hover:underline cursor-pointer'
                          : 'text-slate-800'
                      }`}
                    >
                      {row.query}
                    </span>
                  </td>
                  <td className="py-2 text-right font-medium text-slate-700 tabular-nums">
                    {row.clicks.toLocaleString()}
                  </td>
                  <td className="py-2 text-right font-medium text-slate-600 tabular-nums">
                    {row.impressions.toLocaleString()}
                  </td>
                  <td className="py-2 text-right font-medium text-slate-700 tabular-nums">
                    {row.ctr}
                  </td>
                  <td className="py-2 text-right pr-1 tabular-nums font-semibold">
                    <span
                      className={isTopRank ? 'text-emerald-600' : 'text-slate-700'}
                    >
                      {row.position}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
