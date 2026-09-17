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
          Stage 5: Data Ingestion & Synchronization
        </CardTitle>
        <CardDescription className="text-xs text-slate-500">
          Trigger background synchronization workers to pull verified performance history into localBi.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="font-bold text-slate-900 text-sm">Synchronize Analytics Pipeline</h4>
            <p className="text-slate-500 max-w-lg">
              Dispatches background BullMQ ingestion jobs to query Google Search Console multi-grain dates and Google Business Profile 30-day performance windows.
            </p>
          </div>
          <Button
            size="sm"
            onClick={onTriggerSync}
            disabled={isSyncing || !canManage}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5 flex-shrink-0"
          >
            <Play className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Dispatching Jobs…' : 'Start Synchronization'}</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
            <span className="font-semibold text-slate-800">Google Search Console Worker</span>
            <p className="text-slate-500 leading-relaxed">
              Queries Search Analytics API across dates, queries, pages, and devices.
            </p>
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Ready to Ingest</Badge>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
            <span className="font-semibold text-slate-800">Google Business Profile Worker</span>
            <p className="text-slate-500 leading-relaxed">
              Fetches multi-daily metric timeseries (Search views, Maps views, Call clicks, Directions).
            </p>
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Ready to Ingest</Badge>
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
