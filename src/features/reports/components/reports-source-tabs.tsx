'use client';

import Link from 'next/link';
import { Store, TrendingUp, Activity } from 'lucide-react';
import { cn } from '@/lib/cn';

interface SourceTabsProps {
  activeSource: 'gbp' | 'gsc';
  onSelectTab: (tab: 'gbp' | 'gsc') => void;
  tenantSlug: string;
}

export function ReportsSourceTabs({ activeSource, onSelectTab, tenantSlug }: SourceTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100/90 rounded-xl border border-slate-200 shadow-2xs">
      <button
        type="button"
        onClick={() => onSelectTab('gbp')}
        className={cn(
          'flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer',
          activeSource === 'gbp'
            ? 'bg-white text-teal-900 shadow-xs border border-teal-200/80 ring-2 ring-teal-500/10'
            : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
        )}
      >
        <Store className={cn('h-4 w-4', activeSource === 'gbp' ? 'text-teal-600' : 'text-slate-400')} />
        <span>Google Business Profile</span>
        <span
          className={cn(
            'text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full',
            activeSource === 'gbp' ? 'bg-teal-100 text-teal-800' : 'bg-slate-200 text-slate-600'
          )}
        >
          GBP
        </span>
      </button>

      <button
        type="button"
        onClick={() => onSelectTab('gsc')}
        className={cn(
          'flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer',
          activeSource === 'gsc'
            ? 'bg-white text-indigo-900 shadow-xs border border-indigo-200/80 ring-2 ring-indigo-500/10'
            : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
        )}
      >
        <TrendingUp className={cn('h-4 w-4', activeSource === 'gsc' ? 'text-indigo-600' : 'text-slate-400')} />
        <span>Google Search Console</span>
        <span
          className={cn(
            'text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full',
            activeSource === 'gsc' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-600'
          )}
        >
          GSC
        </span>
      </button>

      <Link
        href={`/client/${tenantSlug}/reports/ga4`}
        className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-all sm:ml-auto"
      >
        <Activity className="h-4 w-4 text-purple-600" />
        <span>Google Analytics</span>
        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
          GA4 · PREVIEW
        </span>
      </Link>
    </div>
  );
}
