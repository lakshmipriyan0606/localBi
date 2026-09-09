import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { settingsClient } from '../api/settings-client';
import { TenantSettingsInput } from '../schemas/tenant-settings-schema';
import { authQueryKeys, tenantQueryKeys } from '@/lib/query/query-keys';

export function useUpdateTenantSettingsMutation(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TenantSettingsInput & { version: number }) =>
      settingsClient.updateTenantSettings(tenantSlug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.settings.detail(tenantSlug),
      });
    },
  });
}

export function useSessionsQuery() {
  return useQuery({
    queryKey: authQueryKeys.sessions(),
    queryFn: ({ signal }) => settingsClient.listActiveSessions(signal),
  });
}

export function useRevokeSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => settingsClient.revokeSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: authQueryKeys.sessions(),
      });
    },
  });
}

export function useRevokeAllSessionsMutation() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => settingsClient.revokeAllSessions(),
    onSuccess: () => {
      queryClient.clear();
      router.push('/login');
    },
  });
}
