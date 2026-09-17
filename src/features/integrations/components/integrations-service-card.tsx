import { Link2, RefreshCw, Unlink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatRelativeTime } from '@/shared/lib/formatters';

interface IntegrationsServiceCardProps {
  activeConnection?: { id: string; externalEmail: string; createdAt: string; lastUsedAt: string | null } | undefined;
  hasMappings: boolean;
  canManage: boolean;
  isConnecting: boolean;
  isRefreshing: boolean;
  onConnect: () => void;
  onRefresh: () => void;
  onDisconnectClick: () => void;
}

export function IntegrationsServiceCard({
  activeConnection,
  hasMappings,
  canManage,
  isConnecting,
  isRefreshing,
  onConnect,
  onRefresh,
  onDisconnectClick,
}: IntegrationsServiceCardProps) {
  const isAuthorized = Boolean(activeConnection);

  return (
    <Card className="border-slate-200 shadow-xs">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-lg">
            G
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-bold text-slate-900">Google Accounts</CardTitle>
              <Badge className={isAuthorized ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'}>
                {isAuthorized ? 'Account Authorized' : 'Not Connected'}
              </Badge>
              {hasMappings && <Badge className="bg-teal-100 text-teal-800 border-teal-200">Resources Mapped</Badge>}
            </div>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              OAuth 2.0 connection for Google Business Profile and Search Console reporting
            </CardDescription>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeConnection ? (
            <>
              <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing || !canManage} className="flex items-center gap-1.5 text-xs font-semibold">
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Refresh Resources</span>
              </Button>
              <Button variant="outline" size="sm" onClick={onDisconnectClick} disabled={!canManage} className="flex items-center gap-1.5 text-xs font-semibold text-red-700 border-red-200 hover:bg-red-50">
                <Unlink className="h-3.5 w-3.5" />
                <span>Disconnect</span>
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={onConnect} disabled={isConnecting || !canManage} className="flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white">
              <Link2 className="h-3.5 w-3.5" />
              <span>{isConnecting ? 'Opening Google…' : 'Authorize Google Account'}</span>
            </Button>
          )}
        </div>
      </CardHeader>

      {activeConnection && (
        <CardContent className="pt-0">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Authorized Email</span>
                <span className="font-semibold text-slate-800">{activeConnection.externalEmail}</span>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Authorized At</span>
                <span className="text-slate-700">{new Date(activeConnection.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Last Verified</span>
                <span className="text-slate-700">{formatRelativeTime(new Date(activeConnection.lastUsedAt || activeConnection.createdAt))}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Business Profile Active</Badge>
              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200">Search Console Active</Badge>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
