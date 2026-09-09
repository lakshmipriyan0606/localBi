import { browserClient } from '@/lib/http/browser-client';
import { LocationDto, LocationListResponse } from '../types/location-dto';
import { LocationFormInput } from '../schemas/location-schema';
import { NormalizedLocationFilters } from '@/lib/query/query-keys';

export const locationClient = {
  async listLocations(
    tenantSlug: string,
    filters?: NormalizedLocationFilters,
    signal?: AbortSignal
  ): Promise<LocationListResponse> {
    const params = new URLSearchParams();
    if (filters?.search) {
      params.set('search', filters.search);
    }
    if (filters?.brandId) {
      params.set('brandId', filters.brandId);
    }
    if (filters?.includeArchived) {
      params.set('includeArchived', 'true');
    }

    const config = signal ? { signal } : {};
    const res = await browserClient.get<LocationListResponse>(
      `/tenants/${tenantSlug}/locations?${params.toString()}`,
      config
    );
    return res.data;
  },

  async createLocation(
    tenantSlug: string,
    data: LocationFormInput
  ): Promise<{ location: LocationDto }> {
    const res = await browserClient.post<{ location: LocationDto }>(
      `/tenants/${tenantSlug}/locations`,
      data
    );
    return res.data;
  },

  async updateLocation(
    tenantSlug: string,
    locationId: string,
    data: Omit<LocationFormInput, 'brandId'> & { version: number }
  ): Promise<{ location: LocationDto }> {
    const res = await browserClient.put<{ location: LocationDto }>(
      `/tenants/${tenantSlug}/locations/${locationId}`,
      data
    );
    return res.data;
  },

  async archiveLocation(
    tenantSlug: string,
    locationId: string,
    version: number
  ): Promise<{ success: boolean }> {
    const res = await browserClient.delete<{ success: boolean }>(
      `/tenants/${tenantSlug}/locations/${locationId}?version=${version}`
    );
    return res.data;
  },
};
