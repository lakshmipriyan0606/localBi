/**
 * Centralized Metric Definition Registry (Phase 13)
 * Single source of truth for all executive and client reporting metrics,
 * their data source provenance, formats, and calculation descriptions.
 */

export type MetricSource =
  | 'GA4'
  | 'GSC'
  | 'GBP'
  | 'LOCALBI'
  | 'TELEPHONY'
  | 'MERCHANT'
  | 'LOCAL_RANK_PROVIDER'
  | 'DIRECTORY_PROVIDER'
  | 'BACKLINK_PROVIDER';

export type MetricFormat =
  | 'number'
  | 'percent'
  | 'currency'
  | 'position'
  | 'duration'
  | 'rating';

export interface MetricDefinition {
  key: string;
  displayName: string;
  description: string;
  source: MetricSource;
  format: MetricFormat;
  calculationDescription: string;
}

export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  // ── First-Party LocalBi Analytics ──
  'localbi.visitors': {
    key: 'localbi.visitors',
    displayName: 'Unique Visitors',
    description: 'Distinct anonymous visitors identified by first-party cookie on LocalBi web surfaces.',
    source: 'LOCALBI',
    format: 'number',
    calculationDescription: 'COUNT(DISTINCT visitor_id) recorded by first-party LocalBi tracker.',
  },
  'localbi.sessions': {
    key: 'localbi.sessions',
    displayName: 'Visits / Sessions',
    description: 'Distinct browsing sessions on LocalBi surfaces with 30-minute inactivity threshold.',
    source: 'LOCALBI',
    format: 'number',
    calculationDescription: 'COUNT(DISTINCT session_id) sessionized by LocalBi SessionizationService.',
  },
  'localbi.pageviews': {
    key: 'localbi.pageviews',
    displayName: 'Page Views',
    description: 'Total number of store, product, and city pages viewed on LocalBi surfaces.',
    source: 'LOCALBI',
    format: 'number',
    calculationDescription: 'Total count of PAGE_VIEW events recorded on LocalBi surfaces.',
  },
  'localbi.activeEngagement': {
    key: 'localbi.activeEngagement',
    displayName: 'Avg. Active Engagement',
    description: 'Actual time spent actively viewing and interacting with the page (excluding background tabs).',
    source: 'LOCALBI',
    format: 'duration',
    calculationDescription: 'SUM(active_engagement_ms) / sessions count, accumulated via visibility API.',
  },
  'localbi.conversions': {
    key: 'localbi.conversions',
    displayName: 'Total Conversions',
    description: 'High-intent visitor actions (Calls, WhatsApp clicks, Direction requests, Form submissions).',
    source: 'LOCALBI',
    format: 'number',
    calculationDescription: 'SUM of CALL_CLICK, WHATSAPP_CLICK, DIRECTIONS_CLICK, and FORM_SUBMIT events.',
  },
  'localbi.conversionRate': {
    key: 'localbi.conversionRate',
    displayName: 'Conversion Rate',
    description: 'Percentage of visitor sessions resulting in at least one conversion event.',
    source: 'LOCALBI',
    format: 'percent',
    calculationDescription: '(Converted Sessions / Total Sessions) * 100.',
  },

  // ── Website Performance (GA4 & GSC) ──
  'website.users': {
    key: 'website.users',
    displayName: 'Active Users',
    description: 'Distinct individuals who initiated at least one session on the LocalBi website.',
    source: 'GA4',
    format: 'number',
    calculationDescription: 'COUNT(DISTINCT user_pseudo_id) from Google Analytics 4 for filtered hostname.',
  },
  'website.sessions': {
    key: 'website.sessions',
    displayName: 'Total Sessions',
    description: 'Number of individual user visits to the storefront microsites.',
    source: 'GA4',
    format: 'number',
    calculationDescription: 'SUM(ga_session_id) instances recorded in Google Analytics 4.',
  },
  'website.pageViews': {
    key: 'website.pageViews',
    displayName: 'Page Views',
    description: 'Total number of web pages viewed across the LocalBi storefront.',
    source: 'GA4',
    format: 'number',
    calculationDescription: 'Total count of page_view events across all web surfaces.',
  },
  'website.gscClicks': {
    key: 'website.gscClicks',
    displayName: 'Search Clicks',
    description: 'Organic clicks from Google Search results leading to LocalBi surfaces.',
    source: 'GSC',
    format: 'number',
    calculationDescription: 'Direct organic click count aggregated from Google Search Console URL prefix API.',
  },
  'website.gscImpressions': {
    key: 'website.gscImpressions',
    displayName: 'Search Impressions',
    description: 'Number of times LocalBi URLs appeared in Google Search results to searchers.',
    source: 'GSC',
    format: 'number',
    calculationDescription: 'Direct impression count aggregated from Google Search Console API.',
  },
  'website.ctr': {
    key: 'website.ctr',
    displayName: 'Click-Through Rate (CTR)',
    description: 'Percentage of search impressions that resulted in an organic click.',
    source: 'GSC',
    format: 'percent',
    calculationDescription: '(GSC Clicks / GSC Impressions) * 100',
  },
  'website.averagePosition': {
    key: 'website.averagePosition',
    displayName: 'Average Position',
    description: 'Average top ranking position of the URL in organic Google Search results.',
    source: 'GSC',
    format: 'position',
    calculationDescription: 'Weighted average position returned by Google Search Console.',
  },

  // ── Local Actions & Attribution (LOCALBI) ──
  'actions.calls': {
    key: 'actions.calls',
    displayName: 'Call CTA Clicks',
    description: 'Number of times visitors clicked the primary "Call Store" button on website pages.',
    source: 'LOCALBI',
    format: 'number',
    calculationDescription: 'Count of verified CALL_CLICK attribution events recorded on LocalBi pages.',
  },
  'actions.whatsapp': {
    key: 'actions.whatsapp',
    displayName: 'WhatsApp Inquiries',
    description: 'Visitors clicking the WhatsApp chat button to start a conversation.',
    source: 'LOCALBI',
    format: 'number',
    calculationDescription: 'Count of WHATSAPP_CLICK attribution events recorded on LocalBi pages.',
  },
  'actions.directions': {
    key: 'actions.directions',
    displayName: 'Direction Requests',
    description: 'Visitors requesting driving or walking directions to a physical store location.',
    source: 'LOCALBI',
    format: 'number',
    calculationDescription: 'Count of DIRECTION_CLICK attribution events recorded on LocalBi pages.',
  },
  'actions.formLeads': {
    key: 'actions.formLeads',
    displayName: 'Form Submissions',
    description: 'Inquiries submitted via contact, booking, or quote forms.',
    source: 'LOCALBI',
    format: 'number',
    calculationDescription: 'Count of validated lead inquiries submitted through storefront forms.',
  },
  'actions.bookings': {
    key: 'actions.bookings',
    displayName: 'Bookings / Appointments',
    description: 'Confirmed appointments or reservations initiated on the store website.',
    source: 'LOCALBI',
    format: 'number',
    calculationDescription: 'Count of appointment/booking completion events.',
  },

  // ── Real Tracked Calls (TELEPHONY) ──
  'telephony.inboundCalls': {
    key: 'telephony.inboundCalls',
    displayName: 'Real Tracked Calls',
    description: 'Actual inbound phone calls received through LocalBi dynamic virtual tracking numbers.',
    source: 'TELEPHONY',
    format: 'number',
    calculationDescription: 'Count of connected telephony provider webhook call records.',
  },
  'telephony.answeredRate': {
    key: 'telephony.answeredRate',
    displayName: 'Call Answer Rate',
    description: 'Percentage of inbound calls successfully answered by store staff.',
    source: 'TELEPHONY',
    format: 'percent',
    calculationDescription: '(Completed / Total Inbound Calls) * 100',
  },
  'telephony.totalTalkMinutes': {
    key: 'telephony.totalTalkMinutes',
    displayName: 'Total Talk Time',
    description: 'Cumulative duration of completed phone conversations with customers in minutes.',
    source: 'TELEPHONY',
    format: 'duration',
    calculationDescription: 'SUM(talk_duration_seconds) / 60 from telephony call logs.',
  },

  // ── Google Business Profile (GBP) ──
  'gbp.rating': {
    key: 'gbp.rating',
    displayName: 'Average Rating',
    description: 'Overall star rating across all connected Google Business Profile locations.',
    source: 'GBP',
    format: 'rating',
    calculationDescription: 'Average star rating directly fetched from Google Business Profile locations.',
  },
  'gbp.reviewsCount': {
    key: 'gbp.reviewsCount',
    displayName: 'Total Reviews',
    description: 'Total cumulative customer reviews on Google Business Profile.',
    source: 'GBP',
    format: 'number',
    calculationDescription: 'Count of customer reviews synced from Google Business Profile.',
  },
  'gbp.unansweredReviews': {
    key: 'gbp.unansweredReviews',
    displayName: 'Unanswered Reviews',
    description: 'Customer reviews awaiting an owner response.',
    source: 'GBP',
    format: 'number',
    calculationDescription: 'Count of synced reviews where reviewReply is empty.',
  },

  // ── Local Rank Intelligence (LOCAL_RANK_PROVIDER) ──
  'rank.trackedKeywords': {
    key: 'rank.trackedKeywords',
    displayName: 'Tracked Keywords',
    description: 'Total distinct target search queries tracked on geo-grid heatmaps.',
    source: 'LOCAL_RANK_PROVIDER',
    format: 'number',
    calculationDescription: 'Count of active target keywords configured for geo-grid scans.',
  },
  'rank.top3Coverage': {
    key: 'rank.top3Coverage',
    displayName: 'Top-3 Rank Coverage',
    description: 'Percentage of geo-grid observation points where the store appeared in positions 1 to 3.',
    source: 'LOCAL_RANK_PROVIDER',
    format: 'percent',
    calculationDescription: '(Points in Top 3 / Total Geo-Grid Grid Points) * 100',
  },
  'rank.top10Coverage': {
    key: 'rank.top10Coverage',
    displayName: 'Top-10 Rank Coverage',
    description: 'Percentage of geo-grid observation points where the store appeared in positions 1 to 10.',
    source: 'LOCAL_RANK_PROVIDER',
    format: 'percent',
    calculationDescription: '(Points in Top 10 / Total Geo-Grid Grid Points) * 100',
  },
  'rank.averageFoundRank': {
    key: 'rank.averageFoundRank',
    displayName: 'Average Found Rank',
    description: 'Average ranking position across points where the store was detected (excluding not-found).',
    source: 'LOCAL_RANK_PROVIDER',
    format: 'position',
    calculationDescription: 'SUM(rank) / count_of_found_points (strictly avoiding synthetic 100 for not-found).',
  },

  // ── Merchant Center / Catalog (MERCHANT) ──
  'merchant.productsApproved': {
    key: 'merchant.productsApproved',
    displayName: 'Approved Products',
    description: 'Catalog products successfully validated and approved by Google Merchant Center.',
    source: 'MERCHANT',
    format: 'number',
    calculationDescription: 'Count of products with Merchant approval status "APPROVED".',
  },
  'merchant.productsDisapproved': {
    key: 'merchant.productsDisapproved',
    displayName: 'Disapproved Products',
    description: 'Products with policy violations or data errors requiring correction.',
    source: 'MERCHANT',
    format: 'number',
    calculationDescription: 'Count of products rejected or disapproved by Google Content API.',
  },
  'merchant.inventoryErrors': {
    key: 'merchant.inventoryErrors',
    displayName: 'Local Inventory Issues',
    description: 'Store-level inventory discrepancies or missing stock updates.',
    source: 'MERCHANT',
    format: 'number',
    calculationDescription: 'Count of local inventory state errors reported across stores.',
  },

  // ── Content & Growth Engine (LOCALBI) ──
  'content.publishedArticles': {
    key: 'content.publishedArticles',
    displayName: 'Published Articles',
    description: 'Live SEO articles and guides published on the storefront blog.',
    source: 'LOCALBI',
    format: 'number',
    calculationDescription: 'Count of blog content items in "PUBLISHED" status.',
  },
  'content.organicClicks': {
    key: 'content.organicClicks',
    displayName: 'Blog Search Clicks',
    description: 'Organic clicks directed specifically to published blog articles.',
    source: 'GSC',
    format: 'number',
    calculationDescription: 'GSC clicks matched to URL paths under /blog/ or article slugs.',
  },

  // ── Directory Presence & NAP (DIRECTORY_PROVIDER) ──
  'listings.providersChecked': {
    key: 'listings.providersChecked',
    displayName: 'Directories Audited',
    description: 'Number of external search and navigation directories audited for NAP consistency.',
    source: 'DIRECTORY_PROVIDER',
    format: 'number',
    calculationDescription: 'Count of configured external directory providers (Apple Maps, Bing, Yelp, etc.).',
  },
  'listings.healthyCount': {
    key: 'listings.healthyCount',
    displayName: 'Healthy Listings',
    description: 'Listings verified with 100% Name, Address, and Phone consistency.',
    source: 'DIRECTORY_PROVIDER',
    format: 'number',
    calculationDescription: 'Count of directory listings with napOverallStatus = "MATCH".',
  },
  'listings.duplicatesCount': {
    key: 'listings.duplicatesCount',
    displayName: 'Duplicate Candidates',
    description: 'Conflicting or duplicate listings identified on directory providers.',
    source: 'DIRECTORY_PROVIDER',
    format: 'number',
    calculationDescription: 'Count of active duplicate candidate pairs awaiting human review.',
  },

  // ── SEO Opportunities (LOCALBI) ──
  'opportunities.highPriority': {
    key: 'opportunities.highPriority',
    displayName: 'High-Priority Opportunities',
    description: 'Factual algorithmic SEO opportunities identified with HIGH impact potential.',
    source: 'LOCALBI',
    format: 'number',
    calculationDescription: 'Count of OPEN opportunities with priority = "HIGH".',
  },
  'opportunities.completed': {
    key: 'opportunities.completed',
    displayName: 'Completed Optimizations',
    description: 'SEO recommendations applied and verified across web pages and store profiles.',
    source: 'LOCALBI',
    format: 'number',
    calculationDescription: 'Count of opportunities transitioned to "COMPLETED" status.',
  },
};

export class MetricRegistry {
  public static getDefinition(key: string): MetricDefinition | undefined {
    return METRIC_DEFINITIONS[key];
  }

  public static requireDefinition(key: string): MetricDefinition {
    const def = METRIC_DEFINITIONS[key];
    if (!def) {
      throw new Error(`Metric definition not found for key: ${key}`);
    }
    return def;
  }

  public static listAll(): MetricDefinition[] {
    return Object.values(METRIC_DEFINITIONS);
  }

  public static listBySource(source: MetricSource): MetricDefinition[] {
    return Object.values(METRIC_DEFINITIONS).filter((d) => d.source === source);
  }
}
