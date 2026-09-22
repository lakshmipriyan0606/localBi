import Link from 'next/link';
import { CheckCircle2, Clock, Link2, ArrowRight } from 'lucide-react';

interface ReadinessBannerProps {
  tenantSlug: string;
  isDataReady: boolean;
  isConnected: boolean;
  externalEmail?: string | null | undefined;
  mappedResourcesCount: number;
}

export function OverviewReadinessBanner({
  tenantSlug,
  isDataReady,
  isConnected,
  externalEmail,
  mappedResourcesCount,
}: ReadinessBannerProps) {
  return (
    <div
      className={`p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs ${
        isDataReady
          ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
          : isConnected
          ? 'bg-amber-50/50 border-amber-200 text-amber-950'
          : 'bg-indigo-50/40 border-indigo-200 text-indigo-950'
      }`}
    >
      <div className="flex items-start gap-3.5">
        <div
          className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
            isDataReady ? 'bg-emerald-100 text-emerald-700' : isConnected ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
          }`}
        >
          {isDataReady ? <CheckCircle2 className="h-5 w-5" /> : isConnected ? <Clock className="h-5 w-5" /> : <Link2 className="h-5 w-5" />}
        </div>
        <div>
          <h3 className="font-bold text-sm text-slate-900">
            {isDataReady
              ? 'Google Accounts Connected & Reporting Active'
              : isConnected
              ? 'Google Account Authorized — Complete Resource Mapping'
              : 'Connect Google Accounts to Enable Local Analytics'}
          </h3>
          <p className="text-xs text-slate-600 mt-0.5 max-w-2xl leading-relaxed">
            {isDataReady
              ? `Authorized as ${externalEmail ?? 'Google Account'}. ${mappedResourcesCount} internal resources are mapped and streaming 30-day multi-grain search and maps data.`
              : isConnected
              ? `Account ${externalEmail ?? 'Google Account'} authorized. Next: map your internal storefronts and brands to Google Business Profiles and Search Console.`
              : 'Link your Google Business Profile and Search Console accounts via OAuth 2.0 to begin monitoring brand visibility, call clicks, and search queries.'}
          </p>
        </div>
      </div>

      <Link
        href={`/client/${tenantSlug}/integrations`}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 rounded-lg text-xs font-semibold border border-slate-200 shadow-xs flex-shrink-0 transition-colors"
      >
        <span>{isDataReady ? 'Integration Settings' : 'Continue Setup'}</span>
        <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
      </Link>
    </div>
  );
}
