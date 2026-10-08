'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback, useMemo, useEffect } from 'react';
import type { DateRangePreset } from '@/shared/analytics/date-range';
import type { ComparisonType } from '@/shared/analytics/comparison';

export interface ReportQueryState {
  preset: DateRangePreset;
  dateRangeDays: number;
  startDate?: string | undefined;
  endDate?: string | undefined;
  comparison: ComparisonType;
  brandId?: string | undefined;
  locationId?: string | undefined;
  tab: string;
  search: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

function daysToPreset(days: number): DateRangePreset {
  switch (days) {
    case 7:
      return 'LAST_7_DAYS';
    case 28:
      return 'LAST_28_DAYS';
    case 30:
      return 'LAST_30_DAYS';
    case 90:
      return 'LAST_90_DAYS';
    case 1:
      return 'YESTERDAY';
    default:
      return 'LAST_30_DAYS';
  }
}

function presetToDays(preset: DateRangePreset): number {
  switch (preset) {
    case 'LAST_7_DAYS':
      return 7;
    case 'LAST_28_DAYS':
      return 28;
    case 'LAST_30_DAYS':
      return 30;
    case 'LAST_90_DAYS':
      return 90;
    case 'TODAY':
    case 'YESTERDAY':
      return 1;
    default:
      return 30;
  }
}

import { useActiveBrand } from '@/providers/active-brand-context';

export function useReportsQueryState(defaults?: Partial<ReportQueryState>) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const brandCtx = useActiveBrand();

  const segments = pathname.split('/');
  const tenantSlug = segments[1] === 'client' ? segments[2] : (brandCtx?.tenantSlug || '');

  // Read persisted brand if available
  const persistedBrandId = typeof window !== 'undefined' && tenantSlug
    ? localStorage.getItem(`localbi_active_brand_${tenantSlug}`)
    : null;

  const state: ReportQueryState = useMemo(() => {
    const rawPreset = searchParams.get('preset') as DateRangePreset | null;
    const daysParam = searchParams.get('days');
    const parsedDays = daysParam ? parseInt(daysParam, 10) : NaN;

    let preset: DateRangePreset = 'LAST_30_DAYS';
    let dateRangeDays = 30;

    if (rawPreset && ['TODAY', 'YESTERDAY', 'LAST_7_DAYS', 'LAST_28_DAYS', 'LAST_30_DAYS', 'LAST_90_DAYS', 'CUSTOM'].includes(rawPreset)) {
      preset = rawPreset;
      dateRangeDays = presetToDays(rawPreset);
    } else if (!isNaN(parsedDays) && [1, 7, 14, 28, 30, 90, 365].includes(parsedDays)) {
      dateRangeDays = parsedDays;
      preset = daysToPreset(parsedDays);
    } else if (defaults?.preset) {
      preset = defaults.preset;
      dateRangeDays = presetToDays(defaults.preset);
    } else if (defaults?.dateRangeDays) {
      dateRangeDays = defaults.dateRangeDays;
      preset = daysToPreset(defaults.dateRangeDays);
    }

    const comparisonParam = searchParams.get('comparison') as ComparisonType | null;
    const comparison: ComparisonType =
      comparisonParam && ['NONE', 'PREVIOUS_PERIOD', 'PREVIOUS_YEAR'].includes(comparisonParam)
        ? comparisonParam
        : defaults?.comparison || 'NONE';

    const effectiveBrandId =
      searchParams.get('brandId') ||
      brandCtx?.activeBrandId ||
      persistedBrandId ||
      defaults?.brandId ||
      undefined;

    return {
      preset,
      dateRangeDays,
      startDate: searchParams.get('startDate') || defaults?.startDate || undefined,
      endDate: searchParams.get('endDate') || defaults?.endDate || undefined,
      comparison,
      brandId: effectiveBrandId,
      locationId: searchParams.get('locationId') || defaults?.locationId || undefined,
      tab: searchParams.get('tab') || defaults?.tab || 'overview',
      search: searchParams.get('q') || defaults?.search || '',
      sortBy: searchParams.get('sortBy') || defaults?.sortBy || 'clicks',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || defaults?.sortOrder || 'desc',
    };
  }, [searchParams, defaults, brandCtx?.activeBrandId, persistedBrandId]);

