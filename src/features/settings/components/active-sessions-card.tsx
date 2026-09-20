'use client';

import { useState } from 'react';
import { Laptop, AlertCircle, Loader2, ShieldX, LogOut } from 'lucide-react';
import { UserSessionDto } from '../types/settings-dto';
import { useSessionsQuery, useRevokeSessionMutation, useRevokeAllSessionsMutation } from '../hooks/use-settings';
import { normalizeApiError } from '@/lib/http/api-error';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AnalyticsLoader } from '@/components/ui/analytics-loader';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function ActiveSessionsCard() {
  const { data, isLoading, isError, error } = useSessionsQuery();
  const [revokingSession, setRevokingSession] = useState<UserSessionDto | null>(null);
  const [showRevokeAll, setShowRevokeAll] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const revokeMutation = useRevokeSessionMutation();
  const revokeAllMutation = useRevokeAllSessionsMutation();

  const handleConfirmRevoke = async () => {
    if (!revokingSession) return;
    setActionError(null);
    try {
      await revokeMutation.mutateAsync(revokingSession.id);
      setRevokingSession(null);
    } catch (err) {
      const normalized = normalizeApiError(err);
      setActionError(normalized.message);
    }
  };

  const handleConfirmRevokeAll = async () => {
    setActionError(null);
    try {
      await revokeAllMutation.mutateAsync();
      setShowRevokeAll(false);
    } catch (err) {
      const normalized = normalizeApiError(err);
      setActionError(normalized.message);
    }
  };

  const sessions = data?.sessions;

  return (
    <Card className="border-slate-200/80 shadow-xs">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <CardTitle className="text-lg font-bold text-slate-900">
            Active Device Sessions
          </CardTitle>
          <CardDescription>
            Review and manage the devices that are currently signed into your account.
          </CardDescription>
        </div>

        {sessions && sessions.length > 1 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRevokeAll(true)}
            className="text-red-600 hover:text-red-700 hover:border-red-300 gap-1.5"
            id="revoke-all-sessions-btn"
          >
            <ShieldX className="h-3.5 w-3.5" />
            Sign Out All Devices
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {actionError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        )}

        {isError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription>{error?.message || 'Failed to load active sessions.'}</AlertDescription>
          </Alert>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device / Browser</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>State</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center">
                    <AnalyticsLoader variant="table" message="Loading active sessions..." />
                  </TableCell>
                </TableRow>
              ) : !sessions || sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-xs text-slate-400">
                    No active sessions found.
                  </TableCell>
                </TableRow>
              ) : (
                sessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs text-slate-800">
                      <div className="flex items-center gap-2">
                        <Laptop className="h-3.5 w-3.5 text-slate-400" />
                        <span className="truncate max-w-[200px]" title={s.userAgent || 'Unknown device'}>
                          {s.userAgent || 'Unknown browser'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-500">
                      {s.ipAddress || '127.0.0.1'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {new Date(s.lastActiveAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {s.isCurrent ? (
                        <Badge variant="success" className="text-[10px]">
                          Current Session
                        </Badge>
                      ) : (
                        <Badge variant="neutral" className="text-[10px]">
                          Active Device
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!s.isCurrent && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRevokingSession(s)}
                          id={`revoke-session-${s.id}`}
                          className="h-7 px-2 text-xs text-slate-600 hover:text-red-700 hover:border-red-300"
                        >
                          Sign Out
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Revoke Single Session Dialog */}
      <Dialog
        open={Boolean(revokingSession)}
        onOpenChange={(open) => !open && setRevokingSession(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign Out This Device</DialogTitle>
            <DialogDescription>
              Sign out{' '}
              <strong className="font-semibold">{revokingSession?.userAgent || 'Unknown device'}</strong>{' '}
              ({revokingSession?.ipAddress || '127.0.0.1'})? This device will be signed out immediately.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setRevokingSession(null)}
              disabled={revokeMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRevoke}
              disabled={revokeMutation.isPending}
              id="confirm-revoke-session-btn"
            >
              {revokeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Signing out...
                </>
              ) : (
                'Sign Out Device'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke All Sessions Dialog */}
      <Dialog open={showRevokeAll} onOpenChange={setShowRevokeAll}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600">
                <ShieldX className="h-4 w-4" />
              </div>
              <DialogTitle>Sign Out All Devices</DialogTitle>
            </div>
            <DialogDescription>
              This will revoke all active sessions across all devices, including this one. You will need to sign in again.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setShowRevokeAll(false)}
              disabled={revokeAllMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRevokeAll}
              disabled={revokeAllMutation.isPending}
              id="confirm-revoke-all-sessions-btn"
              className="gap-2"
            >
              {revokeAllMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing out...
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4" />
                  Sign Out Everywhere
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
