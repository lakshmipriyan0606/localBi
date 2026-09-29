import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { browserClient } from '@/lib/http/browser-client';

export function useGbpProfile(tenantSlug: string, locationId: string) {
  return useQuery({
    queryKey: ['gbp-profile', tenantSlug, locationId],
    queryFn: async () => {
      if (!locationId) return null;
      const res = await browserClient.get(`/tenants/${tenantSlug}/gbp/profile?locationId=${locationId}`);
      return res.data;
    },
    enabled: !!locationId,
  });
}

export function useUpdateGbpProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tenantSlug,
      locationId,
      updateMask,
      data,
    }: {
      tenantSlug: string;
      locationId: string;
      updateMask: string;
      data: any;
    }) => {
      const res = await browserClient.patch(
        `/tenants/${tenantSlug}/gbp/profile?locationId=${locationId}&updateMask=${updateMask}`,
        data
      );
      return res.data;
    },
    onSuccess: (_, { tenantSlug, locationId }) => {
      queryClient.invalidateQueries({ queryKey: ['gbp-profile', tenantSlug, locationId] });
    },
  });
}

export function useGbpVerificationState(tenantSlug: string, locationId: string) {
  return useQuery({
    queryKey: ['gbp-verification', tenantSlug, locationId],
    queryFn: async () => {
      if (!locationId) return null;
      const res = await browserClient.get(`/tenants/${tenantSlug}/gbp/verification?locationId=${locationId}`);
      return res.data;
    },
    enabled: !!locationId,
  });
}
