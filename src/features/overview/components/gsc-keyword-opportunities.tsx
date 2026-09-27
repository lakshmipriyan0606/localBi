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
    <div className="bg-gradient-to-br from-purple-50 via-white to-indigo-50 rounded-2xl border border-purple-100 p-4 sm:p-5 shadow-xs transition-all duration-300 hover:shadow-md hover:border-purple-200 flex flex-col justify-between h-full relative overflow-hidden group">
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-purple-200">
              <Lightbulb className="w-4 h-4 drop-shadow-sm" />
            </div>
            <h3 className="text-[14px] font-bold text-slate-900 tracking-tight">
              Keyword Opportunities
            </h3>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 shadow-sm border border-purple-200/50">
            NEW
          </span>
        </div>
        <p className="text-[12px] text-slate-600 mt-1.5 mb-4">
          Discover low-hanging keywords to boost traffic
        </p>

        {/* Opportunities List */}
        {opportunities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-slate-500 text-[11.5px] bg-white/50 rounded-xl border border-dashed border-purple-200">
            <Lightbulb className="w-6 h-6 stroke-1 text-purple-300 mb-2" />
            <span>Connect Search Console to discover keywords</span>
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
      <div className="relative z-10 pt-3 border-t border-purple-100/60 mt-3 text-center">
        <Link
          href={`/client/${tenantSlug}/reports/gsc/queries`}
          className="inline-flex items-center justify-center w-full gap-1.5 text-[12px] font-bold text-indigo-700 hover:text-indigo-800 transition-colors py-1 rounded-lg hover:bg-indigo-50/50 group/link"
        >
          <span>View All Opportunities</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
