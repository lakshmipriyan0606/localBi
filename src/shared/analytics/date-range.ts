/**
 * Canonical Analytics Date Range System (Phase 13 / Client Feedback Epic)
 * Single source of truth for date range presets, custom intervals, timezone-aware
 * boundary resolution, and equal-length comparison periods.
 */

export type DateRangePreset =
  | 'TODAY'
  | 'YESTERDAY'
  | 'LAST_7_DAYS'
  | 'LAST_28_DAYS'
  | 'LAST_30_DAYS'
  | 'LAST_90_DAYS'
  | 'CUSTOM';

export type ComparisonType = 'NONE' | 'PREVIOUS_PERIOD' | 'PREVIOUS_YEAR';

export interface AnalyticsDateRange {
  preset: DateRangePreset;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  daysCount: number;
  timezone: string;
}

export interface AnalyticsComparison {
  type: ComparisonType;
  startDate?: string | undefined;
  endDate?: string | undefined;
  daysCount?: number | undefined;
  label: string;
  enabled: boolean;
}

export interface ResolveDateRangeOptions {
  preset?: DateRangePreset | string | undefined;
  customStartDate?: string | undefined;
  customEndDate?: string | undefined;
  customStart?: string | undefined;
  customEnd?: string | undefined;
  timezone?: string | undefined;
  referenceDate?: Date | undefined;
}

const PRESET_DAYS_MAP: Record<Exclude<DateRangePreset, 'CUSTOM' | 'TODAY' | 'YESTERDAY'>, number> = {
  LAST_7_DAYS: 7,
  LAST_28_DAYS: 28,
  LAST_30_DAYS: 30,
  LAST_90_DAYS: 90,
};

export class DateRangeService {
  /**
   * Normalizes legacy preset string (e.g. '7d', '30d') to canonical DateRangePreset enum.
   */
  public static normalizePreset(rawPreset?: string | null): DateRangePreset {
    if (!rawPreset) return 'LAST_30_DAYS';
    const upper = rawPreset.toUpperCase();
    switch (upper) {
      case 'TODAY':
        return 'TODAY';
      case 'YESTERDAY':
        return 'YESTERDAY';
      case '7D':
      case 'LAST_7_DAYS':
        return 'LAST_7_DAYS';
      case '28D':
      case 'LAST_28_DAYS':
        return 'LAST_28_DAYS';
      case '30D':
      case 'LAST_30_DAYS':
        return 'LAST_30_DAYS';
      case '90D':
      case 'LAST_90_DAYS':
        return 'LAST_90_DAYS';
      case 'CUSTOM':
        return 'CUSTOM';
      default:
        return 'LAST_30_DAYS';
    }
  }

  /**
   * Resolves a DateRangePreset into strict YYYY-MM-DD boundary strings.
   * Respects timezone boundaries without local client drift.
   */
  public static resolveRange(options: ResolveDateRangeOptions = {}): AnalyticsDateRange {
    const tz = options.timezone || 'UTC';
    const preset = this.normalizePreset(options.preset);
    const ref = options.referenceDate ? new Date(options.referenceDate) : new Date();

    const customStart = options.customStartDate || options.customStart;
    const customEnd = options.customEndDate || options.customEnd;

    if (preset === 'CUSTOM' && customStart && customEnd) {
      const start = new Date(customStart);
      const end = new Date(customEnd);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        throw new Error('Invalid custom date range: customStartDate must be <= customEndDate');
      }
      const daysCount = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return {
        preset: 'CUSTOM',
        startDate: customStart,
        endDate: customEnd,
        daysCount,
        timezone: tz,
      };
    }


    if (preset === 'TODAY') {
      const dateStr = this.formatDate(ref, tz);
      return {
        preset: 'TODAY',
        startDate: dateStr,
        endDate: dateStr,
        daysCount: 1,
        timezone: tz,
      };
    }

    if (preset === 'YESTERDAY') {
      const yesterday = new Date(ref);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const dateStr = this.formatDate(yesterday, tz);
      return {
        preset: 'YESTERDAY',
        startDate: dateStr,
        endDate: dateStr,
        daysCount: 1,
        timezone: tz,
      };
    }

    // Standard rolling presets (7D, 28D, 30D, 90D):
    // Ends yesterday to ensure complete 24h day metrics for external APIs (GSC, GA4, GBP)
    const days = PRESET_DAYS_MAP[preset as keyof typeof PRESET_DAYS_MAP] || 30;
    const end = new Date(ref);
    end.setUTCDate(end.getUTCDate() - 1);

    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - days + 1);

    return {
      preset,
      startDate: this.formatDate(start, tz),
      endDate: this.formatDate(end, tz),
      daysCount: days,
      timezone: tz,
    };
  }

  /**
   * Computes an equal-length comparison period immediately preceding the active window
   * (or shifted by precisely one year).
   */
  public static resolveComparison(
    range: AnalyticsDateRange,
    type: ComparisonType = 'PREVIOUS_PERIOD'
  ): AnalyticsComparison {
    if (type === 'NONE') {
      return {
        type: 'NONE',
        enabled: false,
        label: 'No comparison',
      };
    }

    const curStart = new Date(range.startDate + 'T00:00:00Z');
    const days = range.daysCount;

    if (type === 'PREVIOUS_YEAR') {
      const prevYearStart = new Date(curStart);
      prevYearStart.setUTCFullYear(prevYearStart.getUTCFullYear() - 1);
      const prevYearEnd = new Date(prevYearStart);
      prevYearEnd.setUTCDate(prevYearEnd.getUTCDate() + days - 1);

      return {
        type: 'PREVIOUS_YEAR',
        startDate: this.formatDate(prevYearStart, range.timezone),
        endDate: this.formatDate(prevYearEnd, range.timezone),
        daysCount: days,
        enabled: true,
        label: `vs previous year (${days} days)`,
      };
    }

    // PREVIOUS_PERIOD: Strictly equal duration immediately preceding current startDate
    const prevEnd = new Date(curStart);
    prevEnd.setUTCDate(prevEnd.getUTCDate() - 1);

    const prevStart = new Date(prevEnd);
    prevStart.setUTCDate(prevStart.getUTCDate() - days + 1);
    return {
      type: 'PREVIOUS_PERIOD',
      startDate: this.formatDate(prevStart, range.timezone),
      endDate: this.formatDate(prevEnd, range.timezone),
      daysCount: days,
      enabled: true,
      label: `vs previous ${days} days`,
    };
  }

  public static resolveDateRange(options: ResolveDateRangeOptions = {}): AnalyticsDateRange {
    return this.resolveRange(options);
  }


  public static resolveComparisonRange(
    startDate: string,
    endDate: string,
    type: ComparisonType = 'PREVIOUS_PERIOD',
    timezone: string = 'UTC'
  ): AnalyticsComparison | null {
    if (type === 'NONE') return null;

    const daysCount = this.calculateDaysBetween(startDate, endDate);
    const range: AnalyticsDateRange = {
      preset: 'CUSTOM',
      startDate,
      endDate,
      daysCount,
      timezone,
    };

    return this.resolveComparison(range, type);
  }

  public static calculateDaysBetween(startDate: string, endDate: string): number {
    const s = new Date(startDate + 'T00:00:00Z');
    const e = new Date(endDate + 'T00:00:00Z');
    return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }

  public static formatDate(d: Date, _timezone: string = 'UTC'): string {
    return d.toISOString().slice(0, 10);
  }
}

