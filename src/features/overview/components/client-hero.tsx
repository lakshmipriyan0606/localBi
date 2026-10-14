'use client';

import React, { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  MapPin,
  Tag,
  Clock,
  Download,
  TrendingUp,
  Sparkles,
  Plug,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { ExportReportDialog } from './export-report-dialog';
import type { OverviewDataDto } from '@/modules/overview/overview-service';

export interface ClientHeroProps {
  tenantName: string;
  tenantSlug: string;
  activeBrandName?: string;
  locationsCount: number;
  gbpLocationsCount?: number;
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
  dataReadiness?: 'not_connected' | 'not_configured' | 'pending_sync' | 'syncing' | 'no_data' | 'ready';
  syncStatus?: 'idle' | 'syncing' | 'synced' | 'error' | 'pending';
  selectedDays?: number;
  overviewData?: OverviewDataDto | null;
}

export function ClientHero({
  tenantName,
  tenantSlug,
  activeBrandName,
  locationsCount,
  gbpLocationsCount = 0,
  categoriesCount = 0,
  brandTagline = 'Real-time local presence, search visibility, and customer analytics.',
  growthPercent,
  isConnected = false,
  isDataReady = false,
  dataReadiness,
  syncStatus = 'idle',
  selectedDays = 30,
  overviewData,
}: ClientHeroProps) {
  const [exportOpen, setExportOpen] = useState(false);

  // Derive honest data status if not explicitly passed
  const effectiveReadiness =
    dataReadiness ||
    (!isConnected
      ? 'not_connected'
      : !isDataReady
      ? 'not_configured'
      : syncStatus === 'syncing'
      ? 'syncing'
      : 'ready');

  const displayName = activeBrandName || tenantName;

  return (
    <>
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
                  {displayName}
                </h1>
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <p className="text-[12px] text-slate-500 mt-1">
                {brandTagline}
              </p>

              <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                {/* 1. Honest Integration / Readiness Status Badge */}
                {effectiveReadiness === 'ready' ? (
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/70 rounded-full px-2 py-0.5">
                    <CheckCircle2 className="h-3 w-3" /> Live Data &amp; Synced
                  </span>
                ) : effectiveReadiness === 'syncing' ? (
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/70 rounded-full px-2 py-0.5">
                    <RefreshCw className="h-3 w-3 animate-spin" /> Synchronizing...
                  </span>
                ) : effectiveReadiness === 'pending_sync' ? (
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/70 rounded-full px-2 py-0.5">
                    <Clock className="h-3 w-3" /> Sync Pending
                  </span>
                ) : effectiveReadiness === 'not_configured' ? (
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/70 rounded-full px-2 py-0.5">
                    <AlertCircle className="h-3 w-3" /> Integration Pending
                  </span>
                ) : effectiveReadiness === 'no_data' ? (
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">
                    <Clock className="h-3 w-3" /> No Data in Period
                  </span>
                ) : (
                  <span className="relative inline-flex items-center gap-1 text-[10.5px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/70 rounded-full px-2 py-0.5">
                    <span className="absolute -top-0.5 -left-0.5 w-2 h-2 rounded-full bg-indigo-400 animate-ping opacity-60" />
                    <Plug className="h-3 w-3" /> Connect Google
                  </span>
                )}

                {/* 2. Live Data indicator */}
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                  <Clock className="h-3 w-3 text-slate-400" />
                  {effectiveReadiness === 'ready' ? 'Live Data' : 'No Live Data'}
                </span>

                {/* 3. Accurate Location Count */}
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                  <MapPin className="h-3 w-3 text-slate-400" />
                  {gbpLocationsCount > 0
                    ? `${gbpLocationsCount} Google location${gbpLocationsCount !== 1 ? 's' : ''}`
                    : locationsCount > 0
                    ? `${locationsCount} store location${locationsCount !== 1 ? 's' : ''}`
                    : '0 Google locations'}
                </span>

                {/* 4. Search Categories */}
                {categoriesCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                    <Tag className="h-3 w-3 text-slate-400" /> {categoriesCount} search categories
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Export Report button & Data Status Card */}
          <div className="hidden lg:flex items-center gap-5 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              {/* Functional Export Report button */}
              <button
                type="button"
                onClick={() => setExportOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold shadow-xs transition-colors bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                title="Export performance report as CSV or printable document"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export Report</span>
              </button>

              {/* Visibility Growth or Data Status Badge */}
              {effectiveReadiness === 'ready' && typeof growthPercent === 'number' && growthPercent > 0 ? (
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
                    <span
                      className={`text-[13px] font-bold ${
                        effectiveReadiness === 'ready'
                          ? 'text-emerald-700'
                          : effectiveReadiness === 'syncing'
                          ? 'text-indigo-600'
                          : 'text-slate-400'
                      }`}
                    >
                      {effectiveReadiness === 'ready'
                        ? 'Active'
                        : effectiveReadiness === 'syncing'
                        ? 'Syncing'
                        : 'Pending'}
                    </span>
                  </div>
                  <span
                    className={`text-[9.5px] font-semibold block leading-none mt-0.5 ${
                      effectiveReadiness === 'ready' ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  >
                    Data Status
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Export Report Dialog Modal */}
      <ExportReportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        tenantSlug={tenantSlug}
        tenantName={displayName}
        selectedDays={selectedDays}
        overviewData={overviewData}
      />
    </>
  );
}
