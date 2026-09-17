/**
 * Design tokens and configuration shared across the localBi analytics UI.
 * CSS color variables are defined in globals.css; this file holds
 * JS-accessible counterparts needed for chart rendering and metric logic.
 */

/** Chart series colors — must stay in sync with globals.css chart vars */
export const CHART_COLORS = {
  /** Google Search Console series */
  gsc: '#4338CA',
  /** Google Business Profile series */
  gbp: '#0F766E',
  /** Neutral / comparison line */
  neutral: '#94A3B8',
  /** Positive fill / area */
  positive: '#047857',
  /** Negative fill / area */
  negative: '#B91C1C',
  /** Grid lines */
  grid: '#E2E8F0',
  /** Axis labels */
  axis: '#94A3B8',
} as const;

/** Ordered series palette for multi-series charts */
export const CHART_SERIES_PALETTE = [
  CHART_COLORS.gsc,
  CHART_COLORS.gbp,
  '#7C3AED', // violet
  '#0369A1', // sky
  '#B45309', // amber
] as const;

/**
 * Per-metric configuration.
 * `higherIsBetter` controls the delta icon direction:
 *   - true  → green ↑ for positive delta
 *   - false → green ↓ for positive delta (lower position = better rank)
 */
export const METRIC_CONFIG = {
  gscClicks: {
    label: 'Search Clicks',
    source: 'GSC',
    unit: 'clicks',
    higherIsBetter: true,
  },
  gscImpressions: {
    label: 'Search Impressions',
    source: 'GSC',
    unit: 'impressions',
    higherIsBetter: true,
  },
  gscCtr: {
    label: 'Click-Through Rate',
    source: 'GSC',
    unit: '%',
    higherIsBetter: true,
  },
  gscPosition: {
    label: 'Average Position',
    source: 'GSC',
    unit: 'position',
    // Lower position number = better ranking
    higherIsBetter: false,
  },
  gbpViews: {
    label: 'Business Profile Views',
    source: 'GBP',
    unit: 'views',
    higherIsBetter: true,
  },
  gbpCallClicks: {
    label: 'Call-Button Clicks',
    source: 'GBP',
    unit: 'clicks',
    // Intent metric — higher is better
    higherIsBetter: true,
  },
  /**
   * GBP website link clicks: user tapped the website link on the GBP listing.
   * NOT the same as a confirmed website session/visit.
   */
  gbpWebsiteLinkClicks: {
    label: 'Website Link Clicks',
    source: 'GBP',
    unit: 'clicks',
    higherIsBetter: true,
  },
  gbpDirectionRequests: {
    label: 'Direction Requests',
    source: 'GBP',
    unit: 'requests',
    higherIsBetter: true,
  },
} as const;

export type MetricKey = keyof typeof METRIC_CONFIG;

/** Motion durations in ms, matches globals.css --motion-* tokens */
export const MOTION = {
  fast: 120,
  normal: 200,
  slow: 300,
} as const;

/** Breakpoints matching Tailwind's defaults */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;
