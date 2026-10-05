'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Building2,
  Store,
  Search,
  Plus,
  Edit,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  AlertCircle,
  MoreVertical,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Archive,
  UserCheck,
  UserX,
} from 'lucide-react';
import {
  useAgencyClientsQuery,
  useCreateClientMutation,
  useUpdateClientMutation,
  useSuspendClientMutation,
  useUnsuspendClientMutation,
  useArchiveClientMutation,
  useClientGrantsQuery,
  useCreateGrantMutation,
  useDeleteGrantMutation,
} from '../hooks/use-agency';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ClientAccountDto } from '@/modules/agency/agency-types';
import { RoleType } from '@/shared/authorization/roles';

interface ClientManagementViewProps {
  tenantSlug: string;
}

export function ClientManagementView({ tenantSlug }: ClientManagementViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'>('ALL');

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientAccountDto | null>(null);
  const [managingGrantsClient, setManagingGrantsClient] = useState<ClientAccountDto | null>(null);
  const [actionClient, setActionClient] = useState<{
    client: ClientAccountDto;
    type: 'suspend' | 'unsuspend' | 'archive';
  } | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    primaryContact: '',
    contactEmail: '',
    contactPhone: '',
    timezone: 'UTC',
    locale: 'en-US',
  });

  const [grantFormData, setGrantFormData] = useState<{
    userId: string;
    role: RoleType;
    scopeType: 'CLIENT' | 'BRAND' | 'LOCATION';
  }>({
    userId: '',
    role: 'CLIENT_VIEWER',
    scopeType: 'CLIENT',
  });

  // Queries & Mutations
  const { data: clientsData, isLoading, isError, error, refetch } = useAgencyClientsQuery(tenantSlug, {
    pageSize: 100,
  });

  const createClientMutation = useCreateClientMutation(tenantSlug);
  const updateClientMutation = useUpdateClientMutation(tenantSlug, editingClient?.slug || '');
  const suspendClientMutation = useSuspendClientMutation(tenantSlug);
  const unsuspendClientMutation = useUnsuspendClientMutation(tenantSlug);
  const archiveClientMutation = useArchiveClientMutation(tenantSlug);

  const { data: grants, isLoading: isLoadingGrants } = useClientGrantsQuery(
    tenantSlug,
    managingGrantsClient?.slug || ''
  );
  const createGrantMutation = useCreateGrantMutation(tenantSlug, managingGrantsClient?.slug || '');
  const deleteGrantMutation = useDeleteGrantMutation(tenantSlug, managingGrantsClient?.slug || '');

  const clients = clientsData?.clients || [];

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      !searchTerm ||
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.primaryContact && client.primaryContact.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (client.contactEmail && client.contactEmail.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      slug: '',
      primaryContact: '',
      contactEmail: '',
      contactPhone: '',
      timezone: 'UTC',
      locale: 'en-US',
    });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (client: ClientAccountDto) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      slug: client.slug,
      primaryContact: client.primaryContact || '',
      contactEmail: client.contactEmail || '',
      contactPhone: client.contactPhone || '',
      timezone: client.timezone || 'UTC',
      locale: client.locale || 'en-US',
    });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    await createClientMutation.mutateAsync({
      name: formData.name.trim(),
      slug: formData.slug.trim() || undefined,
      primaryContact: formData.primaryContact.trim() || undefined,
      contactEmail: formData.contactEmail.trim() || undefined,
      contactPhone: formData.contactPhone.trim() || undefined,
      timezone: formData.timezone.trim() || undefined,
      locale: formData.locale.trim() || undefined,
    });

    setIsCreateOpen(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient || !formData.name.trim()) return;

    await updateClientMutation.mutateAsync({
      name: formData.name.trim(),
      primaryContact: formData.primaryContact.trim() || null,
      contactEmail: formData.contactEmail.trim() || null,
      contactPhone: formData.contactPhone.trim() || null,
      timezone: formData.timezone.trim() || undefined,
      locale: formData.locale.trim() || undefined,
    });

    setEditingClient(null);
  };

  const handleConfirmAction = async () => {
    if (!actionClient) return;
    const { client, type } = actionClient;

    if (type === 'suspend') {
      await suspendClientMutation.mutateAsync(client.slug);
    } else if (type === 'unsuspend') {
      await unsuspendClientMutation.mutateAsync(client.slug);
    } else if (type === 'archive') {
      await archiveClientMutation.mutateAsync(client.slug);
    }

    setActionClient(null);
  };

  const handleCreateGrantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingGrantsClient || !grantFormData.userId.trim()) return;

    await createGrantMutation.mutateAsync({
      userId: grantFormData.userId.trim(),
      role: grantFormData.role,
      scopeType: grantFormData.scopeType,
    });

    setGrantFormData({
      userId: '',
      role: 'CLIENT_VIEWER',
      scopeType: 'CLIENT',
    });
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Client Accounts"
        description="Create and organize client organizations, assign scoped permissions, and manage client lifecycle states."
        actions={
          <Button
            variant="primary"
            className="gap-2"
            id="new-client-account-btn"
            onClick={handleOpenCreate}
          >
            <Plus className="h-4 w-4" />
            New Client Account
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name, slug, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex rounded-lg border border-slate-200 bg-slate-50/50 p-1 text-xs">
          {(['ALL', 'ACTIVE', 'SUSPENDED', 'ARCHIVED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                statusFilter === status
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {status === 'ALL' ? 'All Accounts' : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Accounts List */}
      <Card className="border-slate-200/80 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : isError ? (
            <div className="p-8">
              <ErrorState
                title="Failed to load client accounts"
                message={error?.message || 'Error communicating with agency service.'}
                onRetry={() => refetch()}
              />
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-900">
                {searchTerm || statusFilter !== 'ALL'
                  ? 'No clients match your filter'
                  : 'No client accounts found'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Add client accounts to separate client data, configure branded portal access, and govern permissions.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900">
                          {client.name}
                        </span>
                        <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          {client.slug}
                        </span>
                        {client.status === 'ACTIVE' && (
                          <Badge variant="success" className="text-[10px] px-2 py-0.5">
                            Active
                          </Badge>
                        )}
                        {client.status === 'SUSPENDED' && (
                          <Badge variant="warning" className="text-[10px] px-2 py-0.5">
                            Suspended
                          </Badge>
                        )}
                        {client.status === 'ARCHIVED' && (
                          <Badge variant="neutral" className="text-[10px] px-2 py-0.5">
                            Archived
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500">
                        {client.contactEmail && (
                          <span>Email: <strong className="text-slate-700 font-medium">{client.contactEmail}</strong></span>
                        )}
                        {client.primaryContact && (
                          <span>Contact: <strong className="text-slate-700 font-medium">{client.primaryContact}</strong></span>
                        )}
                        {client.contactPhone && (
                          <span>Phone: <strong className="text-slate-700 font-medium">{client.contactPhone}</strong></span>
                        )}
                        <span>Timezone: <strong className="text-slate-700 font-medium">{client.timezone}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 justify-end">
                    {/* Brands & Locations Badges */}
                    <div className="flex items-center gap-2 text-xs mr-2">
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium">
                        {client.brandCount ?? 0} Brands
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium">
                        {client.storeCount ?? 0} Stores
                      </span>
                    </div>

                    {/* Manage Access Grants */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => setManagingGrantsClient(client)}
                    >
                      <Shield className="h-3.5 w-3.5 text-indigo-600" />
                      <span>Access Grants</span>
                    </Button>

                    {/* Edit Client */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => handleOpenEdit(client)}
                    >
                      <Edit className="h-3.5 w-3.5 text-slate-600" />
                      <span>Edit</span>
                    </Button>

                    {/* Suspend or Unsuspend */}
                    {client.status === 'ACTIVE' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs text-amber-700 border-amber-200 hover:bg-amber-50"
                        onClick={() => setActionClient({ client, type: 'suspend' })}
                      >
                        <PauseCircle className="h-3.5 w-3.5" />
                        <span>Suspend</span>
                      </Button>
                    )}

                    {client.status === 'SUSPENDED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                        onClick={() => setActionClient({ client, type: 'unsuspend' })}
                      >
                        <PlayCircle className="h-3.5 w-3.5" />
                        <span>Unsuspend</span>
                      </Button>
                    )}

                    {/* Archive */}
                    {client.status !== 'ARCHIVED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs text-slate-600 hover:bg-slate-100"
                        onClick={() => setActionClient({ client, type: 'archive' })}
                      >
                        <Archive className="h-3.5 w-3.5" />
                        <span>Archive</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CREATE CLIENT DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Client Account</DialogTitle>
            <DialogDescription>
              Set up a new client account to isolate client brands, locations, and user access under your agency tenant.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="client-name">Account Name *</Label>
              <Input
                id="client-name"
                placeholder="e.g. Acme Corporation"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="client-slug">Account Slug (Optional)</Label>
              <Input
                id="client-slug"
                placeholder="acme-corp (auto-generated if empty)"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="client-contact">Primary Contact</Label>
                <Input
                  id="client-contact"
                  placeholder="Jane Doe"
                  value={formData.primaryContact}
                  onChange={(e) => setFormData({ ...formData, primaryContact: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="client-email">Contact Email</Label>
                <Input
                  id="client-email"
                  type="email"
                  placeholder="jane@acme.com"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="client-phone">Contact Phone</Label>
                <Input
                  id="client-phone"
                  placeholder="+1 (555) 000-0000"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="client-tz">Timezone</Label>
                <Input
                  id="client-tz"
                  placeholder="America/New_York"
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={createClientMutation.isPending}>
                {createClientMutation.isPending ? 'Creating...' : 'Create Client'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT CLIENT DIALOG */}
      <Dialog open={!!editingClient} onOpenChange={(open) => !open && setEditingClient(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Client Account</DialogTitle>
            <DialogDescription>
              Update primary contact and locale metadata for {editingClient?.name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Account Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-contact">Primary Contact</Label>
                <Input
                  id="edit-contact"
                  value={formData.primaryContact}
                  onChange={(e) => setFormData({ ...formData, primaryContact: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-email">Contact Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-phone">Contact Phone</Label>
                <Input
                  id="edit-phone"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-tz">Timezone</Label>
                <Input
                  id="edit-tz"
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setEditingClient(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={updateClientMutation.isPending}>
                {updateClientMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CONFIRM ACTION (SUSPEND / UNSUSPEND / ARCHIVE) DIALOG */}
      <Dialog open={!!actionClient} onOpenChange={(open) => !open && setActionClient(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionClient?.type === 'suspend' && 'Suspend Client Account'}
              {actionClient?.type === 'unsuspend' && 'Unsuspend Client Account'}
              {actionClient?.type === 'archive' && 'Archive Client Account'}
            </DialogTitle>
            <DialogDescription>
              {actionClient?.type === 'suspend' && (
                <span>
                  Suspending <strong>{actionClient.client.name}</strong> immediately blocks client users from logging in or viewing reports. All data, reports, and agency admin access are strictly preserved.
                </span>
              )}
              {actionClient?.type === 'unsuspend' && (
                <span>
                  Unsuspending <strong>{actionClient.client.name}</strong> restores login access and portal permissions for all client users.
                </span>
              )}
              {actionClient?.type === 'archive' && (
                <span>
                  Archiving <strong>{actionClient.client.name}</strong> will remove it from active client lists. Historical analytics and data are preserved.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setActionClient(null)}>
              Cancel
            </Button>
            <Button
              variant={actionClient?.type === 'suspend' ? 'danger' : 'primary'}
              onClick={handleConfirmAction}
              disabled={
                suspendClientMutation.isPending ||
                unsuspendClientMutation.isPending ||
                archiveClientMutation.isPending
              }
            >
              {actionClient?.type === 'suspend' && (suspendClientMutation.isPending ? 'Suspending...' : 'Confirm Suspend')}
              {actionClient?.type === 'unsuspend' && (unsuspendClientMutation.isPending ? 'Resuming...' : 'Confirm Unsuspend')}
              {actionClient?.type === 'archive' && (archiveClientMutation.isPending ? 'Archiving...' : 'Confirm Archive')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MANAGE SCOPED ACCESS GRANTS DIALOG */}
      <Dialog open={!!managingGrantsClient} onOpenChange={(open) => !open && setManagingGrantsClient(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-600" />
              <span>Access Grants — {managingGrantsClient?.name}</span>
            </DialogTitle>
            <DialogDescription>
              Control granular user permissions scoped to this client account without granting agency-wide tenant access.
            </DialogDescription>
          </DialogHeader>

          {/* Existing Grants List */}
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 border-b border-slate-200">
                Active Scoped Grants ({grants?.length || 0})
              </div>
              <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {isLoadingGrants ? (
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : !grants || grants.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No individual user access grants assigned to this client account yet.
                  </div>
                ) : (
                  grants.map((grant) => (
                    <div key={grant.id} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-mono text-[11px] text-slate-800">User: {grant.userId}</div>
                        <div className="flex items-center gap-2 mt-0.5 text-slate-500">
                          <span className="font-medium text-slate-700">{grant.role}</span>
                          <span>•</span>
                          <span>Scope: {grant.scopeType}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => deleteGrantMutation.mutate(grant.id)}
                        disabled={deleteGrantMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Grant Access Form */}
            <form onSubmit={handleCreateGrantSubmit} className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
              <div className="text-xs font-semibold text-slate-700">Assign New Access Grant</div>

              <div className="space-y-1.5">
                <Label htmlFor="grant-user-id" className="text-xs">User ID *</Label>
                <Input
                  id="grant-user-id"
                  placeholder="Target User UUID"
                  value={grantFormData.userId}
                  onChange={(e) => setGrantFormData({ ...grantFormData, userId: e.target.value })}
                  className="h-8 text-xs font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="grant-role" className="text-xs">Role</Label>
                  <select
                    id="grant-role"
                    value={grantFormData.role}
                    onChange={(e) => setGrantFormData({ ...grantFormData, role: e.target.value as RoleType })}
                    className="w-full h-8 px-2.5 rounded-md border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="CLIENT_VIEWER">CLIENT_VIEWER (Read-only)</option>
                    <option value="CLIENT_EDITOR">CLIENT_EDITOR (Edit / Content)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="grant-scope" className="text-xs">Scope Type</Label>
                  <select
                    id="grant-scope"
                    value={grantFormData.scopeType}
                    onChange={(e) => setGrantFormData({ ...grantFormData, scopeType: e.target.value as any })}
                    className="w-full h-8 px-2.5 rounded-md border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="CLIENT">Client-Wide</option>
                    <option value="BRAND">Brand-Specific</option>
                    <option value="LOCATION">Location-Specific</option>
                  </select>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="w-full h-8 text-xs gap-1.5 mt-2"
                disabled={createGrantMutation.isPending}
              >
                <Plus className="h-3.5 w-3.5" />
                {createGrantMutation.isPending ? 'Granting...' : 'Assign Scoped Grant'}
              </Button>
            </form>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setManagingGrantsClient(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
