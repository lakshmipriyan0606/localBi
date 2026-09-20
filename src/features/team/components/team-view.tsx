'use client';

import Link from 'next/link';
import { UserPlus } from 'lucide-react';
import { TeamTable } from './team-table';
import { useTeamQuery } from '../hooks/use-team';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { PageHeader } from '@/components/layout/page-header';

interface BrandOption {
  id: string;
  name: string;
}

interface TeamViewProps {
  tenantSlug: string;
  brands: BrandOption[];
}

export function TeamView({ tenantSlug, brands }: TeamViewProps) {
  const { data, isLoading, isFetching, isError, error, refetch } = useTeamQuery(tenantSlug);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team & Permissions"
        description="Manage your team members, set their roles, and control which brands or locations they can access."
        actions={
          <Button asChild variant="primary" className="gap-2" id="invite-member-btn">
            <Link href={`/t/${tenantSlug}/invitations`}>
              <UserPlus className="h-4 w-4" />
              Invite Member
            </Link>
          </Button>
        }
      />

      {isError ? (
        <ErrorState
          title="Failed to load team members"
          message={error?.message || 'An error occurred while loading organization members.'}
          onRetry={() => refetch()}
        />
      ) : (
        <TeamTable
          tenantSlug={tenantSlug}
          members={data?.members}
          brands={brands}
          isLoading={isLoading || isFetching}
        />
      )}
    </div>
  );
}
