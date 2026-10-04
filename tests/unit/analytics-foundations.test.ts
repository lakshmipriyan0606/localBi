import { describe, it, expect } from 'vitest';
import { DateRangeService } from '@/shared/analytics/date-range';
import { AnalyticsComparisonEngine } from '@/shared/analytics/comparison';
import { AnalyticsFormatters } from '@/shared/analytics/formatters';
import { analyticsQueryKeys } from '@/lib/query/query-keys';

describe('Analytics Foundations — Workstream A', () => {
  describe('1. DateRangeService & Boundaries', () => {
    it('resolves rolling presets to valid ISO YYYY-MM-DD boundaries', () => {
      const presets = ['LAST_7_DAYS', 'LAST_28_DAYS', 'LAST_30_DAYS', 'LAST_90_DAYS'] as const;

      for (const preset of presets) {
        const res = DateRangeService.resolveDateRange({ preset });
        expect(res.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(res.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(res.startDate <= res.endDate).toBe(true);

        const days = DateRangeService.calculateDaysBetween(res.startDate, res.endDate);
        if (preset === 'LAST_7_DAYS') expect(days).toBe(7);
        if (preset === 'LAST_28_DAYS') expect(days).toBe(28);
        if (preset === 'LAST_30_DAYS') expect(days).toBe(30);
        if (preset === 'LAST_90_DAYS') expect(days).toBe(90);
      }
    });

    it('resolves TODAY and YESTERDAY correctly', () => {
      const today = DateRangeService.resolveDateRange({ preset: 'TODAY' });
      expect(today.startDate).toBe(today.endDate);

      const yesterday = DateRangeService.resolveDateRange({ preset: 'YESTERDAY' });
      expect(yesterday.startDate).toBe(yesterday.endDate);
      expect(yesterday.endDate < today.endDate).toBe(true);
    });

    it('resolves CUSTOM presets using explicit dates', () => {
      const res = DateRangeService.resolveDateRange({
        preset: 'CUSTOM',
        customStart: '2026-01-01',
        customEnd: '2026-01-31',
      });

      expect(res.startDate).toBe('2026-01-01');
      expect(res.endDate).toBe('2026-01-31');
      expect(DateRangeService.calculateDaysBetween(res.startDate, res.endDate)).toBe(31);
    });

    it('resolves timezone-aware boundaries using business timezone', () => {
      const nyRes = DateRangeService.resolveDateRange({
        preset: 'LAST_7_DAYS',
        timezone: 'America/New_York',
      });
      const tokyoRes = DateRangeService.resolveDateRange({
        preset: 'LAST_7_DAYS',
        timezone: 'Asia/Tokyo',
      });

      expect(nyRes.timezone).toBe('America/New_York');
      expect(tokyoRes.timezone).toBe('Asia/Tokyo');
    });

    it('calculates equal-duration previous period comparison window', () => {
      // 30 days window: 2026-06-01 to 2026-06-30
      const comp = DateRangeService.resolveComparisonRange(
        '2026-06-01',
        '2026-06-30',
        'PREVIOUS_PERIOD'
      );

      expect(comp).not.toBeNull();
      if (comp) {
        expect(comp.endDate).toBe('2026-05-31');
        const compDays = DateRangeService.calculateDaysBetween(comp.startDate, comp.endDate);
        expect(compDays).toBe(30);
      }
    });

    it('calculates previous year comparison window', () => {
      const comp = DateRangeService.resolveComparisonRange(
        '2026-06-01',
        '2026-06-30',
        'PREVIOUS_YEAR'
      );

      expect(comp).not.toBeNull();
      if (comp) {
        expect(comp.startDate).toBe('2025-06-01');
        expect(comp.endDate).toBe('2025-06-30');
      }
    });

    it('returns null for comparison NONE', () => {
      const comp = DateRangeService.resolveComparisonRange(
        '2026-06-01',
        '2026-06-30',
        'NONE'
      );
      expect(comp).toBeNull();
    });
  });

  describe('2. AnalyticsComparisonEngine (Safe Zero & Missing Deltas)', () => {
    it('calculates standard percentage change when previous > 0', () => {
      const result = AnalyticsComparisonEngine.calculateComparison({
        current: 150,
        previous: 100,
        comparisonType: 'PREVIOUS_PERIOD',
      });

      expect(result.deltaPercent).toBe(50);
      expect(result.deltaFormatted).toBe('+50.0%');
      expect(result.isPositive).toBe(true);
      expect(result.isFavorable).toBe(true);
    });

    it('handles previous = 0, current > 0 as "New" (never Infinity%)', () => {
      const result = AnalyticsComparisonEngine.calculateComparison({
        current: 50,
        previous: 0,
        comparisonType: 'PREVIOUS_PERIOD',
      });

      expect(result.deltaPercent).toBeNull();
      expect(result.deltaFormatted).toBe('New');
      expect(result.isFavorable).toBe(true);
    });

    it('handles previous = 0, current = 0 as "0.0%" (never NaN%)', () => {
      const result = AnalyticsComparisonEngine.calculateComparison({
        current: 0,
        previous: 0,
        comparisonType: 'PREVIOUS_PERIOD',
      });

      expect(result.deltaPercent).toBe(0);
      expect(result.deltaFormatted).toBe('0.0%');
      expect(result.isZero).toBe(true);
    });

    it('handles missing previous data as "N/A" (never -100%)', () => {
      const result = AnalyticsComparisonEngine.calculateComparison({
        current: 120,
        previous: null,
        comparisonType: 'PREVIOUS_PERIOD',
      });

      expect(result.deltaPercent).toBeNull();
      expect(result.deltaFormatted).toBe('N/A');
      expect(result.hasComparisonData).toBe(false);
    });

    it('handles comparisonType = NONE cleanly', () => {
      const result = AnalyticsComparisonEngine.calculateComparison({
        current: 100,
        previous: 50,
        comparisonType: 'NONE',
      });

      expect(result.hasComparisonData).toBe(false);
      expect(result.deltaFormatted).toBe('—');
    });

    it('respects higherIsBetter = false for rank position (lower is favorable)', () => {
      // Position improved from 10.0 to 4.0
      const improved = AnalyticsComparisonEngine.calculateComparison({
        current: 4.0,
        previous: 10.0,
        comparisonType: 'PREVIOUS_PERIOD',
        higherIsBetter: false,
      });

      expect(improved.isFavorable).toBe(true);
      expect(improved.isPositive).toBe(false); // numeric delta is negative (-60%), but favorable!
    });
  });

  describe('3. AnalyticsFormatters', () => {
    it('formats integer and compact numbers', () => {
      expect(AnalyticsFormatters.number(12480)).toBe('12,480');
      expect(AnalyticsFormatters.compact(12500)).toBe('12.5K');
      expect(AnalyticsFormatters.compact(1500000)).toBe('1.5M');
      expect(AnalyticsFormatters.percent(0.042)).toBe('4.2%');
      expect(AnalyticsFormatters.position(2.14)).toBe('2.1');
    });

    it('formats durations into human-readable minutes and hours', () => {
      expect(AnalyticsFormatters.duration(82)).toBe('1m 22s');
      expect(AnalyticsFormatters.duration(4068)).toBe('1h 7m 48s');
      expect(AnalyticsFormatters.duration(25)).toBe('25s');
    });

    it('formats relative freshness strings', () => {
      const now = new Date();
      expect(AnalyticsFormatters.relativeFreshness(now)).toBe('Updated just now');

      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      expect(AnalyticsFormatters.relativeFreshness(fiveMinAgo)).toBe('Updated 5m ago');

      expect(AnalyticsFormatters.relativeFreshness(null)).toBe('Not yet synced');
    });
  });

  describe('4. TanStack Query Keys & Cache Safety', () => {
    it('isolates cache strictly by tenant and brand', () => {
      const keyBrand1 = analyticsQueryKeys.overview({
        tenantSlug: 'tenant-acme',
        brandId: 'brand-aalim',
        startDate: '2026-06-01',
        endDate: '2026-06-30',
      });

      const keyBrand2 = analyticsQueryKeys.overview({
        tenantSlug: 'tenant-acme',
        brandId: 'brand-lakshmi',
        startDate: '2026-06-01',
        endDate: '2026-06-30',
      });

      // Keys must differ so Aalim cached data never leaks to Lakshmi
      expect(JSON.stringify(keyBrand1)).not.toBe(JSON.stringify(keyBrand2));
      expect(keyBrand1[1]).toBe('tenant-acme');
      expect((keyBrand1[4] as Record<string, unknown>).brandId).toBe('brand-aalim');
      expect((keyBrand2[4] as Record<string, unknown>).brandId).toBe('brand-lakshmi');
    });

    it('deterministically sorts storeIds to avoid cache thrashing', () => {
      const keyA = analyticsQueryKeys.overview({
        tenantSlug: 't1',
        brandId: 'b1',
        storeIds: ['store-2', 'store-1'],
        startDate: '2026-06-01',
        endDate: '2026-06-30',
      });

      const keyB = analyticsQueryKeys.overview({
        tenantSlug: 't1',
        brandId: 'b1',
        storeIds: ['store-1', 'store-2'],
        startDate: '2026-06-01',
        endDate: '2026-06-30',
      });

      expect(JSON.stringify(keyA)).toBe(JSON.stringify(keyB));
    });
  });
});
