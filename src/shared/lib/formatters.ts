/**
 * Centralized formatting utilities for analytics metrics.
 * All number, percentage, date, and delta formatting goes through here
 * to ensure consistent display across cards, charts and tables.
 */

/**
 * Format an integer or large number with locale-appropriate thousands separators.
 * Returns '—' for null/undefined to distinguish unavailable from zero.
 */
export function formatNumber(value: number | null | undefined): string {
  if (value == null) return '—';
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/**
 * Format a decimal as a percentage with one decimal place.
 * Input: 0.0345 → Output: "3.5%"
 * Input: null → Output: "—"
 */
export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value == null) return '—';
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a raw percentage (0–100 range, not 0–1).
 */
export function formatPercentRaw(value: number | null | undefined, decimals = 1): string {
  if (value == null) return '—';
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format an average search position.
 * Lower is better; one decimal place is appropriate for this metric.
 */
export function formatPosition(value: number | null | undefined, decimals = 1): string {
  if (value == null) return '—';
  return value.toFixed(decimals);
}

/**
 * Format a growth delta percentage for display.
 * Returns object with formatted string and sign for conditional styling.
 *
 * @param value - Raw percentage number (e.g. 12.5 means +12.5%)
 * @param higherIsBetter - If false, a negative delta is "good" (e.g. lower position)
 */
export function formatDelta(
  value: number | null | undefined,
  higherIsBetter = true
): {
  text: string;
  isPositive: boolean;
  isFavorable: boolean;
  isZero: boolean;
} {
  if (value == null) {
    return { text: '—', isPositive: false, isFavorable: false, isZero: false };
  }

  const isZero = value === 0;
  const isPositive = value > 0;
  const isFavorable = higherIsBetter ? isPositive : !isPositive;
  const sign = isPositive ? '+' : '';
  const text = `${sign}${value.toFixed(1)}%`;

  return { text, isPositive, isFavorable, isZero };
}

/**
 * Format a calendar date string (YYYY-MM-DD) for axis labels and tooltips.
 */
export function formatAxisDate(dateStr: string, format: 'short' | 'medium' | 'full' = 'short'): string {
  // Parse the date string manually to avoid timezone shifts
  const parts = dateStr.split('-');
  const year = parseInt(parts[0] ?? '2000', 10);
  const month = parseInt(parts[1] ?? '1', 10);
  const day = parseInt(parts[2] ?? '1', 10);
  const date = new Date(year, month - 1, day);

  if (format === 'short') {
    // "Sep 12"
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  if (format === 'medium') {
    // "Sep 12, 2025"
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  // Full: "September 12, 2025"
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/**
 * Format a date range for display in card headers and descriptions.
 * E.g. "Sep 1 – Sep 30, 2025"
 */
export function formatDateRange(startDate: string, endDate: string): string {
  const sParts = startDate.split('-');
  const eParts = endDate.split('-');
  const sy = parseInt(sParts[0] ?? '2000', 10);
  const sm = parseInt(sParts[1] ?? '1', 10);
  const sd = parseInt(sParts[2] ?? '1', 10);
  const ey = parseInt(eParts[0] ?? '2000', 10);
  const em = parseInt(eParts[1] ?? '1', 10);
  const ed = parseInt(eParts[2] ?? '1', 10);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);

  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return `${startStr} – ${endStr}`;
}

/**
 * Format a metric value based on its type for display in cards.
 */
export function formatMetricValue(
  value: number | null | undefined,
  unit: 'clicks' | 'impressions' | 'views' | 'requests' | '%' | 'position'
): string {
  if (value == null) return '—';

  switch (unit) {
    case '%':
      // Already a multiplied percentage (e.g. CTR from API is 0.035)
      return formatPercent(value);
    case 'position':
      return formatPosition(value);
    default:
      return formatNumber(value);
  }
}

/**
 * Format a compact number for tight spaces (e.g. chart Y-axis labels).
 * 1500 → "1.5K", 1200000 → "1.2M"
 */
export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toString();
}

/**
 * Format an ISO date string (from DB) to a relative freshness label.
 * Used for "Last synced" indicators.
 */
export function formatRelativeTime(isoStringOrDate: string | Date | null | undefined): string {
  if (!isoStringOrDate) return 'Never synced';

  const date = typeof isoStringOrDate === 'string' ? new Date(isoStringOrDate) : isoStringOrDate;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 2) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getTwoLetterCountryCode(code?: string | null): string | null {
  if (!code) return null;
  const clean = code.trim().toUpperCase();
  
  // Mapping for alpha-3 codes or full names to alpha-2
  const mapTo2: Record<string, string> = {
    IND: 'IN', INDIA: 'IN',
    USA: 'US', 'UNITED STATES': 'US',
    GBR: 'GB', 'UNITED KINGDOM': 'GB', UK: 'GB',
    CAN: 'CA', CANADA: 'CA',
    AUS: 'AU', AUSTRALIA: 'AU',
    DEU: 'DE', GERMANY: 'DE',
    FRA: 'FR', FRANCE: 'FR',
    JPN: 'JP', JAPAN: 'JP',
    BRA: 'BR', BRAZIL: 'BR',
    ARE: 'AE', 'UNITED ARAB EMIRATES': 'AE', UAE: 'AE',
    SGP: 'SG', SINGAPORE: 'SG',
    MYS: 'MY', MALAYSIA: 'MY',
    SAU: 'SA', 'SAUDI ARABIA': 'SA',
    ITA: 'IT', ITALY: 'IT',
    ESP: 'ES', SPAIN: 'ES',
    NLD: 'NL', NETHERLANDS: 'NL',
    CHE: 'CH', SWITZERLAND: 'CH',
    SWE: 'SE', SWEDEN: 'SE',
    NOR: 'NO', NORWAY: 'NO',
    DNK: 'DK', DENMARK: 'DK',
    FIN: 'FI', FINLAND: 'FI',
    RUS: 'RU', RUSSIA: 'RU',
    CHN: 'CN', CHINA: 'CN',
    MEX: 'MX', MEXICO: 'MX',
    IDN: 'ID', INDONESIA: 'ID',
    TUR: 'TR', TURKEY: 'TR',
    POL: 'PL', POLAND: 'PL',
    THA: 'TH', THAILAND: 'TH',
    ZAF: 'ZA', 'SOUTH AFRICA': 'ZA',
    EGY: 'EG', EGYPT: 'EG',
    ARG: 'AR', ARGENTINA: 'AR',
    COL: 'CO', COLOMBIA: 'CO',
    PHL: 'PH', PHILIPPINES: 'PH',
    VNM: 'VN', VIETNAM: 'VN',
    KOR: 'KR', 'SOUTH KOREA': 'KR',
  };
  
  const twoLetter = mapTo2[clean] || (clean.length === 2 ? clean : clean.slice(0, 2));
  
  if (twoLetter.length === 2 && /^[A-Z]{2}$/.test(twoLetter)) {
    return twoLetter;
  }
  return null;
}

/**
 * Convert ISO 3166-1 alpha-3 or alpha-2 country code into an emoji flag with fallback.
 */
export function getCountryFlag(code?: string | null): string {
  const twoLetter = getTwoLetterCountryCode(code);
  if (twoLetter) {
    const codePoints = [...twoLetter].map((c) => 127397 + c.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  }
  return '🌐';
}

