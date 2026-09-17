'use client';

import Link from 'next/link';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { LOCATION_PERFORMANCE_TABLE } from './dashboard-mock-data';

export function GbpLocationPerformance() {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold text-slate-800">Location Performance</h3>
        <Link href="#" className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5">
          View Location Matrix <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      </div>
      <p className="text-[10px] text-slate-400 mb-2">Performance by location</p>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left font-semibold text-slate-500 pb-1.5 pr-2">Location</th>
              <th className="text-right font-semibold text-slate-500 pb-1.5 px-1">Views</th>
              <th className="text-right font-semibold text-slate-500 pb-1.5 px-1">Clicks</th>
              <th className="text-right font-semibold text-slate-500 pb-1.5 px-1">Calls</th>
              <th className="text-right font-semibold text-slate-500 pb-1.5 px-1">Direction</th>
              <th className="text-right font-semibold text-slate-500 pb-1.5 pl-1">Trend</th>
            </tr>
          </thead>
          <tbody>
            {LOCATION_PERFORMANCE_TABLE.map((loc) => (
              <tr key={loc.name} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="py-1.5 pr-2 font-medium text-slate-800 whitespace-nowrap">{loc.name}</td>
                <td className="py-1.5 px-1 text-right tabular-nums text-slate-600">{loc.views.toLocaleString()}</td>
                <td className="py-1.5 px-1 text-right tabular-nums text-slate-600">{loc.clicks}</td>
                <td className="py-1.5 px-1 text-right tabular-nums text-slate-600">{loc.calls}</td>
                <td className="py-1.5 px-1 text-right tabular-nums text-slate-600">{loc.direction}</td>
                <td className="py-1.5 pl-1 text-right">
                  <span className="inline-flex items-center gap-0.5 text-emerald-600 font-semibold">
                    <TrendingUp className="h-2.5 w-2.5" />+{loc.trend}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
