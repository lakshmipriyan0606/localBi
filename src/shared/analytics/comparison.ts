/**
 * Safe Comparison Math & Period Deltas (Phase 13 / Client Feedback Epic)
 * Single source of truth for percent changes, zero-division guards, and trend evaluation.
 */

export type ComparisonTrendDirection = 'UP' | 'DOWN' | 'NEUTRAL' | 'NEW' | 'UNAVAILABLE';

export interface ComparisonDelta {
  currentValue: number;
  previousValue: number | null;
  deltaAbsolute: number | null;
  growthPercent: number | null;
  direction: ComparisonTrendDirection;
  isPositiveForBusiness: boolean;
  displayFormatted: string; // "+18.4%", "-5.2%", "0.0%", "New", "N/A"
  baselineLabel?: string | undefined;
}

export class AnalyticsComparisonEngine {
  /**
   * Calculates a mathematically safe comparison delta.
   *
   * @param current The active period value
   * @param previous The comparison period value (or null/undefined if data is absent)
   * @param options.higherIsBetter Whether an increase is good for business (default: true; false for average position/rank)
   * @param options.baselineLabel Human description of baseline (e.g. "vs previous 30 days")
   */
  public static calculate(
    current: number,
    previous: number | null | undefined,
    options: {
      higherIsBetter?: boolean | undefined;
      baselineLabel?: string | undefined;
      decimals?: number | undefined;
    } = {}
  ): ComparisonDelta {
    const higherIsBetter = options.higherIsBetter ?? true;
    const decimals = options.decimals ?? 1;
    const baselineLabel = options.baselineLabel;

    // Rule 1: Missing or invalid baseline -> Never calculate -100%, show "N/A"
    if (previous === null || previous === undefined || isNaN(previous)) {
      return {
        currentValue: current,
        previousValue: null,
        deltaAbsolute: null,
        growthPercent: null,
        direction: 'UNAVAILABLE',
        isPositiveForBusiness: false,
        displayFormatted: 'N/A',
        baselineLabel,
      };
    }

    // Rule 2: Previous period was zero
    if (previous === 0) {
      if (current === 0) {
        return {
          currentValue: 0,
          previousValue: 0,
          deltaAbsolute: 0,
          growthPercent: 0,
          direction: 'NEUTRAL',
          isPositiveForBusiness: true,
          displayFormatted: '0.0%',
          baselineLabel,
        };
      }
      // Current > 0 from 0 baseline -> "New", never Infinity%
      return {
        currentValue: current,
        previousValue: 0,
        deltaAbsolute: current,
        growthPercent: null,
        direction: 'NEW',
        isPositiveForBusiness: true,
        displayFormatted: 'New',
        baselineLabel,
      };
    }

    // Rule 3: Standard percentage delta calculation
    const deltaAbsolute = current - previous;
    const rawGrowth = (deltaAbsolute / Math.abs(previous)) * 100;
    const roundedGrowth = Number(rawGrowth.toFixed(decimals));

    let direction: ComparisonTrendDirection = 'NEUTRAL';
    let isPositive = false;

    if (Math.abs(roundedGrowth) > 0.05) {
      if (higherIsBetter) {
        direction = roundedGrowth > 0 ? 'UP' : 'DOWN';
        isPositive = roundedGrowth > 0;
      } else {
        // Lower is better (e.g. position 4.2 -> 2.1 is positive improvement)
        direction = roundedGrowth < 0 ? 'UP' : 'DOWN';
        isPositive = roundedGrowth < 0;
      }
    }

    const sign = roundedGrowth > 0 ? '+' : '';
    const displayFormatted = `${sign}${roundedGrowth.toFixed(decimals)}%`;

    return {
      currentValue: current,
      previousValue: previous,
      deltaAbsolute,
      growthPercent: roundedGrowth,
      direction,
      isPositiveForBusiness: isPositive,
      displayFormatted,
      baselineLabel,
    };
  }

  /**
   * Helper for search ranking positions where a lower position (e.g. #1) is better than a higher position (#10).
   */
  public static calculatePosition(
    current: number,
    previous: number | null | undefined,
    baselineLabel?: string
  ): ComparisonDelta {
    return this.calculate(current, previous, {
      higherIsBetter: false,
      baselineLabel,
      decimals: 1,
    });
  }

  /**
   * High-level calculation helper accepting options object.
   */
  public static calculateComparison(options: {
    current: number;
    previous: number | null | undefined;
    comparisonType?: string | undefined;
    higherIsBetter?: boolean | undefined;
    baselineLabel?: string | undefined;
    decimals?: number | undefined;
  }): {
    deltaPercent: number | null;
    deltaFormatted: string;
    isPositive: boolean;
    isFavorable: boolean;
    isZero: boolean;
    hasComparisonData: boolean;
  } {
    if (options.comparisonType === 'NONE') {
      return {
        deltaPercent: null,
        deltaFormatted: '—',
        isPositive: false,
        isFavorable: false,
        isZero: true,
        hasComparisonData: false,
      };
    }

    const res = this.calculate(options.current, options.previous, {
      higherIsBetter: options.higherIsBetter,
      baselineLabel: options.baselineLabel,
      decimals: options.decimals,
    });

    const isPositive = res.growthPercent !== null ? res.growthPercent > 0 : false;
    const isZero = res.growthPercent === 0;

    return {
      deltaPercent: res.growthPercent,
      deltaFormatted: res.displayFormatted,
      isPositive,
      isFavorable: res.isPositiveForBusiness,
      isZero,
      hasComparisonData: res.direction !== 'UNAVAILABLE',
    };
  }
}

