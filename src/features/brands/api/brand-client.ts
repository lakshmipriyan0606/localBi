import { browserClient } from '@/lib/http/browser-client';
import { BrandDto, BrandListResponse } from '../types/brand-dto';
import { BrandFormInput } from '../schemas/brand-schema';
import { NormalizedBrandFilters } from '@/lib/query/query-keys';

export const brandClient = {
  async listBrands(
    tenantSlug: string,
    filters?: NormalizedBrandFilters,
    signal?: AbortSignal
  ): Promise<BrandListResponse> {
    const params = new URLSearchParams();
    if (filters?.search) {
      params.set('search', filters.search);
    }
    if (filters?.includeArchived) {
      params.set('includeArchived', 'true');
    }

    const config = signal ? { signal } : {};
    const res = await browserClient.get<BrandListResponse>(
      `/tenants/${tenantSlug}/brands?${params.toString()}`,
      config
    );
    return res.data;
  },

  async createBrand(tenantSlug: string, data: BrandFormInput): Promise<{ brand: BrandDto }> {
    const res = await browserClient.post<{ brand: BrandDto }>(
      `/tenants/${tenantSlug}/brands`,
      data
    );
    return res.data;
  },

  async updateBrand(
    tenantSlug: string,
    brandId: string,
    data: BrandFormInput & { version: number }
  ): Promise<{ brand: BrandDto }> {
    const res = await browserClient.put<{ brand: BrandDto }>(
      `/tenants/${tenantSlug}/brands/${brandId}`,
      data
    );
    return res.data;
  },

  async archiveBrand(
    tenantSlug: string,
    brandId: string,
    version: number
  ): Promise<{ success: boolean }> {
    const res = await browserClient.delete<{ success: boolean }>(
      `/tenants/${tenantSlug}/brands/${brandId}?version=${version}`
    );
    return res.data;
  },
};
