/**
 * Comparison Engine (Phase 13)
 * Provides mathematically safe period-over-period and year-over-year delta
 * calculations, strictly preventing division-by-zero (Infinity%) and misleading -100% deltas.
 */

export type ComparisonTrend = 'UP' | 'DOWN' | 'NEUTRAL' | 'NEW' | 'UNAVAILABLE';

export interface MetricComparisonResult {
  currentValue: number;
  previousValue: number | null;
  deltaAbsolute: number | null;
  growthPercent: number | null; // e.g. 25.0 for +25%, -15.5 for -15.5%
  trend: ComparisonTrend;
  isNew: boolean;
  isUnavailable: boolean;
  displayFormatted: string; // "+25.0%", "-8.2%", "0.0%", "New", "N/A"
  baselineDescription?: string | undefined; // "vs prior 30 days"
}

export class ComparisonEngine {
  /**
   * Computes a safe comparison delta between a current and prior period value.
   *
   * @param current The value in the active reporting window.
   * @param previous The value in the comparison baseline window (null if window data absent).
   * @param options.higherIsBetter Whether an increase is positive (default true; false for rank position).
   * @param options.baselineLabel Human description of baseline (e.g. "prior 30 days").
   */
  public static calculate(
    current: number,
    previous: number | null | undefined,
    options: {
      higherIsBetter?: boolean | undefined;
      baselineLabel?: string | undefined;
      decimals?: number | undefined;
    } = {}
  ): MetricComparisonResult {
    const higherIsBetter = options.higherIsBetter ?? true;
    const decimals = options.decimals ?? 1;
    const baselineDescription = options.baselineLabel;

    // Case 1: Previous period data is not available (do not treat as zero!)
    if (previous === null || previous === undefined || isNaN(previous)) {
      return {
        currentValue: current,
        previousValue: null,
        deltaAbsolute: null,
        growthPercent: null,
        trend: 'UNAVAILABLE',
        isNew: false,
        isUnavailable: true,
        displayFormatted: 'N/A',
        baselineDescription,
      };
    }

    // Case 2: Previous period was 0
    if (previous === 0) {
      if (current === 0) {
        return {
          currentValue: 0,
          previousValue: 0,
          deltaAbsolute: 0,
          growthPercent: 0,
          trend: 'NEUTRAL',
          isNew: false,
          isUnavailable: false,
          displayFormatted: '0.0%',
          baselineDescription,
        };
      }
      // Previous was 0, current > 0 -> Do NOT return Infinity%
      return {
        currentValue: current,
        previousValue: 0,
        deltaAbsolute: current,
        growthPercent: null,
        trend: 'NEW',
        isNew: true,
        isUnavailable: false,
        displayFormatted: 'New',
        baselineDescription,
      };
    }

    // Case 3: Standard percentage calculation
    const deltaAbsolute = current - previous;
    const rawGrowth = (deltaAbsolute / Math.abs(previous)) * 100;
    const roundedGrowth = Number(rawGrowth.toFixed(decimals));

    let trend: ComparisonTrend = 'NEUTRAL';
    if (Math.abs(roundedGrowth) > 0.05) {
      if (higherIsBetter) {
        trend = roundedGrowth > 0 ? 'UP' : 'DOWN';
      } else {
        // Lower is better (e.g. average position: 4.2 -> 2.1 is improvement)
        trend = roundedGrowth < 0 ? 'UP' : 'DOWN';
      }
    }

    const sign = roundedGrowth > 0 ? '+' : '';
    const displayFormatted = `${sign}${roundedGrowth.toFixed(decimals)}%`;

    return {
      currentValue: current,
      previousValue: previous,
      deltaAbsolute,
      growthPercent: roundedGrowth,
      trend,
      isNew: false,
      isUnavailable: false,
      displayFormatted,
      baselineDescription,
    };
  }

  /**
   * Safe comparison for rank metrics where position decrease (e.g. 5 -> 2) is positive improvement.
   */
  public static calculatePositionDelta(
    current: number,
    previous: number | null | undefined,
    baselineLabel?: string
  ): MetricComparisonResult {
    return this.calculate(current, previous, {
      higherIsBetter: false,
      baselineLabel,
      decimals: 1,
    });
  }
}
