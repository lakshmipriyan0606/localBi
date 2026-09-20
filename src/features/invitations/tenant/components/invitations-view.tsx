'use client';

import { InvitationTable } from './invitation-table';
import { InvitationDialog } from './invitation-dialog';
import { useTenantInvitationsQuery } from '../hooks/use-tenant-invitations';
import { ErrorState } from '@/components/ui/error-state';
import { PageHeader } from '@/components/layout/page-header';

interface BrandOption {
  id: string;
  name: string;
}

interface InvitationsViewProps {
  tenantSlug: string;
  brands: BrandOption[];
}

export function InvitationsView({ tenantSlug, brands }: InvitationsViewProps) {
  const { data, isLoading, isFetching, isError, error, refetch } = useTenantInvitationsQuery(tenantSlug);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pending Invitations"
        description="Send email invitations to new team members and set their role before they join."
        actions={<InvitationDialog tenantSlug={tenantSlug} brands={brands} />}
      />

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
          isLoading={isLoading || isFetching}
        />
      )}
    </div>
  );
}
