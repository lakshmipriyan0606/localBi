'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { PERFORMANCE_TIMESERIES } from './dashboard-mock-data';
import { formatCompact, formatAxisDate } from '@/shared/lib/formatters';

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-lg p-2.5 min-w-[140px]">
      <div className="text-[10px] font-semibold text-slate-500 mb-1.5">{label ? formatAxisDate(label, 'medium') : ''}</div>
      {payload.map((e, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: e.color }} />
            <span className="text-[11px] text-slate-600">{e.name}</span>
          </div>
          <span className="text-[11px] font-bold text-slate-900 tabular-nums">{e.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

export function GbpPerformanceChart() {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold text-slate-800">30-Day Performance Overview</h3>
        <span className="text-[10px] text-slate-400">All Metrics ▾</span>
      </div>
      <p className="text-[10px] text-slate-400 mb-2">Clicks, impressions, and GBP actions over time</p>
      <div style={{ width: '100%', height: 200 }}>
        <ResponsiveContainer>
          <AreaChart data={PERFORMANCE_TIMESERIES} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="gClicks" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4338CA" stopOpacity={0.15} /><stop offset="95%" stopColor="#4338CA" stopOpacity={0} /></linearGradient>
              <linearGradient id="gImpr" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0F766E" stopOpacity={0.1} /><stop offset="95%" stopColor="#0F766E" stopOpacity={0} /></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} tickFormatter={(v: string) => formatAxisDate(v)} interval={4} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: '#94A3B8' }} tickFormatter={(v: number) => formatCompact(v)} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
            <Area type="monotone" dataKey="clicks" name="Clicks" stroke="#4338CA" fill="url(#gClicks)" strokeWidth={1.5} dot={false} />
            <Area type="monotone" dataKey="impressions" name="Impressions" stroke="#0F766E" fill="url(#gImpr)" strokeWidth={1.5} dot={false} />
            <Area type="monotone" dataKey="gbpViews" name="GBP Views" stroke="#7C3AED" fill="transparent" strokeWidth={1} strokeDasharray="4 2" dot={false} />
            <Area type="monotone" dataKey="gbpActions" name="GBP Actions" stroke="#B45309" fill="transparent" strokeWidth={1} strokeDasharray="4 2" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
