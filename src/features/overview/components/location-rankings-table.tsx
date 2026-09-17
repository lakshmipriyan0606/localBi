'use client';

import { MapPin, ChevronDown } from 'lucide-react';
import { LOCATION_RANKINGS } from './dashboard-mock-data';

const PIN_COLORS = [
  'text-emerald-500 fill-emerald-500',
  'text-blue-500 fill-blue-500',
  'text-purple-500 fill-purple-500',
  'text-amber-500 fill-amber-500',
  'text-rose-500 fill-rose-500',
];

export function LocationRankingsTable() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-[13.5px] font-bold text-slate-900 tracking-tight">
          Location Rankings
        </h3>

        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/80 rounded-md px-2 py-0.5 text-[11px] font-medium text-slate-600 cursor-pointer hover:bg-slate-100">
          <span>Website Conversions</span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-1 flex-1">
        <table className="w-full text-[11.5px] text-left">
          <thead>
            <tr className="border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400">
              <th className="pb-2 font-bold w-5 pl-1">#</th>
              <th className="pb-2 font-bold">Location</th>
              <th className="pb-2 font-bold text-right">Users</th>
              <th className="pb-2 font-bold text-right">Conversions</th>
              <th className="pb-2 font-bold text-right pr-1">Conv. Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {LOCATION_RANKINGS.map((row, idx) => {
              const pinColor = PIN_COLORS[idx % PIN_COLORS.length];
              const isHighlight = idx < 3;
              return (
                <tr key={row.name} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 text-slate-400 font-medium pl-1">{row.rank}</td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                      <MapPin className={`w-3.5 h-3.5 flex-shrink-0 ${pinColor}`} />
                      <span className="truncate">{row.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 text-right font-medium text-slate-600 tabular-nums">
                    {row.users.toLocaleString()}
                  </td>
                  <td className="py-2.5 text-right font-bold text-emerald-600 tabular-nums">
                    {row.conversions.toLocaleString()}
                  </td>
                  <td className="py-2.5 text-right pr-1 tabular-nums font-bold">
                    <span className={isHighlight ? 'text-emerald-600' : 'text-slate-700'}>
                      {row.rate}
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
