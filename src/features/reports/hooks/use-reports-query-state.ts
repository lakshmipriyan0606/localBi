'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback, useMemo } from 'react';

export interface ReportQueryState {
  dateRangeDays: number;
  brandId?: string | undefined;
  locationId?: string | undefined;
  tab: string;
  search: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export function useReportsQueryState(defaults?: Partial<ReportQueryState>) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const state: ReportQueryState = useMemo(() => {
    const daysParam = searchParams.get('days');
    const parsedDays = daysParam ? parseInt(daysParam, 10) : NaN;
    const dateRangeDays = !isNaN(parsedDays) && [1, 7, 14, 30, 90, 365].includes(parsedDays)
      ? parsedDays
      : defaults?.dateRangeDays ?? 30;

    return {
      dateRangeDays,
      brandId: searchParams.get('brandId') || defaults?.brandId || undefined,
      locationId: searchParams.get('locationId') || defaults?.locationId || undefined,
      tab: searchParams.get('tab') || defaults?.tab || 'overview',
      search: searchParams.get('q') || defaults?.search || '',
      sortBy: searchParams.get('sortBy') || defaults?.sortBy || 'clicks',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || defaults?.sortOrder || 'desc',
    };
  }, [searchParams, defaults]);

  const updateState = useCallback(
    (updates: Partial<ReportQueryState>) => {
      const params = new URLSearchParams(searchParams.toString());

      if (updates.dateRangeDays !== undefined) {
        params.set('days', updates.dateRangeDays.toString());
      }
      if (updates.brandId !== undefined) {
        if (updates.brandId) {
          params.set('brandId', updates.brandId);
        } else {
          params.delete('brandId');
        }
      }
      if (updates.locationId !== undefined) {
        if (updates.locationId) {
          params.set('locationId', updates.locationId);
        } else {
          params.delete('locationId');
        }
      }
      if (updates.tab !== undefined) {
        if (updates.tab && updates.tab !== 'overview') {
          params.set('tab', updates.tab);
        } else {
          params.delete('tab');
        }
      }
      if (updates.search !== undefined) {
        if (updates.search) {
          params.set('q', updates.search);
        } else {
          params.delete('q');
        }
      }
      if (updates.sortBy !== undefined) {
        params.set('sortBy', updates.sortBy);
      }
      if (updates.sortOrder !== undefined) {
        params.set('sortOrder', updates.sortOrder);
      }

      const queryString = params.toString();
      const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(targetUrl, { scroll: false });
    },
    [searchParams, pathname, router]
  );

  return {
    state,
    updateState,
    setDateRangeDays: (days: number) => updateState({ dateRangeDays: days }),
    setBrandId: (brandId: string | undefined) => updateState({ brandId, locationId: undefined }),
    setLocationId: (locationId: string | undefined) => updateState({ locationId }),
    setTab: (tab: string) => updateState({ tab }),
    setSearch: (search: string) => updateState({ search }),
    setSort: (sortBy: string, sortOrder: 'asc' | 'desc') => updateState({ sortBy, sortOrder }),
  };
}
