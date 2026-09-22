import Link from 'next/link';
import { BarChart3, Smartphone, Laptop, Tablet, ArrowUpRight, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatNumber } from '@/shared/lib/formatters';

export interface Ga4DeviceRow {
  device: string;
  sessions: number;
  percent: string;
  icon?: any;
}

export interface Ga4DevicesCardProps {
  tenantSlug: string;
  devices?: Ga4DeviceRow[];
  hasRealData?: boolean;
}

const DEFAULT_ICONS: Record<string, any> = {
  Mobile: Smartphone,
  Desktop: Laptop,
  Tablet: Tablet,
};

export function Ga4DevicesCard({
  tenantSlug,
  devices = [],
  hasRealData = false,
}: Ga4DevicesCardProps) {
  const displayDevices = devices.length > 0 ? devices : [
    { device: 'Mobile', sessions: 0, percent: '0%', icon: Smartphone },
    { device: 'Desktop', sessions: 0, percent: '0%', icon: Laptop },
    { device: 'Tablet', sessions: 0, percent: '0%', icon: Tablet },
  ];

  return (
    <div className="space-y-6">
      <Card className="border border-slate-200/80 shadow-xs bg-white">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-teal-600" />
            Device Category Share
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 mt-0.5">
            {hasRealData
              ? 'Real session distribution by visitor hardware platform'
              : 'Session distribution by visitor hardware platform'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {displayDevices.map((d) => {
            const Icon = d.icon || DEFAULT_ICONS[d.device] || HelpCircle;
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
            <Link href={`/client/${tenantSlug}/reports/gsc/queries`} className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 flex items-center justify-between group">
              <span>View GSC Search Queries</span>
              <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
            <Link href={`/client/${tenantSlug}/reports/gbp/locations`} className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center justify-between group">
              <span>View GBP Storefront Metrics</span>
              <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
