import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

export function OverviewKpiEmpty({
  tenantSlug,
  brandName,
}: {
  tenantSlug: string;
  brandName?: string | undefined;
}) {
  return (
    <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2 text-slate-600">
        <Sparkles className="h-4 w-4 text-indigo-600 flex-shrink-0" />
        <span>
          No active search or map data synced yet for <strong className="text-slate-800">{brandName || 'this brand'}</strong>.
        </span>
      </div>
      <Link
        href={`/client/${tenantSlug}/integrations`}
        className="inline-flex items-center gap-1 font-semibold text-indigo-700 hover:text-indigo-900 hover:underline flex-shrink-0"
      >
        <span>Connect & Map Google Resources</span>
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
