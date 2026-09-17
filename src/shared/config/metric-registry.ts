import {
  formatNumber,
  formatPercent,
  formatPosition,
} from '@/shared/lib/formatters';

export type MetricSource = 'GSC' | 'GBP';
export type MetricUnit = 'number' | 'percent' | 'position';
export type ReportingGrain = 'DAILY' | 'MONTHLY';
export type ComparisonBehavior = 'higher_is_better' | 'lower_is_better' | 'neutral';

export interface MetricDefinition {
  id: string;
  label: string;
  source: MetricSource;
  field: string;
  unit: MetricUnit;
  formatter: (value: number) => string;
  definition: string;
  disclaimer?: string;
  validDimensions: string[];
  reportingGrain: ReportingGrain;
  comparisonBehavior: ComparisonBehavior;
  detailDestination: string; // e.g. "/reports/gsc/queries"
  retentionConstraints: string;
  isThreshold?: boolean;
}

export const METRIC_REGISTRY: Record<string, MetricDefinition> = {
  // --- Google Search Console Metrics ---
  'gsc-clicks': {
    id: 'gsc-clicks',
    label: 'Search Clicks',
    source: 'GSC',
    field: 'clicks',
    unit: 'number',
    formatter: formatNumber,
    definition: 'Total clicks from Google Search organic search results leading to your website.',
    validDimensions: ['query', 'page', 'country', 'device', 'date'],
    reportingGrain: 'DAILY',
    comparisonBehavior: 'higher_is_better',
    detailDestination: '/reports/gsc/queries',
    retentionConstraints: 'Stored and retained up to 16 months in Google Search Console.',
  },
  'gsc-impressions': {
    id: 'gsc-impressions',
    label: 'Search Impressions',
    source: 'GSC',
    field: 'impressions',
    unit: 'number',
    formatter: formatNumber,
    definition: 'Number of times your website URLs were shown in Google Search organic results to users.',
    validDimensions: ['query', 'page', 'country', 'device', 'date'],
    reportingGrain: 'DAILY',
    comparisonBehavior: 'higher_is_better',
    detailDestination: '/reports/gsc/queries',
    retentionConstraints: 'Stored and retained up to 16 months in Google Search Console.',
  },
  'gsc-ctr': {
    id: 'gsc-ctr',
    label: 'Average CTR',
    source: 'GSC',
    field: 'ctr',
    unit: 'percent',
    formatter: (val) => formatPercent(val, 2),
    definition: 'Click-through rate computed as total clicks divided by total impressions (clicks / impressions).',
    disclaimer: 'Calculated from aggregate clicks and impressions. Low-volume query rows may show volatile percentages.',
    validDimensions: ['query', 'page', 'country', 'device', 'date'],
    reportingGrain: 'DAILY',
    comparisonBehavior: 'higher_is_better',
    detailDestination: '/reports/gsc/queries',
    retentionConstraints: 'Stored and retained up to 16 months in Google Search Console.',
  },
  'gsc-position': {
    id: 'gsc-position',
    label: 'Average Position',
    source: 'GSC',
    field: 'averagePosition',
    unit: 'position',
    formatter: (val) => formatPosition(val, 1),
    definition: 'Average ranking of your website URLs across all search queries. A lower number indicates ranking higher on search result pages (e.g. position 1 is top of page 1).',
    disclaimer: 'Calculated as weighted position (sumPositionImpressions / impressions). Lower numeric value indicates ranking improvement.',
    validDimensions: ['query', 'page', 'country', 'device', 'date'],
    reportingGrain: 'DAILY',
    comparisonBehavior: 'lower_is_better',
    detailDestination: '/reports/gsc/queries',
    retentionConstraints: 'Stored and retained up to 16 months in Google Search Console.',
  },

  // --- Google Business Profile Metrics ---
  'gbp-views': {
    id: 'gbp-views',
    label: 'Profile Impressions',
    source: 'GBP',
    field: 'totalViews',
    unit: 'number',
    formatter: formatNumber,
    definition: 'Total views and impressions of your Google Business Profile across Google Search and Google Maps on desktop and mobile devices.',
    validDimensions: ['location', 'platform', 'device', 'date'],
    reportingGrain: 'DAILY',
    comparisonBehavior: 'higher_is_better',
    detailDestination: '/reports/gbp/locations',
    retentionConstraints: 'Daily performance data is subject to Google Business Profile API 30-day reporting policy window.',
  },
  'gbp-calls': {
    id: 'gbp-calls',
    label: 'Phone Call Link Clicks',
    source: 'GBP',
    field: 'callClicks',
    unit: 'number',
    formatter: formatNumber,
    definition: 'Number of times users clicked the "Call" button on your Google Business Profile listing.',
    disclaimer: 'Measures button clicks initiated from the profile. This is not proof of a completed telephone conversation.',
    validDimensions: ['location', 'date'],
    reportingGrain: 'DAILY',
    comparisonBehavior: 'higher_is_better',
    detailDestination: '/reports/gbp/locations',
    retentionConstraints: 'Daily performance data is subject to Google Business Profile API 30-day reporting policy window.',
  },
  'gbp-website-clicks': {
    id: 'gbp-website-clicks',
    label: 'Website Link Clicks',
    source: 'GBP',
    field: 'websiteClicks',
    unit: 'number',
    formatter: formatNumber,
    definition: 'Number of times users clicked the "Website" link on your Google Business Profile listing.',
    disclaimer: 'Measures link clicks from the business profile. This is not a confirmed website session recorded in web analytics.',
    validDimensions: ['location', 'date'],
    reportingGrain: 'DAILY',
    comparisonBehavior: 'higher_is_better',
    detailDestination: '/reports/gbp/locations',
    retentionConstraints: 'Daily performance data is subject to Google Business Profile API 30-day reporting policy window.',
  },
  'gbp-directions': {
    id: 'gbp-directions',
    label: 'Direction Requests',
    source: 'GBP',
    field: 'directionRequests',
    unit: 'number',
    formatter: formatNumber,
    definition: 'Number of times users requested driving directions to your location via Google Maps.',
    disclaimer: 'Measures requests for route navigation in Google Maps. This is not a confirmed in-store physical visit.',
    validDimensions: ['location', 'date'],
    reportingGrain: 'DAILY',
    comparisonBehavior: 'higher_is_better',
    detailDestination: '/reports/gbp/locations',
    retentionConstraints: 'Daily performance data is subject to Google Business Profile API 30-day reporting policy window.',
  },
  'gbp-search-terms': {
    id: 'gbp-search-terms',
    label: 'Monthly Search Terms',
    source: 'GBP',
    field: 'monthlySearchKeywords',
    unit: 'number',
    formatter: formatNumber,
    definition: 'Monthly keyword queries that led to impressions of your Google Business Profile listing.',
    disclaimer: 'Monthly aggregated grain. Privacy thresholds returned by Google are displayed as bounds (e.g. < 15) and never split into invented daily points.',
    validDimensions: ['location', 'month', 'keyword'],
    reportingGrain: 'MONTHLY',
    comparisonBehavior: 'higher_is_better',
    detailDestination: '/reports/gbp/search-terms',
    retentionConstraints: 'Monthly search keyword data retained according to Google Business Profile policy.',
    isThreshold: true,
  },
};

