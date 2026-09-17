'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { TOP_SEARCH_QUERIES } from './dashboard-mock-data';

export function GbpSearchQueriesTable() {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xs font-bold text-slate-800">Top Search Queries</h3>
        <Link href="#" className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5">
          View All Queries <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      </div>
      <p className="text-[10px] text-slate-400 mb-2">Queries driving the most visibility</p>
      <table className="w-full text-[10px]">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left font-semibold text-slate-500 pb-1.5 w-4">#</th>
            <th className="text-left font-semibold text-slate-500 pb-1.5">Search Query</th>
            <th className="text-right font-semibold text-slate-500 pb-1.5">Clicks</th>
            <th className="text-right font-semibold text-slate-500 pb-1.5">Impressions</th>
            <th className="text-right font-semibold text-slate-500 pb-1.5">CTR</th>
          </tr>
        </thead>
        <tbody>
          {TOP_SEARCH_QUERIES.map((q, i) => (
            <tr key={q.query} className="border-b border-slate-50 hover:bg-slate-50/50">
              <td className="py-1.5 text-slate-400 font-medium">{i + 1}</td>
              <td className="py-1.5 font-medium text-indigo-600">{q.query}</td>
              <td className="py-1.5 text-right tabular-nums text-slate-700">{q.clicks}</td>
              <td className="py-1.5 text-right tabular-nums text-slate-600">{q.impressions.toLocaleString()}</td>
              <td className="py-1.5 text-right tabular-nums text-slate-600">{q.ctr}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
