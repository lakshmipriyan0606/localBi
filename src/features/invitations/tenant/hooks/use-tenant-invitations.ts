import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantInvitationClient } from '../api/tenant-invitation-client';
import { CreateInvitationInput } from '../schemas/create-invitation-schema';
import { tenantQueryKeys } from '@/lib/query/query-keys';

export function useTenantInvitationsQuery(tenantSlug: string) {
  return useQuery({
    queryKey: tenantQueryKeys.invitations.list(tenantSlug),
    queryFn: ({ signal }) => tenantInvitationClient.listInvitations(tenantSlug, signal),
  });
}

export function useCreateTenantInvitationMutation(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInvitationInput) =>
      tenantInvitationClient.createInvitation(tenantSlug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.invitations.all(tenantSlug),
      });
    },
  });
}

export function useRevokeTenantInvitationMutation(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) =>
      tenantInvitationClient.revokeInvitation(tenantSlug, invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.invitations.all(tenantSlug),
      });
    },
  });
}
