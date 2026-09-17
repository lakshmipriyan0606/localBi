'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { CHANNEL_ACQUISITION } from './dashboard-mock-data';

export function GbpChannelAcquisition() {
  const total = CHANNEL_ACQUISITION.reduce((s, c) => s + c.count, 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold text-slate-800">Channel Acquisition</h3>
        <span className="text-[10px] text-slate-400">All Channels ▾</span>
      </div>
      <p className="text-[10px] text-slate-400 mb-2">Where your patients find you</p>

      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0" style={{ width: 110, height: 110 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={[...CHANNEL_ACQUISITION]} dataKey="count" cx="50%" cy="50%" innerRadius={32} outerRadius={50} paddingAngle={1} strokeWidth={0}>
                {CHANNEL_ACQUISITION.map((c, i) => <Cell key={i} fill={c.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-bold text-slate-900">{total.toLocaleString()}</span>
            <span className="text-[8px] text-slate-500">Total Views</span>
            <span className="text-[9px] font-semibold text-emerald-600">+24.1%</span>
          </div>
        </div>

        <div className="space-y-1 flex-1 min-w-0">
          {CHANNEL_ACQUISITION.map((c) => (
            <div key={c.channel} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
              <span className="text-[10px] text-slate-600 truncate flex-1">{c.channel}</span>
              <span className="text-[10px] font-semibold text-slate-700 tabular-nums">{c.pct}%</span>
              <span className="text-[9px] text-slate-400 tabular-nums w-10 text-right">{c.count.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[9px] text-slate-400 mt-2 leading-relaxed">Google Search drives 42.8% of your visibility. Keep optimizing your profile and content to maintain momentum.</p>
    </div>
  );
}
