import { useQuery } from '@tanstack/react-query';
import { browserClient } from '@/lib/http/browser-client';
import type {
  PerformanceSummaryDto,
  TimeseriesPoint,
  QueryDimensionRow,
  PageDimensionRow,
  DeviceDimensionRow,
} from '@/modules/reports/reporting-service';

export interface UseReportsFilter {
  tenantSlug: string;
  brandId: string;
  locationId?: string | undefined;
  startDate: string;
  endDate: string;
}

export function usePerformanceSummary(filters: UseReportsFilter) {
  return useQuery({
    queryKey: [
      'reports',
      'summary',
      filters.tenantSlug,
      filters.brandId,
      filters.locationId || 'all',
      filters.startDate,
      filters.endDate,
    ],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        brandId: filters.brandId,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
      if (filters.locationId) {
        params.append('locationId', filters.locationId);
      }

      const res = await browserClient.get<{ success: boolean; data: PerformanceSummaryDto }>(
        `/tenants/${filters.tenantSlug}/reports/summary?${params.toString()}`,
        { signal }
      );
      return res.data.data;
    },
    enabled: Boolean(filters.tenantSlug && filters.brandId),
    staleTime: 60 * 1000, // 1 minute
  });
}

export function usePerformanceTimeseries(filters: UseReportsFilter) {
  return useQuery({
    queryKey: [
      'reports',
      'timeseries',
      filters.tenantSlug,
      filters.brandId,
      filters.locationId || 'all',
      filters.startDate,
      filters.endDate,
    ],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        brandId: filters.brandId,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
      if (filters.locationId) {
        params.append('locationId', filters.locationId);
      }

      const res = await browserClient.get<{ success: boolean; data: TimeseriesPoint[] }>(
        `/tenants/${filters.tenantSlug}/reports/timeseries?${params.toString()}`,
        { signal }
      );
      return res.data.data;
    },
    enabled: Boolean(filters.tenantSlug && filters.brandId),
    staleTime: 60 * 1000,
  });
}

export function usePerformanceDimensions(filters: UseReportsFilter) {
  return useQuery({
    queryKey: [
      'reports',
      'dimensions',
      filters.tenantSlug,
      filters.brandId,
      filters.locationId || 'all',
      filters.startDate,
      filters.endDate,
    ],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        brandId: filters.brandId,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
      if (filters.locationId) {
        params.append('locationId', filters.locationId);
      }

      const res = await browserClient.get<{
        success: boolean;
        data: {
          queries: QueryDimensionRow[];
          pages: PageDimensionRow[];
          devices: DeviceDimensionRow[];
        };
      }>(`/tenants/${filters.tenantSlug}/reports/dimensions?${params.toString()}`, { signal });
      return res.data.data;
    },
    enabled: Boolean(filters.tenantSlug && filters.brandId),
    staleTime: 60 * 1000,
  });
}

export interface UseDrilldownFilter extends UseReportsFilter {
  dimension: 'query' | 'page' | 'country' | 'device' | 'date' | 'location' | 'search-keywords';
  search?: string | undefined;
  sortBy?: string | undefined;
  sortOrder?: 'asc' | 'desc' | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
}

export function useReportsDrilldown<T = unknown>(filters: UseDrilldownFilter) {
  return useQuery({
    queryKey: [
      'reports',
      'drilldown',
      filters.tenantSlug,
      filters.brandId,
      filters.locationId || 'all',
      filters.dimension,
      filters.startDate,
      filters.endDate,
      filters.search || '',
      filters.sortBy || '',
      filters.sortOrder || 'desc',
      filters.page || 1,
      filters.pageSize || 50,
    ],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        dimension: filters.dimension,
        brandId: filters.brandId,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
      if (filters.locationId) params.append('locationId', filters.locationId);
      if (filters.search) params.append('q', filters.search);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
      if (filters.page) params.append('page', String(filters.page));
      if (filters.pageSize) params.append('pageSize', String(filters.pageSize));

      const res = await browserClient.get<{
        success: boolean;
        data: {
          items: T[];
          totalCount: number;
          page: number;
          pageSize: number;
        };
        metadata?: {
          dimension: string;
          startDate: string;
          endDate: string;
          grain: string;
          freshness: string;
        };
      }>(`/tenants/${filters.tenantSlug}/reports/drilldown?${params.toString()}`, { signal });
      return res.data.data;
    },
    enabled: Boolean(filters.tenantSlug && filters.brandId && filters.dimension),
    staleTime: 60 * 1000,
  });
}