  const updateState = useCallback(
    (updates: Partial<ReportQueryState>) => {
      const params = new URLSearchParams(searchParams.toString());

      if (updates.preset !== undefined) {
        params.set('preset', updates.preset);
        const days = presetToDays(updates.preset);
        params.set('days', days.toString());
        if (updates.preset !== 'CUSTOM') {
          params.delete('startDate');
          params.delete('endDate');
        }
      }

      if (updates.dateRangeDays !== undefined) {
        params.set('days', updates.dateRangeDays.toString());
        params.set('preset', daysToPreset(updates.dateRangeDays));
        params.delete('startDate');
        params.delete('endDate');
      }

      if (updates.startDate !== undefined) {
        if (updates.startDate) {
          params.set('startDate', updates.startDate);
          params.set('preset', 'CUSTOM');
        } else {
          params.delete('startDate');
        }
      }

      if (updates.endDate !== undefined) {
        if (updates.endDate) {
          params.set('endDate', updates.endDate);
          params.set('preset', 'CUSTOM');
        } else {
          params.delete('endDate');
        }
      }

      if (updates.comparison !== undefined) {
        if (updates.comparison && updates.comparison !== 'NONE') {
          params.set('comparison', updates.comparison);
        } else {
          params.delete('comparison');
        }
      }

      if (updates.brandId !== undefined) {
        if (updates.brandId) {
          params.set('brandId', updates.brandId);
          if (typeof window !== 'undefined' && tenantSlug) {
            localStorage.setItem(`localbi_active_brand_${tenantSlug}`, updates.brandId);
            document.cookie = `localbi_active_brand_${tenantSlug}=${updates.brandId}; path=/; max-age=31536000; SameSite=Lax`;
            window.dispatchEvent(new CustomEvent('localbi-brand-changed', { detail: { brandId: updates.brandId } }));
          }
          if (brandCtx) {
            brandCtx.setActiveBrandId(updates.brandId);
          }
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
    [searchParams, pathname, router, tenantSlug]
  );

  // Listen for global brand change event dispatched from top navigation
  useEffect(() => {
    const handleBrandChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.brandId && detail.brandId !== searchParams.get('brandId')) {
        const params = new URLSearchParams(searchParams.toString());
        params.set('brandId', detail.brandId);
        params.delete('locationId');
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      }
    };
    window.addEventListener('localbi-brand-changed', handleBrandChanged);
    return () => window.removeEventListener('localbi-brand-changed', handleBrandChanged);
  }, [searchParams, pathname, router]);

  return {
    state,
    updateState,
    setPreset: (preset: DateRangePreset) => updateState({ preset }),
    setCustomDates: (startDate: string, endDate: string) =>
      updateState({ preset: 'CUSTOM', startDate, endDate }),
    setDateRangeDays: (days: number) => updateState({ dateRangeDays: days }),
    setComparison: (comparison: ComparisonType) => updateState({ comparison }),
    setBrandId: (brandId: string | undefined) => {
      if (brandId && brandCtx) {
        brandCtx.setActiveBrandId(brandId);
      } else if (brandId && typeof window !== 'undefined' && tenantSlug) {
        localStorage.setItem(`localbi_active_brand_${tenantSlug}`, brandId);
        document.cookie = `localbi_active_brand_${tenantSlug}=${brandId}; path=/; max-age=31536000; SameSite=Lax`;
        window.dispatchEvent(new CustomEvent('localbi-brand-changed', { detail: { brandId } }));
      }
      updateState({ brandId, locationId: undefined });
    },
    setLocationId: (locationId: string | undefined) => updateState({ locationId }),
    setTab: (tab: string) => updateState({ tab }),
    setSearch: (search: string) => updateState({ search }),
    setSort: (sortBy: string, sortOrder: 'asc' | 'desc') => updateState({ sortBy, sortOrder }),
  };
}
