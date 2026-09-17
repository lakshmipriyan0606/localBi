'use client';

import { useState } from 'react';
import { Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { TenantInvitationDto } from '../types/invitation-dto';
import { useRevokeTenantInvitationMutation } from '../hooks/use-tenant-invitations';
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
import { EmptyState } from '@/components/ui/empty-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface InvitationTableProps {
  tenantSlug: string;
  invitations: TenantInvitationDto[] | undefined;
  isLoading: boolean;
  onInviteClick?: () => void;
}

export function InvitationTable({
  tenantSlug,
  invitations,
  isLoading,
  onInviteClick,
}: InvitationTableProps) {
  const [revokingInvitation, setRevokingInvitation] = useState<TenantInvitationDto | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const revokeMutation = useRevokeTenantInvitationMutation(tenantSlug);

  const handleConfirmRevoke = async () => {
    if (!revokingInvitation) return;
    setActionError(null);
    try {
      await revokeMutation.mutateAsync(revokingInvitation.id);
      setRevokingInvitation(null);
    } catch (err) {
      const normalized = normalizeApiError(err);
      setActionError(normalized.message);
    }
  };

  return (
    <div className="space-y-4">
      {actionError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invited Email</TableHead>
            <TableHead>Assigned Role</TableHead>
            <TableHead>Scope Mode</TableHead>
            <TableHead>Sent</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center">
                <AnalyticsLoader variant="table" message="Loading pending invitations..." />
              </TableCell>
            </TableRow>
          ) : !invitations || invitations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-48 p-0">
                <EmptyState
                  title="No pending invitations"
                  description="There are currently no active invitation links awaiting acceptance."
                  action={
                    onInviteClick && (
                      <Button variant="outline" size="sm" onClick={onInviteClick}>
                        Invite your first team member
                      </Button>
                    )
                  }
                  className="border-none rounded-none"
                />
              </TableCell>
            </TableRow>
          ) : (
            invitations.map((inv) => {
              const isExpired = new Date(inv.expiresAt).getTime() <= Date.now();
              return (
                <TableRow key={inv.id}>
                  <TableCell>
                    <code className="text-xs font-mono text-slate-800 font-semibold">
                      {inv.email}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize text-xs">
                      {inv.role.replace(/_/g, ' ').toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {inv.scopeMode === 'ALL_BRANDS' ? 'All Brands' : 'Restricted'}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={isExpired ? 'danger' : 'warning'} className="text-xs">
                      {isExpired ? 'Expired' : new Date(inv.expiresAt).toLocaleDateString()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRevokingInvitation(inv)}
                      id={`revoke-invitation-${inv.email}`}
                      className="h-8 px-2.5 text-xs text-slate-600 hover:text-red-700 hover:border-red-300"
                    >
                      <Trash2 className="h-3 w-3 mr-1 text-red-600" />
                      Revoke
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* Revocation Confirmation Dialog */}
      <Dialog
        open={Boolean(revokingInvitation)}
        onOpenChange={(open) => !open && setRevokingInvitation(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Revoke Pending Invitation</DialogTitle>
            <DialogDescription>
              Revoke invitation for <strong className="font-semibold">{revokingInvitation?.email}</strong>? The generated invitation link will immediately stop functioning.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setRevokingInvitation(null)}
              disabled={revokeMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRevoke}
              disabled={revokeMutation.isPending}
              id="confirm-revoke-invitation-btn"
            >
              {revokeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Revoking...
                </>
              ) : (
                'Revoke Invitation'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
