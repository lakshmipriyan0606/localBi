import { Link2, CheckCircle2, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface StageAuthorizeProps {
  isAuthorized: boolean;
  email?: string | undefined;
  isConnecting: boolean;
  canManage: boolean;
  onConnect: () => void;
  onContinue: () => void;
}

export function IntegrationsStageAuthorize({
  isAuthorized,
  email,
  isConnecting,
  canManage,
  onConnect,
  onContinue,
}: StageAuthorizeProps) {
  return (
    <Card className="border-slate-200 shadow-xs">
      <CardHeader>
        <CardTitle className="text-sm font-bold text-slate-900">
          Stage 2: Authorize Google Account
        </CardTitle>
        <CardDescription className="text-xs text-slate-500">
          Authenticate via Google OAuth to permit localBi to access your verified properties.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        {isAuthorized ? (
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 font-semibold">
              <CheckCircle2 className="h-4 w-4" />
              <span>Google Account is actively connected</span>
            </div>
            <p className="text-slate-600">
              Authorized as <strong className="text-slate-800">{email}</strong>. Refresh tokens are securely stored and validated.
            </p>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={onContinue} className="flex items-center gap-1 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white">
                <span>Proceed to Resource Discovery</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center space-y-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto text-xl font-bold">
              G
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-sm">No Google Account Connected Yet</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                Sign in with the Google account that manages your Google Business Profile locations and Search Console properties.
              </p>
            </div>
            <Button size="sm" onClick={onConnect} disabled={isConnecting || !canManage} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
              <Link2 className="h-3.5 w-3.5 mr-1.5" />
              <span>{isConnecting ? 'Redirecting to Google…' : 'Connect Google Account'}</span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
