import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { browserClient } from '@/lib/http/browser-client';

export function useGbpPosts({
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
    queryKey: ['gbp-posts', tenantSlug, brandId, locationId, page, pageSize],
    queryFn: async () => {
      const search = new URLSearchParams({ brandId, page: page.toString(), pageSize: pageSize.toString() });
      if (locationId) search.append('locationId', locationId);

      const res = await browserClient.get(`/tenants/${tenantSlug}/gbp/posts?${search.toString()}`);
      return res.data;
    },
  });
}

export function useSyncGbpPosts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenantSlug, locationId }: { tenantSlug: string; locationId: string }) => {
      const res = await browserClient.post(`/tenants/${tenantSlug}/gbp/posts/sync?locationId=${locationId}`);
      return res.data;
    },
    onSuccess: (_, { tenantSlug }) => {
      queryClient.invalidateQueries({ queryKey: ['gbp-posts', tenantSlug] });
    },
  });
}

export function useCreateGbpPost() {
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
      const res = await browserClient.post(`/tenants/${tenantSlug}/gbp/posts?locationId=${locationId}`, data);
      return res.data;
    },
    onSuccess: (_, { tenantSlug }) => {
      queryClient.invalidateQueries({ queryKey: ['gbp-posts', tenantSlug] });
    },
  });
}

export function useDeleteGbpPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenantSlug, locationId, postId }: { tenantSlug: string; locationId: string; postId: string }) => {
      const res = await browserClient.delete(`/tenants/${tenantSlug}/gbp/posts/${postId}?locationId=${locationId}`);
      return res.data;
    },
    onSuccess: (_, { tenantSlug }) => {
      queryClient.invalidateQueries({ queryKey: ['gbp-posts', tenantSlug] });
    },
  });
}
