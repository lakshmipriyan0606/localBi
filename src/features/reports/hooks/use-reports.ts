import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { browserClient } from '@/lib/http/browser-client';
import { analyticsQueryKeys } from '@/lib/query/query-keys';
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
  webSurfaceId?: string | undefined;
  mode?: 'LOCALBI' | 'ORIGINAL' | 'COMPARE' | undefined;
  startDate: string;
  endDate: string;
  comparison?: string | undefined;
}

export function usePerformanceSummary(filters: UseReportsFilter) {
  return useQuery({
    queryKey: analyticsQueryKeys.overview({
      tenantSlug: filters.tenantSlug,
      brandId: filters.brandId,
      locationId: filters.locationId,
      webSurfaceId: filters.webSurfaceId,
      startDate: filters.startDate,
      endDate: filters.endDate,
      comparison: filters.comparison || 'NONE',
    }),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        brandId: filters.brandId,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
      if (filters.locationId) params.append('locationId', filters.locationId);
      if (filters.webSurfaceId) params.append('webSurfaceId', filters.webSurfaceId);
      if (filters.mode) params.append('mode', filters.mode);

      const res = await browserClient.get<{ success: boolean; data: PerformanceSummaryDto }>(
        `/tenants/${filters.tenantSlug}/reports/summary?${params.toString()}`,
        { signal }
      );
      return res.data.data;
    },
    enabled: Boolean(filters.tenantSlug && filters.brandId),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}


export function usePerformanceTimeseries(filters: UseReportsFilter) {
  return useQuery({
    queryKey: analyticsQueryKeys.timeseries({
      tenantSlug: filters.tenantSlug,
      brandId: filters.brandId,
      locationId: filters.locationId,
      webSurfaceId: filters.webSurfaceId,
      startDate: filters.startDate,
      endDate: filters.endDate,
      comparison: filters.comparison || 'NONE',
    }),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        brandId: filters.brandId,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
      if (filters.locationId) params.append('locationId', filters.locationId);
      if (filters.webSurfaceId) params.append('webSurfaceId', filters.webSurfaceId);
      if (filters.mode) params.append('mode', filters.mode);

      const res = await browserClient.get<{ success: boolean; data: TimeseriesPoint[] }>(
        `/tenants/${filters.tenantSlug}/reports/timeseries?${params.toString()}`,
        { signal }
      );
      return res.data.data;
    },
    enabled: Boolean(filters.tenantSlug && filters.brandId),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function usePerformanceDimensions(filters: UseReportsFilter) {
  return useQuery({
    queryKey: analyticsQueryKeys.dimensions({
      tenantSlug: filters.tenantSlug,
      brandId: filters.brandId,
      locationId: filters.locationId,
      webSurfaceId: filters.webSurfaceId,
      startDate: filters.startDate,
      endDate: filters.endDate,
    }),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        brandId: filters.brandId,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
      if (filters.locationId) params.append('locationId', filters.locationId);
      if (filters.webSurfaceId) params.append('webSurfaceId', filters.webSurfaceId);
      if (filters.mode) params.append('mode', filters.mode);

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
    placeholderData: keepPreviousData,
    staleTime: 60_000,
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
      filters.webSurfaceId || 'default',
      filters.mode || 'LOCALBI',
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
      if (filters.webSurfaceId) params.append('webSurfaceId', filters.webSurfaceId);
      if (filters.mode) params.append('mode', filters.mode);
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
    staleTime: 0,
  });
}

export function useGa4Report(filters: UseReportsFilter) {
  return useQuery({
    queryKey: [
      'reports',
      'ga4',
      filters.tenantSlug,
      filters.brandId,
      filters.locationId || 'all',
      filters.webSurfaceId || 'default',
      filters.mode || 'LOCALBI',
      filters.startDate,
      filters.endDate,
    ],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        brandId: filters.brandId,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
      if (filters.locationId) params.append('locationId', filters.locationId);
      if (filters.webSurfaceId) params.append('webSurfaceId', filters.webSurfaceId);
      if (filters.mode) params.append('mode', filters.mode);

      const res = await browserClient.get<{ success: boolean; data: any }>(
        `/tenants/${filters.tenantSlug}/reports/ga4?${params.toString()}`,
        { signal }
      );
      return res.data.data;
    },
    enabled: Boolean(filters.tenantSlug && filters.brandId),
    staleTime: 0,
  });
}
