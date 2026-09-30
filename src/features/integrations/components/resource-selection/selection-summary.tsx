import { RefreshCw, Info } from "lucide-react";
import { GoogleProductIcon } from "../google-product-icon";

interface SelectionSummaryProps {
  gscCount: number;
  gbpCount: number;
  ga4Count: number;
  onRefresh: () => void;
}

export function SelectionSummary({
  gscCount,
  gbpCount,
  ga4Count,
  onRefresh,
}: SelectionSummaryProps) {
  return (
    <div className="flex flex-col gap-4 sticky top-6">
      {/* Summary Card */}
      <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-sm">
        <h4 className="flex items-center gap-2 text-[15px] font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100">
          <ChecklistIcon className="w-5 h-5 text-indigo-500" />
          Selection Summary
        </h4>
        
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <GoogleProductIcon product="GSC" size="sm" />
            <span className="text-sm font-semibold text-slate-700">{gscCount} websites selected</span>
          </div>
          <div className="flex items-center gap-3">
            <GoogleProductIcon product="GBP" size="sm" />
            <span className="text-sm font-semibold text-slate-700">{gbpCount} store locations selected</span>
          </div>
          <div className="flex items-center gap-3">
            <GoogleProductIcon product="GA4" size="sm" />
            <span className="text-sm font-semibold text-slate-700">{ga4Count} GA4 property selected</span>
          </div>
        </div>
      </div>

      {/* Help Card */}
      <div className="bg-indigo-50/50 rounded-2xl border border-indigo-100/50 p-5 shadow-sm">
        <h4 className="flex items-center gap-2 text-[15px] font-bold text-indigo-900 mb-4 pb-3 border-b border-indigo-100/50">
          <Info className="w-5 h-5 text-indigo-500" />
          Need Help Selecting Resources?
        </h4>
        
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex gap-2.5">
            <GlobeIcon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="text-[13px] font-bold text-slate-900">Websites (Search Console)</span>
              <span className="text-[12px] text-slate-500 leading-snug">Select all domains and subdomains that represent your brand.</span>
            </div>
          </div>
          <div className="flex gap-2.5">
            <StoreIcon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="text-[13px] font-bold text-slate-900">Store Locations (Business Profile)</span>
              <span className="text-[12px] text-slate-500 leading-snug">Choose the store locations you want to track in LocalBi.</span>
            </div>
          </div>
          <div className="flex gap-2.5">
            <BarChartIcon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="text-[13px] font-bold text-slate-900">Analytics Properties (GA4)</span>
              <span className="text-[12px] text-slate-500 leading-snug">Select the GA4 properties that track your website or app traffic.</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-indigo-100/50 flex flex-col items-start gap-2 shadow-sm">
          <span className="flex items-center gap-1.5 text-[13px] font-bold text-indigo-900">
            <Info className="w-4 h-4 text-indigo-500" />
            Don't see your resources?
          </span>
          <span className="text-[11px] text-slate-500 leading-relaxed mb-1">
            Make sure you have the correct Google account selected and you have proper access permissions for Search Console, Business Profile and GA4.
          </span>
          <button
            onClick={onRefresh}
            className="text-[12px] font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Resources
          </button>
        </div>
      </div>
    </div>
  );
}

// Simple icons for the sidebar list
function ChecklistIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  );
}

function GlobeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  );
}

function StoreIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function BarChartIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}
