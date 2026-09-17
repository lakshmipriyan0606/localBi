'use client';

import { Building2, CheckCircle2, MapPin, Tag, Clock, Download, TrendingUp, Sparkles } from 'lucide-react';

interface ClientHeroProps {
  tenantName: string;
  tenantSlug: string;
  locationsCount: number;
}

export function ClientHero({ tenantName, locationsCount }: ClientHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Brand info & status badges */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="h-12 w-12 rounded-xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center flex-shrink-0 shadow-xs">
            <Building2 className="h-6 w-6 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-bold text-slate-900 tracking-tight leading-none truncate">
                {tenantName}
              </h1>
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <p className="text-[12px] text-slate-500 mt-1">
              Local visibility. Real patients. Measurable growth.
            </p>
            <div className="flex items-center gap-2.5 mt-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/70 rounded-full px-2 py-0.5">
                <CheckCircle2 className="h-3 w-3" /> Data Ready & Syncing
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                <Clock className="h-3 w-3 text-slate-400" /> Last updated 2 minutes ago
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                <MapPin className="h-3 w-3 text-slate-400" /> {locationsCount} Google locations
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                <Tag className="h-3 w-3 text-slate-400" /> 12 search categories
              </span>
            </div>
          </div>
        </div>

        {/* Right: Marketing quote, storefront preview & export */}
        <div className="hidden lg:flex items-center gap-5 flex-shrink-0">
          <div className="text-right">
            <p className="text-[11.5px] text-slate-600 italic font-medium leading-tight">
              &ldquo;More visibility.<br />More patients.<br />A healthier tomorrow.&rdquo;
            </p>
          </div>

          {/* Dental storefront miniature */}
          <div className="h-12 w-28 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 p-2 flex items-center justify-center gap-1.5 text-white shadow-xs border border-slate-700">
            <span className="text-sm">🦷</span>
            <span className="text-[11px] font-bold tracking-tight">ABC DENTAL</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[12px] font-semibold shadow-xs transition-colors cursor-pointer">
              <Download className="h-3.5 w-3.5" />
              <span>Export Report</span>
            </button>

            <div className="bg-emerald-50/90 border border-emerald-200/80 rounded-xl px-3 py-1.5 text-center min-w-[90px]">
              <div className="flex items-center justify-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600 stroke-[2.5]" />
                <span className="text-[15px] font-bold text-emerald-700">+28%</span>
              </div>
              <span className="text-[9.5px] text-emerald-600 font-semibold block leading-none mt-0.5">
                Visibility Growth
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
