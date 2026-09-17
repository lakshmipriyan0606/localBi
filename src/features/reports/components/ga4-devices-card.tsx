import Link from 'next/link';
import { BarChart3, Smartphone, Laptop, Tablet, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatNumber } from '@/shared/lib/formatters';

export const GA4_DEVICES = [
  { device: 'Mobile', sessions: 89200, percent: '62.4%', icon: Smartphone },
  { device: 'Desktop', sessions: 48900, percent: '34.2%', icon: Laptop },
  { device: 'Tablet', sessions: 4750, percent: '3.4%', icon: Tablet },
];

export function Ga4DevicesCard({ tenantSlug }: { tenantSlug: string }) {
  return (
    <div className="space-y-6">
      <Card className="border border-slate-200/80 shadow-xs bg-white">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-teal-600" />
            Device Category Share
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 mt-0.5">
            Session distribution by visitor hardware platform
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {GA4_DEVICES.map((d) => {
            const Icon = d.icon;
            return (
              <div key={d.device} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-medium text-slate-700">
                    <Icon className="h-3.5 w-3.5 text-slate-400" />
                    <span>{d.device}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-400">{formatNumber(d.sessions)}</span>
                    <span className="font-bold font-mono text-slate-900">{d.percent}</span>
                  </div>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full" style={{ width: d.percent }} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="border border-indigo-100 bg-indigo-50/40 shadow-xs">
        <CardContent className="p-4 space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-950">Connected Reporting Sources</h4>
          <p className="text-xs text-indigo-800 leading-relaxed">
            Google Business Profile impressions and Google Search Console organic queries are currently active for this workspace.
          </p>
          <div className="pt-1 flex flex-col gap-2">
            <Link href={`/t/${tenantSlug}/reports/gsc/queries`} className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 flex items-center justify-between group">
              <span>View GSC Search Queries</span>
              <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
            <Link href={`/t/${tenantSlug}/reports/gbp/locations`} className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center justify-between group">
              <span>View GBP Storefront Metrics</span>
              <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
