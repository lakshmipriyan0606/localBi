'use client';

import { useState } from 'react';
import { Edit2, ShieldAlert, UserX, AlertCircle, Loader2 } from 'lucide-react';
import { TeamMemberDto } from '../types/team-dto';
import { TeamEditModal } from './team-edit-modal';
import { useSuspendMemberMutation, useRemoveMemberMutation } from '../hooks/use-team';
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
import { Skeleton } from '@/components/ui/skeleton';
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

interface BrandOption {
  id: string;
  name: string;
}

interface TeamTableProps {
  tenantSlug: string;
  members: TeamMemberDto[] | undefined;
  brands: BrandOption[];
  isLoading: boolean;
}

export function TeamTable({
  tenantSlug,
  members,
  brands,
  isLoading,
}: TeamTableProps) {
  const [editingMember, setEditingMember] = useState<TeamMemberDto | null>(null);
  const [suspendingMember, setSuspendingMember] = useState<TeamMemberDto | null>(null);
  const [removingMember, setRemovingMember] = useState<TeamMemberDto | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const suspendMutation = useSuspendMemberMutation(tenantSlug);
  const removeMutation = useRemoveMemberMutation(tenantSlug);

  const handleConfirmSuspend = async () => {
    if (!suspendingMember) return;
    setActionError(null);
    try {
      await suspendMutation.mutateAsync(suspendingMember.id);
      setSuspendingMember(null);
    } catch (err) {
      const normalized = normalizeApiError(err);
      setActionError(normalized.message);
    }
  };

  const handleConfirmRemove = async () => {
    if (!removingMember) return;
    setActionError(null);
    try {
      await removeMutation.mutateAsync(removingMember.id);
      setRemovingMember(null);
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
            <TableHead>Member Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Access Scope</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={`skeleton-team-${i}`}>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
              </TableRow>
            ))
          ) : !members || members.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-48 p-0">
                <EmptyState
                  title="No team members found"
                  description="No members found for this organization."
                  className="border-none rounded-none"
                />
              </TableCell>
            </TableRow>
          ) : (
            members.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-semibold text-slate-900">
                  {member.fullName || '—'}
                </TableCell>
                <TableCell>
                  <code className="text-xs font-mono text-slate-600">
                    {member.email}
                  </code>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="capitalize text-xs">
                    {member.role.replace(/_/g, ' ').toLowerCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">
                  {member.scopeMode === 'ALL_BRANDS' ? (
                    <span className="text-emerald-700 font-medium">All Brands & Locations</span>
                  ) : (
                    <span className="text-amber-700 font-medium">
                      Restricted ({member.brandAccessScopes?.length || 0} brands)
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={member.status === 'ACTIVE' ? 'success' : 'danger'}
                    className="capitalize"
                  >
                    {(member.status || 'ACTIVE').toLowerCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingMember(member)}
                      id={`edit-member-${member.id}`}
                      className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900"
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Role
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSuspendingMember(member)}
                      id={`suspend-member-${member.id}`}
                      className="h-8 px-2.5 text-xs text-slate-600 hover:text-amber-700 hover:border-amber-300"
                    >
                      <ShieldAlert className="h-3 w-3 mr-1 text-amber-600" />
                      Suspend
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRemovingMember(member)}
                      id={`remove-member-${member.id}`}
                      className="h-8 px-2.5 text-xs text-slate-600 hover:text-red-700 hover:border-red-300"
                    >
                      <UserX className="h-3 w-3 mr-1 text-red-600" />
                      Remove
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Edit Role & Scope Dialog */}
      <TeamEditModal
        tenantSlug={tenantSlug}
        member={editingMember}
        brands={brands}
        open={Boolean(editingMember)}
        onOpenChange={(open) => !open && setEditingMember(null)}
      />

      {/* Suspend Confirmation Dialog */}
      <Dialog
        open={Boolean(suspendingMember)}
        onOpenChange={(open) => !open && setSuspendingMember(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Suspend Team Member</DialogTitle>
            <DialogDescription>
              Suspend <strong className="font-semibold">{suspendingMember?.fullName || suspendingMember?.email}</strong>? They will immediately lose access to this organization until reactivated.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setSuspendingMember(null)}
              disabled={suspendMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmSuspend}
              disabled={suspendMutation.isPending}
              id="confirm-suspend-member-btn"
            >
              {suspendMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suspending...
                </>
              ) : (
                'Suspend Access'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <Dialog
        open={Boolean(removingMember)}
        onOpenChange={(open) => !open && setRemovingMember(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove Member from Organization</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently remove{' '}
              <strong className="font-semibold">{removingMember?.fullName || removingMember?.email}</strong>{' '}
              from this workspace? If they are the last Owner, removal will be prevented.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setRemovingMember(null)}
              disabled={removeMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRemove}
              disabled={removeMutation.isPending}
              id="confirm-remove-member-btn"
            >
              {removeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove Member'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
