'use client';

import Link from 'next/link';
import { UserPlus } from 'lucide-react';
import { TeamTable } from './team-table';
import { useTeamQuery } from '../hooks/use-team';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';

interface BrandOption {
  id: string;
  name: string;
}

interface TeamViewProps {
  tenantSlug: string;
  brands: BrandOption[];
}

export function TeamView({ tenantSlug, brands }: TeamViewProps) {
  const { data, isLoading, isError, error, refetch } = useTeamQuery(tenantSlug);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Team & Permissions
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage organization members, assign roles, and configure brand/location access scopes.
          </p>
        </div>

        <Button asChild className="gap-2" id="invite-member-btn">
          <Link href={`/t/${tenantSlug}/invitations`}>
            <UserPlus className="h-4 w-4" />
            Invite Member
          </Link>
        </Button>
      </div>

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
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
