'use client';

import { Building2, CheckCircle2, MapPin, Tag, Clock, Download, TrendingUp, Sparkles, Plug, AlertCircle } from 'lucide-react';

interface ClientHeroProps {
  tenantName: string;
  tenantSlug: string;
  locationsCount: number;
  categoriesCount?: number;
  brandTagline?: string;
  storeBadgeName?: string;
  storeBadgeIcon?: string;
  marketingQuote?: {
    quote: string;
    authorOrStore: string;
  } | null;
  growthPercent?: number;
  isConnected?: boolean;
  isDataReady?: boolean;
}

export function ClientHero({
  tenantName,
  locationsCount,
  categoriesCount = 0,
  brandTagline = 'Local search visibility, store performance, and customer analytics.',
  storeBadgeName,
  storeBadgeIcon = '🏢',
  marketingQuote,
  growthPercent,
  isConnected = false,
  isDataReady = false,
}: ClientHeroProps) {
  const displayBadgeName = storeBadgeName || tenantName.toUpperCase().slice(0, 16);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-indigo-100/60 bg-gradient-to-br from-[#FAFAFF] to-[#F5F5FA] p-4 shadow-sm">
      {/* Decorative blurred blobs */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-48 h-48 rounded-full bg-purple-500/5 blur-3xl pointer-events-none" />

      <div className="relative flex items-center justify-between gap-4 z-10">
        {/* Left: Brand info & status badges */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm shadow-indigo-200">
            <Building2 className="h-6 w-6 text-white drop-shadow-sm" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-bold text-slate-900 tracking-tight leading-none truncate">
                {tenantName}
              </h1>
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <p className="text-[12px] text-slate-500 mt-1">
              {brandTagline}
            </p>
            <div className="flex items-center gap-2.5 mt-2 flex-wrap">
              {/* Dynamic connection status badge */}
              {isDataReady ? (
                <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/70 rounded-full px-2 py-0.5">
                  <CheckCircle2 className="h-3 w-3" /> Data Ready &amp; Syncing
                </span>
              ) : isConnected ? (
                <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/70 rounded-full px-2 py-0.5">
                  <AlertCircle className="h-3 w-3" /> Integration Pending
                </span>
              ) : (
                <span className="relative inline-flex items-center gap-1 text-[10.5px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/70 rounded-full px-2 py-0.5">
                  <span className="absolute -top-0.5 -left-0.5 w-2 h-2 rounded-full bg-indigo-400 animate-ping opacity-60" />
                  <Plug className="h-3 w-3" /> Connect Google
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                <Clock className="h-3 w-3 text-slate-400" /> {isDataReady ? 'Live Data' : 'No Live Data'}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                <MapPin className="h-3 w-3 text-slate-400" /> {locationsCount} Google locations
              </span>
              {categoriesCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                  <Tag className="h-3 w-3 text-slate-400" /> {categoriesCount} search categories
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Marketing quote, storefront preview & export */}
        <div className="hidden lg:flex items-center gap-5 flex-shrink-0">


          <div className="flex items-center gap-2.5">
            <button 
              disabled={!isDataReady}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold shadow-xs transition-colors ${
                isDataReady 
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer' 
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Report</span>
            </button>

            {isDataReady && typeof growthPercent === 'number' && growthPercent > 0 ? (
              <div className="bg-emerald-50/90 border border-emerald-200/80 rounded-xl px-3 py-1.5 text-center min-w-[90px]">
                <div className="flex items-center justify-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600 stroke-[2.5]" />
                  <span className="text-[15px] font-bold text-emerald-700">+{growthPercent}%</span>
                </div>
                <span className="text-[9.5px] text-emerald-600 font-semibold block leading-none mt-0.5">
                  Visibility Growth
                </span>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 text-center min-w-[90px]">
                <div className="flex items-center justify-center gap-1">
                  <span className={`text-[13px] font-bold ${isDataReady ? 'text-slate-700' : 'text-slate-400'}`}>
                    {isDataReady ? 'Active' : 'Pending'}
                  </span>
                </div>
                <span className={`text-[9.5px] font-semibold block leading-none mt-0.5 ${isDataReady ? 'text-slate-500' : 'text-slate-400'}`}>
                  Data Status
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
