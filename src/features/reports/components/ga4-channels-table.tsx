import { Share2, Inbox } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatNumber, formatPercent } from '@/shared/lib/formatters';

export interface Ga4ChannelRow {
  channel: string;
  sessions: number;
  share: string;
  engagementRate: number;
  avgDuration: string;
  conversions: number;
}

export interface Ga4ChannelsTableProps {
  channels?: Ga4ChannelRow[];
  hasRealData?: boolean;
}

export function Ga4ChannelsTable({
  channels = [],
  hasRealData = false,
}: Ga4ChannelsTableProps) {
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
      {channels.length === 0 || !hasRealData ? (
        <CardContent className="p-8 text-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Inbox className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-bold text-slate-800">No Web Acquisition Data Yet</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No web sessions have been logged for this period yet. Once your website records traffic via Google Search Console or Google Analytics, traffic channels will appear here automatically.
          </p>
        </CardContent>
      ) : (
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
              {channels.map((row) => (
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
      )}
    </Card>
  );
}
