'use client';

import Link from 'next/link';
import { Lightbulb, ArrowRight } from 'lucide-react';
import type { OverviewKeywordOpportunityItem } from '@/modules/overview/overview-service';

interface GscKeywordOpportunitiesProps {
  tenantSlug: string;
  opportunities?: OverviewKeywordOpportunityItem[] | undefined;
}

export function GscKeywordOpportunities({
  tenantSlug,
  opportunities = [],
}: GscKeywordOpportunitiesProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between h-full">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
              <Lightbulb className="w-4 h-4" />
            </div>
            <h3 className="text-[13.5px] font-bold text-slate-900 tracking-tight">
              Keyword Opportunities
            </h3>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
            NEW
          </span>
        </div>
        <p className="text-[11px] text-slate-500 mt-1 mb-3">
          Find new opportunities to grow
        </p>

        {/* Opportunities List */}
        {opportunities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400 text-xs">
            <Lightbulb className="w-6 h-6 stroke-1 text-slate-300 mb-1" />
            <span>Connect Search Console to discover keyword opportunities</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {opportunities.map((item) => {
              const isHigh = item.potential === 'High';
              const isMed = item.potential === 'Medium';
              return (
                <div
                  key={item.keyword}
                  className="flex items-center justify-between gap-2 text-[11.5px]"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0" />
                    <span className="text-slate-700 font-medium truncate">
                      {item.keyword}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                      isHigh
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                        : isMed
                        ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                        : 'bg-sky-50 text-sky-700 border border-sky-200/60'
                    }`}
                  >
                    {isHigh
                      ? 'High potential'
                      : isMed
                      ? 'Medium potential'
                      : 'Low competition'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Link */}
      <div className="pt-3 border-t border-slate-100 mt-3 text-center">
        <Link
          href={`/t/${tenantSlug}/reports/gsc/queries`}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <span>View All Opportunities</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
