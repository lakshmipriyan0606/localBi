import Link from 'next/link';
import { CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

interface LocationStatusBannerProps {
  tenantSlug: string;
  mapping: {
    isMapped: boolean;
    resourceName: string | null;
    externalResourceId: string | null;
    verified: boolean;
  };
}

export function LocationStatusBanner({ tenantSlug, mapping }: LocationStatusBannerProps) {
  const isVerified = mapping.isMapped && mapping.verified;
  const isMapped = mapping.isMapped;

  return (
    <div
      className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
        isVerified
          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
          : isMapped
          ? 'bg-amber-50/70 border-amber-200 text-amber-900'
          : 'bg-slate-50 border-slate-200 text-slate-800'
      }`}
    >
      <div className="flex items-start gap-3">
        {isVerified ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        )}
        <div>
          <p className="font-semibold text-sm">
            {isMapped
              ? `Connected to Google Business Profile: ${mapping.resourceName || mapping.externalResourceId}`
              : 'Google Business Profile not linked to this storefront'}
          </p>
          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
            {isVerified
              ? 'Voice of Merchant verification confirmed. Google Search and Maps impressions and customer actions are syncing.'
              : isMapped
              ? 'Google Business Profile resource mapped, but Google Voice of Merchant verification is incomplete.'
              : 'Link this location to a discovered Google Business Profile in the Integrations portal to enable local SEO performance tracking.'}
          </p>
        </div>
      </div>

      <Link
        href={`/client/${tenantSlug}/integrations`}
        className="flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:underline flex-shrink-0"
      >
        <span>Manage Mapping</span>
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
