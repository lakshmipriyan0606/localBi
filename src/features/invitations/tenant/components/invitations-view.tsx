'use client';

import { InvitationTable } from './invitation-table';
import { InvitationDialog } from './invitation-dialog';
import { useTenantInvitationsQuery } from '../hooks/use-tenant-invitations';
import { ErrorState } from '@/components/ui/error-state';

interface BrandOption {
  id: string;
  name: string;
}

interface InvitationsViewProps {
  tenantSlug: string;
  brands: BrandOption[];
}

export function InvitationsView({ tenantSlug, brands }: InvitationsViewProps) {
  const { data, isLoading, isError, error, refetch } = useTenantInvitationsQuery(tenantSlug);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Pending Invitations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Dispatch time-bounded invitations to onboarding team members with pre-assigned roles.
          </p>
        </div>

        <InvitationDialog tenantSlug={tenantSlug} brands={brands} />
      </div>

      {isError ? (
        <ErrorState
          title="Failed to load invitations"
          message={error?.message || 'An error occurred while loading pending invitations.'}
          onRetry={() => refetch()}
        />
      ) : (
        <InvitationTable
          tenantSlug={tenantSlug}
          invitations={data?.invitations}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
