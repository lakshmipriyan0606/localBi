import { Play, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface StageSyncProps {
  isSyncing: boolean;
  canManage: boolean;
  onTriggerSync: () => void;
  onContinue: () => void;
}

export function IntegrationsStageSync({ isSyncing, canManage, onTriggerSync, onContinue }: StageSyncProps) {
  return (
    <Card className="border-slate-200 shadow-xs">
      <CardHeader>
        <CardTitle className="text-sm font-bold text-slate-900">
          Sync Performance Data
        </CardTitle>
        <CardDescription className="text-xs text-slate-500">
          Import your latest performance data from Google to view your customer reports and analytics.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="font-bold text-slate-900 text-sm">Sync Google Data Now</h4>
            <p className="text-slate-500 max-w-lg">
              Fetches your Google Search Console keyword queries and Google Business Profile customer calls, directions, and website clicks.
            </p>
          </div>
          <Button
            size="sm"
            onClick={onTriggerSync}
            disabled={isSyncing || !canManage}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5 flex-shrink-0"
          >
            <Play className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing Data…' : 'Start Synchronization'}</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
            <span className="font-semibold text-slate-800">Google Search Console</span>
            <p className="text-slate-500 leading-relaxed">
              Pulls organic search rankings, clicks, impressions, and top customer keywords.
            </p>
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Connected & Ready</Badge>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
            <span className="font-semibold text-slate-800">Google Business Profile</span>
            <p className="text-slate-500 leading-relaxed">
              Pulls store customer actions (calls, driving directions, website clicks, and map views).
            </p>
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Connected & Ready</Badge>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button size="sm" onClick={onContinue} className="flex items-center gap-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white">
            <span>Proceed to Reports Readiness</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
