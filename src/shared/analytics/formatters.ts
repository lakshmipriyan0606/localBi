/**
 * Canonical Analytics Formatters (Phase 13 / Client Feedback Epic)
 * Single source of truth for numbers, currency, durations, and dates.
 */

export class AnalyticsFormatters {
  private static numberFormatter = new Intl.NumberFormat('en-US');
  private static compactFormatter = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  });

  /**
   * Formats integers or floats with locale grouping (e.g. 12,480)
   */
  public static number(val: number | null | undefined): string {
    if (val === null || val === undefined || isNaN(val)) return '—';
    return this.numberFormatter.format(Math.round(val));
  }

  /**
   * Formats large numbers compactly (e.g. 12.5K, 1.2M)
   */
  public static compact(val: number | null | undefined): string {
    if (val === null || val === undefined || isNaN(val)) return '—';
    return this.compactFormatter.format(val);
  }

  /**
   * Formats a float or ratio as percentage (e.g. 4.2% or 0.042 -> 4.2%)
   */
  public static percent(val: number | null | undefined, decimals = 1): string {
    if (val === null || val === undefined || isNaN(val)) return '—';
    const num = Math.abs(val) > 0 && Math.abs(val) <= 1 ? val * 100 : val;
    return `${num.toFixed(decimals)}%`;
  }


  /**
   * Formats average search rank position (e.g. 2.4, 14.1)
   */
  public static position(val: number | null | undefined): string {
    if (val === null || val === undefined || isNaN(val) || val === 0) return '—';
    return val.toFixed(1);
  }

  /**
   * Formats ratings (e.g. 4.8 ★)
   */
  public static rating(val: number | null | undefined): string {
    if (val === null || val === undefined || isNaN(val) || val === 0) return '—';
    return val.toFixed(1);
  }

  /**
   * Formats duration in seconds to clean human-readable representation:
   * 45s -> "45s"
   * 82s -> "1m 22s"
   * 4068s -> "1h 7m 48s"
   */
  public static duration(seconds: number | null | undefined): string {
    if (seconds === null || seconds === undefined || isNaN(seconds)) return '0s';
    const totalSecs = Math.max(0, Math.round(seconds));

    if (totalSecs < 60) {
      return `${totalSecs}s`;
    }

    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const remainingSecs = totalSecs % 60;

    if (hours > 0) {
      return remainingSecs > 0
        ? `${hours}h ${minutes}m ${remainingSecs}s`
        : `${hours}h ${minutes}m`;
    }

    return remainingSecs > 0 ? `${minutes}m ${remainingSecs}s` : `${minutes}m`;
  }

  /**
   * Formats short date (e.g. "Oct 4")
   */
  public static shortDate(dateStrOrObj: string | Date): string {
    try {
      const d = typeof dateStrOrObj === 'string' ? new Date(dateStrOrObj + 'T00:00:00Z') : dateStrOrObj;
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      }).format(d);
    } catch {
      return String(dateStrOrObj);
    }
  }

  /**
   * Formats full readable date (e.g. "Oct 4, 2026")
   */
  public static fullDate(dateStrOrObj: string | Date): string {
    try {
      const d = typeof dateStrOrObj === 'string' ? new Date(dateStrOrObj + 'T00:00:00Z') : dateStrOrObj;
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(d);
    } catch {
      return String(dateStrOrObj);
    }
  }

  /**
   * Formats relative freshness timestamp (e.g. "Updated 8m ago", "Just now", "Not yet synced")
   */
  public static relativeFreshness(timestamp: Date | string | null | undefined): string {
    if (!timestamp) return 'Not yet synced';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Not yet synced';

    const now = Date.now();
    const diffSecs = Math.floor((now - date.getTime()) / 1000);

    if (diffSecs < 60) return 'Updated just now';
    if (diffSecs < 3600) {
      const mins = Math.floor(diffSecs / 60);
      return `Updated ${mins}m ago`;
    }
    if (diffSecs < 86400) {
      const hours = Math.floor(diffSecs / 3600);
      return `Updated ${hours}h ago`;
    }
    const days = Math.floor(diffSecs / 86400);
    return `Updated ${days}d ago`;
  }

}
