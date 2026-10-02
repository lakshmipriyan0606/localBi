'use client';

import { ArrowLeftRight, Users, Activity, Eye, MousePointerClick, TrendingUp } from 'lucide-react';
import type { Ga4RealPropertyData } from '@/modules/analytics/ga4-service';

export interface SurfaceCompareViewProps {
  compareData?: Ga4RealPropertyData['compare'] | undefined;
  originalHostname?: string | null | undefined;
  localbiHostname?: string | null | undefined;
}

export function SurfaceCompareView({
  compareData,
  originalHostname,
  localbiHostname,
}: SurfaceCompareViewProps) {
  if (!compareData || (!compareData.original && !compareData.localbi)) {
    return (
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-2">
        <ArrowLeftRight className="w-8 h-8 text-slate-400 mx-auto" />
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Compare Mode Requires Both Surfaces Mapped
        </h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          To compare performance, ensure both the Original website and LocalBi microsite have active Google Analytics resource mappings.
        </p>
      </div>
    );
  }

  const orig = compareData.original;
  const loc = compareData.localbi;

  const rows = [
    {
      label: 'Active Users',
      icon: Users,
      originalVal: orig ? orig.activeUsers.toLocaleString() : 'N/A',
      localbiVal: loc ? loc.activeUsers.toLocaleString() : 'N/A',
      note: 'Unique users are non-additive across distinct domains',
    },
    {
      label: 'Sessions',
      icon: Activity,
      originalVal: orig ? orig.sessions.toLocaleString() : 'N/A',
      localbiVal: loc ? loc.sessions.toLocaleString() : 'N/A',
    },
    {
      label: 'Page Views',
      icon: Eye,
      originalVal: orig ? orig.engagementOverview.views.toLocaleString() : 'N/A',
      localbiVal: loc ? loc.engagementOverview.views.toLocaleString() : 'N/A',
    },
    {
      label: 'Key Events (Conversions)',
      icon: MousePointerClick,
      originalVal: orig ? orig.keyEvents.toLocaleString() : 'N/A',
      localbiVal: loc ? loc.keyEvents.toLocaleString() : 'N/A',
    },
    {
      label: 'Engagement Rate',
      icon: TrendingUp,
      originalVal: orig ? `${orig.engagementRate}%` : 'N/A',
      localbiVal: loc ? `${loc.engagementRate}%` : 'N/A',
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Side-by-Side Surface Comparison</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight mt-0.5">
            Original Website vs. LocalBi Microsite
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Strictly isolated by WebSurface hostname. Data is displayed side-by-side without corruptive cross-domain user summation.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-semibold">
              <th className="py-3 px-5">Metric</th>
              <th className="py-3 px-5">
                <div>Original Website</div>
                <div className="text-[10px] font-mono font-normal text-slate-500">
                  {originalHostname || 'brand.com'}
                </div>
              </th>
              <th className="py-3 px-5 text-indigo-600 dark:text-indigo-400">
                <div className="flex items-center gap-1">
                  <span>LocalBi Microsite</span>
                  <span className="text-[9px] bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded-full font-semibold">
                    LOCALBI
                  </span>
                </div>
                <div className="text-[10px] font-mono font-normal text-slate-500">
                  {localbiHostname || 'locate.brand.com'}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {rows.map((r, idx) => {
              const Icon = r.icon;
              return (
                <tr
                  key={idx}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3.5 px-5 font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Icon className="w-4 h-4 text-slate-400" />
                    <div>
                      <div>{r.label}</div>
                      {r.note && (
                        <div className="text-[10px] text-slate-400 font-normal">{r.note}</div>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {r.originalVal}
                  </td>
                  <td className="py-3.5 px-5 text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    {r.localbiVal}
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
