import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { browserClient } from '@/lib/http/browser-client';

export function useGbpMedia({
  tenantSlug,
  brandId,
  locationId,
  page = 1,
  pageSize = 50,
}: {
  tenantSlug: string;
  brandId: string;
  locationId?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: ['gbp-media', tenantSlug, brandId, locationId, page, pageSize],
    queryFn: async () => {
      const search = new URLSearchParams({ brandId, page: page.toString(), pageSize: pageSize.toString() });
      if (locationId) search.append('locationId', locationId);

      const res = await browserClient.get(`/tenants/${tenantSlug}/gbp/media?${search.toString()}`);
      return res.data;
    },
  });
}

export function useSyncGbpMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenantSlug, locationId }: { tenantSlug: string; locationId: string }) => {
      const res = await browserClient.post(`/tenants/${tenantSlug}/gbp/media/sync?locationId=${locationId}`);
      return res.data;
    },
    onSuccess: (_, { tenantSlug }) => {
      queryClient.invalidateQueries({ queryKey: ['gbp-media', tenantSlug] });
    },
  });
}

export function useCreateGbpMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tenantSlug,
      locationId,
      data,
    }: {
      tenantSlug: string;
      locationId: string;
      data: any;
    }) => {
      const res = await browserClient.post(`/tenants/${tenantSlug}/gbp/media?locationId=${locationId}`, data);
      return res.data;
    },
    onSuccess: (_, { tenantSlug }) => {
      queryClient.invalidateQueries({ queryKey: ['gbp-media', tenantSlug] });
    },
  });
}

export function useDeleteGbpMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenantSlug, locationId, mediaId }: { tenantSlug: string; locationId: string; mediaId: string }) => {
      const res = await browserClient.delete(`/tenants/${tenantSlug}/gbp/media/${mediaId}?locationId=${locationId}`);
      return res.data;
    },
    onSuccess: (_, { tenantSlug }) => {
      queryClient.invalidateQueries({ queryKey: ['gbp-media', tenantSlug] });
    },
  });
}
