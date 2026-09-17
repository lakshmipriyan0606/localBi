import { Share2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatNumber, formatPercent } from '@/shared/lib/formatters';

export const GA4_CHANNELS = [
  { channel: 'Organic Search', sessions: 68420, engagementRate: 0.724, avgDuration: '2m 14s', conversions: 1840, share: '47.9%' },
  { channel: 'Direct', sessions: 35120, engagementRate: 0.691, avgDuration: '1m 45s', conversions: 890, share: '24.6%' },
  { channel: 'Referral (Local Directories)', sessions: 19800, engagementRate: 0.642, avgDuration: '1m 20s', conversions: 420, share: '13.9%' },
  { channel: 'Organic Social', sessions: 11200, engagementRate: 0.583, avgDuration: '0m 58s', conversions: 180, share: '7.8%' },
  { channel: 'Paid Search (Ads)', sessions: 8310, engagementRate: 0.615, avgDuration: '1m 05s', conversions: 90, share: '5.8%' },
];

export function Ga4ChannelsTable() {
  return (
    <Card className="border border-slate-200/80 shadow-xs bg-white">
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Share2 className="h-4 w-4 text-indigo-600" />
              Traffic Acquisition Channels
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              First-user default channel grouping across the active 30-day reporting period
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-[11px]">30-Day Grain</Badge>
        </div>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-semibold">
              <th className="py-2.5 px-4">Channel Group</th>
              <th className="py-2.5 px-4 text-right">Sessions</th>
              <th className="py-2.5 px-4 text-right">Traffic Share</th>
              <th className="py-2.5 px-4 text-right">Engagement Rate</th>
              <th className="py-2.5 px-4 text-right">Avg Duration</th>
              <th className="py-2.5 px-4 text-right">Key Events</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {GA4_CHANNELS.map((row) => (
              <tr key={row.channel} className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-indigo-500" />
                  {row.channel}
                </td>
                <td className="py-3 px-4 text-right font-mono font-medium">{formatNumber(row.sessions)}</td>
                <td className="py-3 px-4 text-right"><Badge variant="outline" className="text-[10px] font-mono">{row.share}</Badge></td>
                <td className="py-3 px-4 text-right font-mono">{formatPercent(row.engagementRate)}</td>
                <td className="py-3 px-4 text-right font-mono text-slate-500">{row.avgDuration}</td>
                <td className="py-3 px-4 text-right font-mono font-bold text-indigo-700">{formatNumber(row.conversions)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
