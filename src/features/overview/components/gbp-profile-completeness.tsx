'use client';

import { Check } from 'lucide-react';

export function GbpProfileCompleteness() {
  const pct = 92;
  const r = 26;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  const items = [
    { label: 'Business info complete', done: true },
    { label: 'Photos added (50+)', done: true },
    { label: 'Services & categories set', done: true },
    { label: 'Regular posting', done: true },
    { label: 'Add more FAQs', done: false },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-2.5 sm:p-3 flex items-center gap-2 shadow-[0_1px_3px_rgba(15,23,42,0.03)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-[108px] overflow-hidden">
      {/* Compact gauge ring */}
      <div className="relative flex-shrink-0 w-16 h-16 flex items-center justify-center">
        <svg width="64" height="64" viewBox="0 0 64 64" className="transform -rotate-90">
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="5.5"
          />
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke="url(#gbpGaugeGradSm)"
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
          <defs>
            <linearGradient id="gbpGaugeGradSm" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[15px] font-black text-slate-900 leading-none tracking-tight">
            {pct}%
          </span>
          <span className="text-[7.5px] font-semibold text-slate-500 leading-tight mt-0.5">
            Profile<br />Completeness
          </span>
        </div>
      </div>

      {/* Checklist items */}
      <div className="space-y-0.5 min-w-0 flex-1">
        <p className="text-[10.5px] font-bold text-slate-900 leading-none mb-1">
          Almost Perfect!
        </p>
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-1 min-w-0">
            {it.done ? (
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <Check className="w-2 h-2 text-white stroke-[3.5]" />
              </div>
            ) : (
              <div className="w-2.5 h-2.5 rounded-full border border-slate-300 flex-shrink-0" />
            )}
            <span
              className={`text-[9px] leading-tight truncate ${
                it.done ? 'text-slate-700 font-medium' : 'text-slate-400'
              }`}
            >
              {it.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
