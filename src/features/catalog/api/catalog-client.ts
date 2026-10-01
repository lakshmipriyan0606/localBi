import { browserClient } from '@/lib/http/browser-client';
import {
  ProductDto,
  ProductListResponse,
  CategoryDto,
  CategoryListResponse,
  StoreProductsResponse,
} from '../types/catalog-dto';
import { ProductFormInput, CategoryFormInput, BulkStoreMappingInput } from '../schemas/catalog-schema';

export const catalogClient = {
  // --- Products ---
  async listProducts(
    tenantSlug: string,
    filters?: {
      brandId?: string;
      categoryId?: string;
      status?: string;
      publishStatus?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
    signal?: AbortSignal
  ): Promise<ProductListResponse> {
    const params = new URLSearchParams();
    if (filters?.brandId) params.set('brandId', filters.brandId);
    if (filters?.categoryId) params.set('categoryId', filters.categoryId);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.publishStatus) params.set('publishStatus', filters.publishStatus);
    if (filters?.search) params.set('search', filters.search);
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.limit) params.set('limit', String(filters.limit));

    const res = await browserClient.get<ProductListResponse>(
      `/tenants/${tenantSlug}/products?${params.toString()}`,
      signal ? { signal } : {}
    );
    return res.data;
  },

  async getProduct(tenantSlug: string, productId: string): Promise<{ product: ProductDto }> {
    const res = await browserClient.get<{ product: ProductDto }>(
      `/tenants/${tenantSlug}/products/${productId}`
    );
    return res.data;
  },

  async createProduct(tenantSlug: string, data: ProductFormInput): Promise<{ product: ProductDto }> {
    const res = await browserClient.post<{ product: ProductDto }>(
      `/tenants/${tenantSlug}/products`,
      data
    );
    return res.data;
  },

  async updateProduct(
    tenantSlug: string,
    productId: string,
    data: Partial<ProductFormInput>
  ): Promise<{ product: ProductDto }> {
    const res = await browserClient.patch<{ product: ProductDto }>(
      `/tenants/${tenantSlug}/products/${productId}`,
      data
    );
    return res.data;
  },

  async archiveProduct(tenantSlug: string, productId: string): Promise<{ success: boolean }> {
    const res = await browserClient.delete<{ success: boolean }>(
      `/tenants/${tenantSlug}/products/${productId}`
    );
    return res.data;
  },

  // --- Categories ---
  async listCategories(
    tenantSlug: string,
    filters?: { brandId?: string; status?: string },
    signal?: AbortSignal
  ): Promise<CategoryListResponse> {
    const params = new URLSearchParams();
    if (filters?.brandId) params.set('brandId', filters.brandId);
    if (filters?.status) params.set('status', filters.status);

    const res = await browserClient.get<CategoryListResponse>(
      `/tenants/${tenantSlug}/categories?${params.toString()}`,
      signal ? { signal } : {}
    );
    return res.data;
  },

  async createCategory(tenantSlug: string, data: CategoryFormInput): Promise<{ category: CategoryDto }> {
    const res = await browserClient.post<{ category: CategoryDto }>(
      `/tenants/${tenantSlug}/categories`,
      data
    );
    return res.data;
  },

  async updateCategory(
    tenantSlug: string,
    categoryId: string,
    data: Partial<CategoryFormInput> & { status?: 'ACTIVE' | 'INACTIVE' }
  ): Promise<{ category: CategoryDto }> {
    const res = await browserClient.patch<{ category: CategoryDto }>(
      `/tenants/${tenantSlug}/categories/${categoryId}`,
      data
    );
    return res.data;
  },

  async archiveCategory(tenantSlug: string, categoryId: string): Promise<{ success: boolean }> {
    const res = await browserClient.delete<{ success: boolean }>(
      `/tenants/${tenantSlug}/categories/${categoryId}`
    );
    return res.data;
  },

  // --- Store Products ---
  async listStoreProducts(
    tenantSlug: string,
    storeId: string,
    filters?: { search?: string; categoryId?: string; isAvailable?: boolean },
    signal?: AbortSignal
  ): Promise<StoreProductsResponse> {
    const params = new URLSearchParams();
    if (filters?.search) params.set('search', filters.search);
    if (filters?.categoryId) params.set('categoryId', filters.categoryId);
    if (filters?.isAvailable !== undefined) params.set('isAvailable', String(filters.isAvailable));

    const res = await browserClient.get<StoreProductsResponse>(
      `/tenants/${tenantSlug}/catalog/stores/${storeId}/products?${params.toString()}`,
      signal ? { signal } : {}
    );
    return res.data;
  },

  async bulkUpdateStoreProducts(
    tenantSlug: string,
    storeId: string,
    brandId: string,
    updates: BulkStoreMappingInput['updates']
  ): Promise<{ success: boolean; updatedCount: number }> {
    const res = await browserClient.put<{ success: boolean; updatedCount: number }>(
      `/tenants/${tenantSlug}/catalog/stores/${storeId}/products`,
      { brandId, updates }
    );
    return res.data;
  },

  async saveBulkMapping(
    tenantSlug: string,
    payload: BulkStoreMappingInput
  ): Promise<{ success: boolean; updatedCount?: number; added?: number }> {
    const res = await browserClient.post<{ success: boolean; updatedCount?: number; added?: number }>(
      `/tenants/${tenantSlug}/catalog/mapping`,
      payload
    );
    return res.data;
  },

  async runMigration(
    tenantSlug: string
  ): Promise<{ success: boolean; report: Record<string, unknown> }> {
    const res = await browserClient.post<{ success: boolean; report: Record<string, unknown> }>(
      `/tenants/${tenantSlug}/catalog/migrate`,
      {}
    );
    return res.data;
  },
};
