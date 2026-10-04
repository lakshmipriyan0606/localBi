import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  agencyClient,
  ClientListResponse,
} from '../api/agency-client';
import {
  CreateClientAccountInput,
  UpdateClientAccountInput,
  ListClientsOptions,
  UpdateWhiteLabelInput,
  CreateAccessGrantInput,
  EntitlementDto,
} from '@/modules/agency/agency-types';
import { tenantQueryKeys } from '@/lib/query/query-keys';

export function useAgencyClientsQuery(tenantSlug: string, options?: ListClientsOptions) {
  return useQuery({
    queryKey: tenantQueryKeys.agency.clients(tenantSlug, options as Record<string, unknown>),
    queryFn: ({ signal }) => agencyClient.listClients(tenantSlug, options, signal),
  });
}

export function useAgencyClientDetailQuery(tenantSlug: string, clientSlug: string) {
  return useQuery({
    queryKey: tenantQueryKeys.agency.clientDetail(tenantSlug, clientSlug),
    queryFn: ({ signal }) => agencyClient.getClient(tenantSlug, clientSlug, signal),
    enabled: !!clientSlug,
  });
}

export function useCreateClientMutation(tenantSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateClientAccountInput) =>
      agencyClient.createClient(tenantSlug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.agency.all(tenantSlug),
      });
    },
  });
}

export function useUpdateClientMutation(tenantSlug: string, clientSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateClientAccountInput) =>
      agencyClient.updateClient(tenantSlug, clientSlug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.agency.clientDetail(tenantSlug, clientSlug),
      });
      queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.agency.all(tenantSlug),
      });
    },
  });
}

export function useSuspendClientMutation(tenantSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (clientSlug: string) => agencyClient.suspendClient(tenantSlug, clientSlug),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.agency.all(tenantSlug),
      });
    },
  });
}

export function useUnsuspendClientMutation(tenantSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (clientSlug: string) => agencyClient.unsuspendClient(tenantSlug, clientSlug),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.agency.all(tenantSlug),
      });
    },
  });
}

export function useArchiveClientMutation(tenantSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (clientSlug: string) => agencyClient.archiveClient(tenantSlug, clientSlug),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.agency.all(tenantSlug),
      });
    },
  });
}

export function useClientGrantsQuery(tenantSlug: string, clientSlug: string) {
  return useQuery({
    queryKey: tenantQueryKeys.agency.grants(tenantSlug, clientSlug),
    queryFn: ({ signal }) => agencyClient.listGrants(tenantSlug, clientSlug, signal),
    enabled: !!clientSlug,
  });
}

export function useCreateGrantMutation(tenantSlug: string, clientSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAccessGrantInput) =>
      agencyClient.createGrant(tenantSlug, clientSlug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.agency.grants(tenantSlug, clientSlug),
      });
    },
  });
}

export function useDeleteGrantMutation(tenantSlug: string, clientSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (grantId: string) =>
      agencyClient.deleteGrant(tenantSlug, clientSlug, grantId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.agency.grants(tenantSlug, clientSlug),
      });
    },
  });
}

export function useWhiteLabelQuery(tenantSlug: string) {
  return useQuery({
    queryKey: tenantQueryKeys.agency.whitelabel(tenantSlug),
    queryFn: ({ signal }) => agencyClient.getWhiteLabel(tenantSlug, signal),
  });
}

export function useUpdateWhiteLabelMutation(tenantSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateWhiteLabelInput) =>
      agencyClient.updateWhiteLabel(tenantSlug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.agency.whitelabel(tenantSlug),
      });
    },
  });
}

export function usePortalDomainsQuery(tenantSlug: string) {
  return useQuery({
    queryKey: tenantQueryKeys.agency.portalDomains(tenantSlug),
    queryFn: ({ signal }) => agencyClient.listPortalDomains(tenantSlug, signal),
  });
}

export function useCreatePortalDomainMutation(tenantSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (hostname: string) =>
      agencyClient.createPortalDomain(tenantSlug, hostname),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.agency.portalDomains(tenantSlug),
      });
    },
  });
}

export function useVerifyPortalDomainMutation(tenantSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (domainId: string) =>
      agencyClient.verifyPortalDomain(tenantSlug, domainId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.agency.portalDomains(tenantSlug),
      });
      queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.agency.whitelabel(tenantSlug),
      });
    },
  });
}

export function useDeletePortalDomainMutation(tenantSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (domainId: string) =>
      agencyClient.deletePortalDomain(tenantSlug, domainId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.agency.portalDomains(tenantSlug),
      });
      queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.agency.whitelabel(tenantSlug),
      });
    },
  });
}

export function useEntitlementsQuery(tenantSlug: string, clientAccountId?: string) {
  return useQuery({
    queryKey: tenantQueryKeys.agency.entitlements(tenantSlug, clientAccountId),
    queryFn: ({ signal }) => agencyClient.getEntitlements(tenantSlug, clientAccountId, signal),
  });
}

export function useUpdateEntitlementMutation(tenantSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      clientAccountId?: string;
      featureKey: string;
      enabled: boolean;
      limits?: Record<string, unknown>;
    }) => agencyClient.updateEntitlement(tenantSlug, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.agency.entitlements(tenantSlug, variables.clientAccountId),
      });
    },
  });
}
