/**
 * Reporting Date Service (Phase 13)
 * Centralizes date range calculations and equal-length comparison period derivations
 * using brand/tenant timezones.
 */

export type DateRangePreset = '7d' | '28d' | '30d' | '90d' | 'custom';

export interface ResolvedDateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  daysCount: number;
  preset: DateRangePreset;
}

export interface ResolvedComparisonRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  daysCount: number;
  enabled: boolean;
  type: 'PREVIOUS_PERIOD' | 'PREVIOUS_YEAR';
  label: string; // e.g. "vs previous 30 days"
}

export class ReportingDateService {
  /**
   * Resolves a date range preset into YYYY-MM-DD strings.
   * If custom startDate and endDate are provided, validates they form a valid interval.
   */
  public static resolveDateRange(options: {
    preset?: DateRangePreset | string | undefined;
    customStartDate?: string | undefined;
    customEndDate?: string | undefined;
    referenceDate?: Date | undefined;
    timezone?: string | undefined;
  }): ResolvedDateRange {
    const ref = options.referenceDate ? new Date(options.referenceDate) : new Date();

    if (options.preset === 'custom' && options.customStartDate && options.customEndDate) {
      const start = new Date(options.customStartDate);
      const end = new Date(options.customEndDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        throw new Error('Invalid custom date range: startDate must be on or before endDate');
      }
      const daysCount = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return {
        startDate: options.customStartDate,
        endDate: options.customEndDate,
        daysCount,
        preset: 'custom',
      };
    }

    const preset: DateRangePreset =
      options.preset === '7d' || options.preset === '28d' || options.preset === '90d'
        ? (options.preset as DateRangePreset)
        : '30d';

    const daysMap: Record<DateRangePreset, number> = {
      '7d': 7,
      '28d': 28,
      '30d': 30,
      '90d': 90,
      custom: 30,
    };

    const days = daysMap[preset];
    // Yesterday as standard analytics end date to ensure completed day data
    const end = new Date(ref);
    end.setUTCDate(end.getUTCDate() - 1);

    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - days + 1);

    return {
      startDate: this.formatDate(start),
      endDate: this.formatDate(end),
      daysCount: days,
      preset,
    };
  }

  /**
   * Computes an equal-length comparison period immediately preceding the active window,
   * or precisely shifted by one year.
   */
  public static resolveComparisonRange(
    activeRange: ResolvedDateRange,
    type: 'PREVIOUS_PERIOD' | 'PREVIOUS_YEAR' = 'PREVIOUS_PERIOD'
  ): ResolvedComparisonRange {
    const curStart = new Date(activeRange.startDate);
    const days = activeRange.daysCount;

    if (type === 'PREVIOUS_YEAR') {
      const prevYearStart = new Date(curStart);
      prevYearStart.setUTCFullYear(prevYearStart.getUTCFullYear() - 1);
      const prevYearEnd = new Date(prevYearStart);
      prevYearEnd.setUTCDate(prevYearEnd.getUTCDate() + days - 1);

      return {
        startDate: this.formatDate(prevYearStart),
        endDate: this.formatDate(prevYearEnd),
        daysCount: days,
        enabled: true,
        type: 'PREVIOUS_YEAR',
        label: `vs previous year (${activeRange.daysCount} days)`,
      };
    }

    // Default: PREVIOUS_PERIOD (strictly equal length)
    const prevEnd = new Date(curStart);
    prevEnd.setUTCDate(prevEnd.getUTCDate() - 1);

    const prevStart = new Date(prevEnd);
    prevStart.setUTCDate(prevStart.getUTCDate() - days + 1);

    return {
      startDate: this.formatDate(prevStart),
      endDate: this.formatDate(prevEnd),
      daysCount: days,
      enabled: true,
      type: 'PREVIOUS_PERIOD',
      label: `vs previous ${activeRange.daysCount} days`,
    };
  }

  private static formatDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}