export type MetricId =
  | 'gsc-clicks'
  | 'gsc-impressions'
  | 'gsc-ctr'
  | 'gsc-position'
  | 'gbp-views'
  | 'gbp-calls'
  | 'gbp-website-clicks'
  | 'gbp-directions'
  | 'gbp-search-terms'
  | 'gsc_clicks'
  | 'gsc_impressions'
  | 'gsc_ctr'
  | 'gsc_position'
  | 'gbp_impressions'
  | 'gbp_calls'
  | 'gbp_website'
  | 'gbp_directions'
  | 'gbp_search_terms';

/**
 * Normalizes metric ID between kebab and snake case
 */
function normalizeMetricKey(id: string): string {
  const normalized = id.replace(/_/g, '-');
  if (normalized === 'gbp-impressions') return 'gbp-views';
  if (normalized === 'gbp-website') return 'gbp-website-clicks';
  return normalized;
}

/**
 * Helper to get metric definition or undefined
 */
export function getMetricDefinition(id: string): MetricDefinition | undefined {
  const key = normalizeMetricKey(id);
  return METRIC_REGISTRY[key];
}

/**
 * Helper to get metric config, throwing if not found
 */
export function getMetricConfig(id: string): MetricDefinition {
  const def = getMetricDefinition(id);
  if (!def) {
    throw new Error(`Metric configuration not found for id: "${id}"`);
  }
  return def;
}

/**
 * Filter all registered metrics by provider source (GSC or GBP)
 */
export function getMetricsBySource(source: MetricSource): MetricDefinition[] {
  return Object.values(METRIC_REGISTRY).filter((m) => m.source === source);
}

/**
 * Calculates CTR from compatible clicks and impressions rather than averaging percentages.
 * Returns percentage in 0-100 scale rounded to 2 decimal places.
 */
export function calculateCtr(clicks: number, impressions: number): number {
  if (!impressions || impressions <= 0 || !clicks || clicks <= 0) {
    return 0.0;
  }
  return Math.round((clicks / impressions) * 10000) / 100;
}

export interface MetricDelta {
  difference: number;
  percentChange: number;
  direction: 'up' | 'down' | 'flat';
}

/**
 * Calculates change delta between current and previous period,
 * with explicit zero-baseline handling.
 */
export function calculateDelta(current: number, previous: number): MetricDelta {
  const difference = current - previous;

  if (previous === 0) {
    if (current === 0) {
      return { difference: 0, percentChange: 0, direction: 'flat' };
    }
    return {
      difference,
      percentChange: 100,
      direction: current > 0 ? 'up' : 'down',
    };
  }

  const rawPercent = ((current - previous) / Math.abs(previous)) * 100;
  const percentChange = Math.round(rawPercent * 10) / 10;

  let direction: 'up' | 'down' | 'flat' = 'flat';
  if (percentChange > 0.01) direction = 'up';
  else if (percentChange < -0.01) direction = 'down';

  return { difference, percentChange, direction };
}

