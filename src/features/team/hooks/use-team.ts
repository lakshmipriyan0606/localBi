import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamClient } from '../api/team-client';
import { UpdateMemberRoleInput } from '../schemas/team-member-schema';
import { tenantQueryKeys } from '@/lib/query/query-keys';

export function useTeamQuery(tenantSlug: string) {
  return useQuery({
    queryKey: tenantQueryKeys.team.list(tenantSlug),
    queryFn: ({ signal }) => teamClient.listMembers(tenantSlug, signal),
  });
}

export function useUpdateMemberMutation(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      membershipId,
      data,
    }: {
      membershipId: string;
      data: UpdateMemberRoleInput;
    }) => teamClient.updateMemberRoleAndScope(tenantSlug, membershipId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.team.all(tenantSlug),
      });
    },
  });
}

export function useSuspendMemberMutation(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (membershipId: string) => teamClient.suspendMember(tenantSlug, membershipId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.team.all(tenantSlug),
      });
    },
  });
}

export function useRemoveMemberMutation(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (membershipId: string) => teamClient.removeMember(tenantSlug, membershipId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.team.all(tenantSlug),
      });
    },
  });
}
