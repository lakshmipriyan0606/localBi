import Link from 'next/link';
import { CheckCircle2, ArrowRight, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface StageReadyProps {
  tenantSlug: string;
  externalEmail?: string | undefined;
  gbpCount: number;
  gscCount: number;
  mappingsCount: number;
}

export function IntegrationsStageReady({
  tenantSlug,
  externalEmail,
  gbpCount,
  gscCount,
  mappingsCount,
}: StageReadyProps) {
  return (
    <Card className="border-slate-200 shadow-xs">
      <CardHeader>
        <CardTitle className="text-sm font-bold text-slate-900">
          Stage 6: Readiness & Performance Reports
        </CardTitle>
        <CardDescription className="text-xs text-slate-500">
          All integration stages are complete. Launch your analytics dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        <div className="p-5 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span>Integration Complete — Reports Are Live!</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Your Google accounts are authorized, external resources are discovered and mapped, and performance data is ready for exploration across Google Search Console and Google Business Profile.
          </p>
          <div className="pt-2">
            <Link
              href={`/client/${tenantSlug}/reports`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <span>Launch Performance Reports</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <span className="font-semibold text-slate-800">Integration Checklist</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600" />
              <span>Google Account Authorized ({externalEmail || 'Active'})</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600" />
              <span>{gbpCount} GBP Locations Discovered</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600" />
              <span>{gscCount} GSC Properties Discovered</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600" />
              <span>{mappingsCount} Internal Mappings Active</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
