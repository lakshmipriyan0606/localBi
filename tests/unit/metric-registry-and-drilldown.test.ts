import { describe, it, expect } from 'vitest';
import {
  getMetricConfig,
  getMetricsBySource,
  calculateCtr,
  calculateDelta,
  type MetricId,
} from '@/shared/config/metric-registry';
import { formatPosition, formatPercent, formatNumber } from '@/shared/lib/formatters';

describe('Metric Registry & Calculation Accuracy', () => {
  describe('Metric Registry Definitions & Sources', () => {
    it('has all 9 core Google metrics with clear source separation and valid metadata', () => {
      const gscMetrics = getMetricsBySource('GSC');
      const gbpMetrics = getMetricsBySource('GBP');

      expect(gscMetrics.length).toBe(4);
      expect(gbpMetrics.length).toBe(5);

      const allMetricIds: MetricId[] = [
        'gsc_clicks',
        'gsc_impressions',
        'gsc_ctr',
        'gsc_position',
        'gbp_impressions',
        'gbp_calls',
        'gbp_website',
        'gbp_directions',
        'gbp_search_terms',
      ];

      for (const id of allMetricIds) {
        const config = getMetricConfig(id);
        expect(config).toBeDefined();
        expect(config.label).toBeTruthy();
        expect(config.definition).toBeTruthy();
        expect(config.detailDestination).toBeTruthy();
        expect(config.retentionConstraints).toBeTruthy();
        expect(config.formatter).toBeInstanceOf(Function);
      }
    });

    it('defines distinct semantics for GBP Call Clicks vs completed calls', () => {
      const callsMetric = getMetricConfig('gbp_calls');
      expect(callsMetric.disclaimer).toContain('not proof of a completed telephone conversation');
    });

    it('defines distinct semantics for GBP Directions vs confirmed store visits', () => {
      const dirMetric = getMetricConfig('gbp_directions');
      expect(dirMetric.disclaimer).toContain('confirmed in-store physical visit');
    });

    it('enforces monthly grain and threshold privacy rule on gbp_search_terms', () => {
      const searchTermsMetric = getMetricConfig('gbp_search_terms');
      expect(searchTermsMetric.reportingGrain).toBe('MONTHLY');
      expect(searchTermsMetric.isThreshold).toBe(true);
      expect(searchTermsMetric.disclaimer).toContain('< 15');
      expect(searchTermsMetric.disclaimer).toContain('never split into invented daily points');
    });
  });

  describe('CTR Calculation Accuracy', () => {
    it('calculates CTR from compatible clicks and impressions rather than averaging percentages', () => {
      // 25 clicks / 500 impressions = 5.0%
      expect(calculateCtr(25, 500)).toBe(5.0);

      // 1 click / 100 impressions = 1.0%
      expect(calculateCtr(1, 100)).toBe(1.0);

      // 0 impressions should return 0.0, avoiding division by zero
      expect(calculateCtr(0, 0)).toBe(0.0);
      expect(calculateCtr(10, 0)).toBe(0.0);
    });

    it('handles floating-point rounding cleanly to 2 decimal places', () => {
      // 1 click / 3 impressions = 33.3333...% -> 33.33%
      expect(calculateCtr(1, 3)).toBe(33.33);
    });
  });

  describe('Comparison Delta Calculation with Zero-Baseline Handling', () => {
    it('calculates standard positive and negative percentage changes', () => {
      // 150 vs 100 = +50%
      const deltaPositive = calculateDelta(150, 100);
      expect(deltaPositive.percentChange).toBe(50.0);
      expect(deltaPositive.direction).toBe('up');

      // 75 vs 100 = -25%
      const deltaNegative = calculateDelta(75, 100);
      expect(deltaNegative.percentChange).toBe(-25.0);
      expect(deltaNegative.direction).toBe('down');
    });

    it('handles zero comparison baseline explicitly without dividing by zero or throwing NaN', () => {
      // Current 50, Previous 0 -> 100% gain from zero
      const deltaFromZero = calculateDelta(50, 0);
      expect(deltaFromZero.percentChange).toBe(100);
      expect(deltaFromZero.direction).toBe('up');

      // Both 0 -> 0%
      const deltaBothZero = calculateDelta(0, 0);
      expect(deltaBothZero.percentChange).toBe(0);
      expect(deltaBothZero.direction).toBe('flat');
    });

    it('correctly handles inverted metrics where lower is better (Average Position)', () => {
      const positionConfig = getMetricConfig('gsc_position');
      expect(positionConfig.comparisonBehavior).toBe('lower_is_better');

      // Position improved from 14.2 to 8.4 (lower number = rank improved)
      const currentPos = 8.4;
      const prevPos = 14.2;
      const delta = calculateDelta(currentPos, prevPos);
      expect(delta.difference).toBeCloseTo(-5.8);
    });
  });

  describe('Formatters & Numeral Precision', () => {
    it('formats position with 1 decimal place', () => {
      expect(formatPosition(3.42)).toBe('3.4');
      expect(formatPosition(1.0)).toBe('1.0');
      expect(formatPosition(null)).toBe('—');
      expect(formatPosition(undefined)).toBe('—');
    });

    it('formats numbers and percentages with locale consistency', () => {
      expect(formatNumber(12500)).toBe('12,500');
      expect(formatPercent(0.0425)).toBe('4.3%');
      expect(formatPercent(null)).toBe('—');
    });
  });
});
