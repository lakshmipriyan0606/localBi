'use client';

import { Globe, MapPin, Store, ShieldCheck, Activity, ExternalLink, Sparkles, CheckCircle2 } from 'lucide-react';

export interface Ga4StreamDetailsProps {
  websiteUrl?: string | undefined;
  brandName?: string | undefined;
  locationName?: string | undefined;
  storeCode?: string | undefined;
  address?: string | undefined;
  accountEmail?: string | undefined;
  hasRealData?: boolean | undefined;
}

export function Ga4StreamDetails({
  websiteUrl,
  brandName,
  locationName,
  storeCode,
  address,
  accountEmail,
  hasRealData = false,
}: Ga4StreamDetailsProps) {
  let domain = 'Website';
  try {
    if (websiteUrl) {
      domain = new URL(websiteUrl).hostname.replace(/^www\./, '');
    }
  } catch {
    domain = websiteUrl || 'Website';
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs transition-all duration-200 hover:border-slate-300">
      <div className="relative z-10 space-y-4">
        {/* Top status bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold tracking-tight text-slate-900">
                  Search & Referral Web Stream Attribution
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 shadow-2xs">
                  <CheckCircle2 className="h-3 w-3 text-indigo-600" />
                  {hasRealData ? 'Search Attribution Active' : 'Attribution Ready'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                  <Sparkles className="h-2.5 w-2.5 text-indigo-600" />
                  Proxy Model
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Estimated website traffic attribution linked with Google Search Console & Google Business Profile
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs self-start sm:self-auto">
            <div className="rounded-xl bg-white px-3 py-1.5 border border-slate-200/90 shadow-2xs flex items-center gap-2">
              <span className="text-slate-500 font-medium">Attribution Health:</span>
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                100% Active
              </span>
            </div>
          </div>
        </div>

        {/* 4 Interactive Feature Chips */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* Target Web Property */}
          <div className="group rounded-xl bg-white hover:bg-slate-50/80 border border-slate-200/80 hover:border-indigo-300 p-3.5 transition-all duration-200 shadow-2xs">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mb-1">
              <span className="flex items-center gap-1.5 font-semibold text-indigo-700">
                <Globe className="h-3.5 w-3.5 text-indigo-600" />
                Target Web Property
              </span>
              {websiteUrl && (
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-indigo-600 transition-colors"
                  title="Open live URL"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <div className="text-sm font-bold text-slate-900 truncate" title={websiteUrl || domain}>
              {websiteUrl ? (
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline hover:text-indigo-600 flex items-center gap-1.5 truncate"
                >
                  <span className="inline-block h-2 w-2 rounded-full bg-indigo-500" />
                  <span className="truncate">{domain}</span>
                </a>
              ) : (
                'Configured Web Stream'
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 truncate">
              {websiteUrl || 'Direct & Organic Search'}
            </p>
          </div>

          {/* Linked Brand & Store */}
          <div className="group rounded-xl bg-white hover:bg-slate-50/80 border border-slate-200/80 hover:border-purple-300 p-3.5 transition-all duration-200 shadow-2xs">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mb-1">
              <span className="flex items-center gap-1.5 font-semibold text-purple-700">
                <Store className="h-3.5 w-3.5 text-purple-600" />
                Linked Brand & Store
              </span>
              {storeCode && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200/80">
                  {storeCode}
                </span>
              )}
            </div>
            <div className="text-sm font-bold text-slate-900 truncate" title={brandName || 'Brand'}>
              {brandName || 'Brand Profile'}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {storeCode ? `Store Unit ${storeCode}` : 'Primary Organization'}
            </p>
          </div>

          {/* Location & Region */}
          <div className="group rounded-xl bg-white hover:bg-slate-50/80 border border-slate-200/80 hover:border-rose-300 p-3.5 transition-all duration-200 shadow-2xs">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mb-1">
              <span className="flex items-center gap-1.5 font-semibold text-rose-700">
                <MapPin className="h-3.5 w-3.5 text-rose-600" />
                Physical Presence
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200/80">
                Verified
              </span>
            </div>
            <div className="text-sm font-bold text-slate-900 truncate" title={locationName || 'Location'}>
              {locationName || 'Main Hub'}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 truncate" title={address || 'Active Territory'}>
              {address || 'Registered Location'}
            </p>
          </div>

          {/* Authorized Identity */}
          <div className="group rounded-xl bg-white hover:bg-slate-50/80 border border-slate-200/80 hover:border-emerald-300 p-3.5 transition-all duration-200 shadow-2xs">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mb-1">
              <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Authorized OAuth Source
              </span>
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </div>
            <div className="text-sm font-bold text-slate-900 truncate" title={accountEmail || 'Account'}>
              {accountEmail ? accountEmail.split('@')[0] : 'Connected User'}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 truncate" title={accountEmail}>
              {accountEmail || 'Google Cloud Verified'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
