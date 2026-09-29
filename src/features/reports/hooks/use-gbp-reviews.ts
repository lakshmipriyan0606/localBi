import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { browserClient } from '@/lib/http/browser-client';

export interface UseGbpReviewsFilter {
  tenantSlug: string;
  brandId: string;
  locationId?: string;
  filterBy?: 'all' | 'replied' | 'unreplied' | 'low';
  page?: number;
  pageSize?: number;
}

export function useGbpReviews(filters: UseGbpReviewsFilter) {
  return useQuery({
    queryKey: [
      'gbp',
      'reviews',
      filters.tenantSlug,
      filters.brandId,
      filters.locationId || 'all',
      filters.filterBy || 'all',
      filters.page || 1,
      filters.pageSize || 50,
    ],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        brandId: filters.brandId,
      });
      if (filters.locationId) params.append('locationId', filters.locationId);
      if (filters.filterBy) params.append('filterBy', filters.filterBy);
      if (filters.page) params.append('page', String(filters.page));
      if (filters.pageSize) params.append('pageSize', String(filters.pageSize));

      const res = await browserClient.get(
        `/tenants/${filters.tenantSlug}/gbp/reviews?${params.toString()}`,
        { signal }
      );
      return res.data.data;
    },
    enabled: Boolean(filters.tenantSlug && filters.brandId),
    staleTime: 0,
  });
}

export function useSyncGbpReviews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenantSlug, brandId, locationId }: { tenantSlug: string; brandId: string; locationId?: string }) => {
      const res = await browserClient.post(
        `/tenants/${tenantSlug}/gbp/reviews/sync?forceDirect=true`,
        { brandId, locationId },
        { toast: { success: 'Review sync completed inline!', error: 'Sync failed, please check the network tab!' } }
      );
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['gbp', 'reviews', variables.tenantSlug, variables.brandId],
      });
    },
  });
}

export function useReplyToReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenantSlug, reviewId, comment }: { tenantSlug: string; reviewId: string; comment: string }) => {
      const res = await browserClient.put(
        `/tenants/${tenantSlug}/gbp/reviews/${reviewId}`,
        { comment },
        { toast: { success: 'Reply posted successfully' } }
      );
      return res.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['gbp', 'reviews', variables.tenantSlug],
      });
    },
  });
}

export function useDeleteReviewReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenantSlug, reviewId }: { tenantSlug: string; reviewId: string }) => {
      const res = await browserClient.delete(
        `/tenants/${tenantSlug}/gbp/reviews/${reviewId}`,
        { toast: { success: 'Reply deleted successfully' } }
      );
      return res.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['gbp', 'reviews', variables.tenantSlug],
      });
    },
  });
}
