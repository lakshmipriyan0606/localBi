import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantQueryKeys } from '@/lib/query/query-keys';
import { catalogClient } from '../api/catalog-client';
import { ProductFormInput, CategoryFormInput, BulkStoreMappingInput } from '../schemas/catalog-schema';

export function useProducts(
  tenantSlug: string,
  filters?: {
    brandId?: string;
    categoryId?: string;
    status?: string;
    publishStatus?: string;
    search?: string;
    page?: number;
    limit?: number;
  }
) {
  return useQuery({
    queryKey: tenantQueryKeys.catalog.products(tenantSlug, filters),
    queryFn: ({ signal }) => catalogClient.listProducts(tenantSlug, filters, signal),
    enabled: Boolean(tenantSlug),
  });
}

export function useProduct(tenantSlug: string, productId: string) {
  return useQuery({
    queryKey: tenantQueryKeys.catalog.productDetail(tenantSlug, productId),
    queryFn: () => catalogClient.getProduct(tenantSlug, productId),
    enabled: Boolean(tenantSlug && productId),
  });
}

export function useCreateProduct(tenantSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ProductFormInput) => catalogClient.createProduct(tenantSlug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.catalog.products(tenantSlug),
      });
    },
  });
}

export function useUpdateProduct(tenantSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
      data,
    }: {
      productId: string;
      data: Partial<ProductFormInput>;
    }) => catalogClient.updateProduct(tenantSlug, productId, data),
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.catalog.products(tenantSlug),
      });
      queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.catalog.productDetail(tenantSlug, variables.productId),
      });
    },
  });
}

export function useArchiveProduct(tenantSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => catalogClient.archiveProduct(tenantSlug, productId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.catalog.products(tenantSlug),
      });
    },
  });
}

export function useCategories(
  tenantSlug: string,
  filters?: { brandId?: string; status?: string }
) {
  return useQuery({
    queryKey: tenantQueryKeys.catalog.categories(tenantSlug, filters),
    queryFn: ({ signal }) => catalogClient.listCategories(tenantSlug, filters, signal),
    enabled: Boolean(tenantSlug),
  });
}

export function useCreateCategory(tenantSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CategoryFormInput) => catalogClient.createCategory(tenantSlug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.catalog.categories(tenantSlug),
      });
    },
  });
}

export function useUpdateCategory(tenantSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      categoryId,
      data,
    }: {
      categoryId: string;
      data: Partial<CategoryFormInput> & { status?: 'ACTIVE' | 'INACTIVE' };
    }) => catalogClient.updateCategory(tenantSlug, categoryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.catalog.categories(tenantSlug),
      });
    },
  });
}

export function useArchiveCategory(tenantSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (categoryId: string) => catalogClient.archiveCategory(tenantSlug, categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.catalog.categories(tenantSlug),
      });
    },
  });
}

export function useStoreProducts(
  tenantSlug: string,
  storeId: string,
  filters?: { search?: string; categoryId?: string; isAvailable?: boolean }
) {
  return useQuery({
    queryKey: tenantQueryKeys.catalog.storeProducts(tenantSlug, storeId, filters),
    queryFn: ({ signal }) => catalogClient.listStoreProducts(tenantSlug, storeId, filters, signal),
    enabled: Boolean(tenantSlug && storeId),
  });
}

export function useBulkUpdateStoreProducts(tenantSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      storeId,
      brandId,
      updates,
    }: {
      storeId: string;
      brandId: string;
      updates: BulkStoreMappingInput['updates'];
    }) => catalogClient.bulkUpdateStoreProducts(tenantSlug, storeId, brandId, updates),
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.catalog.storeProducts(tenantSlug, variables.storeId),
      });
      queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.catalog.products(tenantSlug),
      });
    },
  });
}

export function useSaveBulkMapping(tenantSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BulkStoreMappingInput) =>
      catalogClient.saveBulkMapping(tenantSlug, payload),
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.catalog.storeProducts(tenantSlug, variables.storeId),
      });
      queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.catalog.products(tenantSlug),
      });
    },
  });
}

export function useRunCatalogMigration(tenantSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => catalogClient.runMigration(tenantSlug),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: tenantQueryKeys.catalog.all(tenantSlug),
      });
    },
  });
}
