import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { brandClient } from '../api/brand-client';
import { BrandFormInput } from '../schemas/brand-schema';
import { tenantQueryKeys, NormalizedBrandFilters } from '@/lib/query/query-keys';

export function useBrandsQuery(tenantSlug: string, filters?: NormalizedBrandFilters) {
  return useQuery({
    queryKey: tenantQueryKeys.brands.list(tenantSlug, filters),
    queryFn: ({ signal }) => brandClient.listBrands(tenantSlug, filters, signal),
  });
}

export function useCreateBrandMutation(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BrandFormInput) => brandClient.createBrand(tenantSlug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.brands.all(tenantSlug),
      });
    },
  });
}

export function useUpdateBrandMutation(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      brandId,
      data,
    }: {
      brandId: string;
      data: BrandFormInput & { version: number };
    }) => brandClient.updateBrand(tenantSlug, brandId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.brands.all(tenantSlug),
      });
    },
  });
}

export function useArchiveBrandMutation(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ brandId, version }: { brandId: string; version: number }) =>
      brandClient.archiveBrand(tenantSlug, brandId, version),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.brands.all(tenantSlug),
      });
    },
  });
}
