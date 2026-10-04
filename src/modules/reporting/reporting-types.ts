import { MetricComparisonResult } from './comparison-engine';
import { ResolvedDateRange, ResolvedComparisonRange } from './reporting-date-service';

export type ModuleReportState =
  | 'DATA'
  | 'NO_DATA'
  | 'NOT_CONNECTED'
  | 'REAUTH_REQUIRED'
  | 'UPSTREAM_ERROR'
  | 'STALE'
  | 'SYNCING'
  | 'INSUFFICIENT_DATA';

export interface WebsiteReportDto {
  state: ModuleReportState;
  webSurfaceType: 'LOCALBI' | 'ORIGINAL';
  webSurfaceId: string;
  metrics: {
    users: MetricComparisonResult;
    sessions: MetricComparisonResult;
    pageViews: MetricComparisonResult;
    gscClicks: MetricComparisonResult;
    gscImpressions: MetricComparisonResult;
    ctr: MetricComparisonResult;
    averagePosition: MetricComparisonResult;
  };
  timeseries: Array<{
    date: string;
    users: number;
    sessions: number;
    clicks: number;
    impressions: number;
  }>;
  topQueries: Array<{
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  topPages: Array<{
    path: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
}

export interface LocalActionsReportDto {
  state: ModuleReportState;
  metrics: {
    calls: MetricComparisonResult;
    whatsapp: MetricComparisonResult;
    directions: MetricComparisonResult;
    formLeads: MetricComparisonResult;
    bookings: MetricComparisonResult;
    totalActions: MetricComparisonResult;
  };
  byChannel: Array<{
    channel: string;
    count: number;
    percentage: number;
  }>;
}

export interface TelephonyReportDto {
  state: ModuleReportState;
  metrics: {
    inboundCalls: MetricComparisonResult;
    answeredRate: MetricComparisonResult;
    totalTalkMinutes: MetricComparisonResult;
    avgDurationSeconds: MetricComparisonResult;
  };
  recentCalls: Array<{
    id: string;
    startedAt: string;
    storeName: string;
    callerMasked: string;
    status: string;
    duration: number;
  }>;
}

export interface GbpReportDto {
  state: ModuleReportState;
  metrics: {
    mappedLocations: number;
    averageRating: MetricComparisonResult;
    totalReviews: MetricComparisonResult;
    unansweredReviews: MetricComparisonResult;
    profileCompleteness: number; // 0-100
  };
  ratingBreakdown: Array<{
    stars: number;
    count: number;
  }>;
}

export interface RankReportDto {
  state: ModuleReportState;
  metrics: {
    trackedKeywords: number;
    top3Coverage: MetricComparisonResult;
    top10Coverage: MetricComparisonResult;
    foundCoverage: MetricComparisonResult;
    averageFoundRank: MetricComparisonResult;
  };
  topKeywords: Array<{
    keyword: string;
    top3Rate: number;
    avgRank: number;
  }>;
}

export interface MerchantReportDto {
  state: ModuleReportState;
  metrics: {
    enabledProducts: number;
    approved: MetricComparisonResult;
    disapproved: MetricComparisonResult;
    inventoryErrors: MetricComparisonResult;
  };
  topIssues: Array<{
    issueCode: string;
    affectedProducts: number;
    severity: string;
  }>;
}

export interface ContentReportDto {
  state: ModuleReportState;
  metrics: {
    publishedArticles: MetricComparisonResult;
    organicClicks: MetricComparisonResult;
    organicConversions: MetricComparisonResult;
  };
  topArticles: Array<{
    id: string;
    title: string;
    slug: string;
    clicks: number;
    conversions: number;
    publishedAt: string;
  }>;
}

export interface ListingsReportDto {
  state: ModuleReportState;
  metrics: {
    providersChecked: number;
    healthyCount: MetricComparisonResult;
    needsReviewCount: MetricComparisonResult;
    duplicatesCount: MetricComparisonResult;
    totalBacklinks?: number;
    referringDomains?: number;
    newLinksLast30Days?: number;
    lostLinksLast30Days?: number;
  };
  providerSummary: Array<{
    provider: string;
    total: number;
    healthy: number;
    issues: number;
  }>;
}

export interface OpportunitiesSummaryDto {
  state: ModuleReportState;
  metrics: {
    openCount: number;
    highPriorityCount: number;
    completedCount: number;
  };
  topOpportunities: Array<{
    id: string;
    title: string;
    priority: string;
    impactScore: number;
    status: string;
  }>;
}

export interface StorePerformanceRow {
  storeId: string;
  storeName: string;
  city: string;
  websiteActions: number;
  calls: number;
  leads: number;
  rating: number | null;
  reviewsCount: number;
  top3Coverage: number | null;
  listingIssues: number;
}

// -----------------------------------------------------------------------------
// WORKSTREAM F: UNIFIED REPORTING & EXECUTIVE INTELLIGENCE DTOs
// -----------------------------------------------------------------------------

export interface SearchReportDto {
  state: ModuleReportState;
  source: 'GSC';
  metrics: {
    clicks: MetricComparisonResult;
    impressions: MetricComparisonResult;
    ctr: MetricComparisonResult;
    averagePosition: MetricComparisonResult;
    trackedKeywordsCount: number;
    top3Coverage: MetricComparisonResult;
    averageRank: MetricComparisonResult;
  };
  timeseries: Array<{
    date: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  topQueries: Array<{
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  topPages: Array<{
    path: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
}

export interface FirstPartyWebAnalyticsReportDto {
  state: ModuleReportState;
  source: 'LOCALBI';
  metrics: {
    visitors: MetricComparisonResult;
    sessions: MetricComparisonResult;
    pageViews: MetricComparisonResult;
    avgActiveEngagementSeconds: MetricComparisonResult;
    bounceRate: MetricComparisonResult;
  };
  timeseries: Array<{
    date: string;
    visitors: number;
    sessions: number;
    pageViews: number;
    avgActiveEngagementSeconds: number;
  }>;
  topLandingPages: Array<{
    path: string;
    pageViews: number;
    visitors: number;
    avgDurationSeconds: number;
  }>;
  topStores: Array<{
    storeId: string;
    name: string;
    pageViews: number;
    visitors: number;
    ctaClicks: number;
  }>;
  topProducts: Array<{
    productId: string;
    name: string;
    pageViews: number;
    visitors: number;
    conversions: number;
  }>;
  ga4Comparison?: {
    users: number;
    sessions: number;
    note: string;
  };
}

export interface UnifiedConversionsReportDto {
  state: ModuleReportState;
  websiteActions: {
    callClicks: MetricComparisonResult;
    whatsappClicks: MetricComparisonResult;
    directionsClicks: MetricComparisonResult;
    formStarts: MetricComparisonResult;
    totalActions: MetricComparisonResult;
  };
  confirmedConversions: {
    formLeads: MetricComparisonResult;
    trackedCalls: MetricComparisonResult;
    bookings: MetricComparisonResult;
    totalConfirmed: MetricComparisonResult;
  };
  byChannel: Array<{
    channel: string;
    actions: number;
    confirmed: number;
  }>;
}

export interface SeoAuthorityReportDto {
  state: ModuleReportState;
  providerState: 'CONFIGURED' | 'NOT_CONFIGURED' | 'ERROR';
  providerName: string;
  metrics: {
    referringDomains: MetricComparisonResult;
    backlinks: MetricComparisonResult;
    newLinks: MetricComparisonResult;
    lostLinks: MetricComparisonResult;
    healthyListings: MetricComparisonResult;
    listingIssues: MetricComparisonResult;
    duplicateListings: MetricComparisonResult;
    missingCitations: MetricComparisonResult;
  };
  topReferringDomains: Array<{
    domain: string;
    activeBacklinks: number;
    linkedPages: number;
    providerMetric: number | null;
    competitorOverlap: number;
  }>;
  directorySummary: Array<{
    directory: string;
    status: string;
    isHealthy: boolean;
  }>;
}

export interface DataHealthItem {
  source: 'GSC' | 'GA4' | 'GBP' | 'LOCALBI_TRACKING' | 'DATAFORSEO' | 'LISTINGS';
  label: string;
  status: 'CONNECTED' | 'HEALTHY' | 'STALE' | 'PARTIAL' | 'NOT_CONFIGURED' | 'ERROR';
  lastSyncAt: string | null;
  message: string;
}

export interface WhatChangedInsight {
  id: string;
  dimension: 'SEARCH' | 'WEBSITE' | 'CONVERSIONS' | 'LOCAL' | 'AUTHORITY';
  changeType: 'POSITIVE' | 'ATTENTION' | 'NEUTRAL';
  headline: string;
  details: string;
  metric: string;
  source: string;
  deltaPercentage: number | null;
}

export interface UnifiedOpportunityItem {
  id: string;
  what: string;
  why: string;
  evidence: {
    source: string;
    metric: string;
    value: string | number;
    comparisonValue?: string | number | null;
    formattedValue?: string | null;
    details?: any;
  };
  action: string;
  actionUrl?: string;
  impactArea:
    | 'SEARCH_VISIBILITY'
    | 'LOCAL_PRESENCE'
    | 'WEBSITE_CONVERSION'
    | 'CONTENT'
    | 'SEO_AUTHORITY'
    | 'CUSTOMER_TRUST';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status:
    | 'OPEN'
    | 'IN_REVIEW'
    | 'APPROVED'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'VERIFIED'
    | 'DISMISSED';
  provenance: 'RULE_BASED' | 'AI_ASSISTED' | 'PROVIDER_DETECTED' | 'USER_CREATED';
  storeId?: string | null;
  storeName?: string | null;
  brandId: string;
  createdAt: string;
  verifiedAt?: string | null;
}

export interface ExecutiveOverviewDto {
  tenantId: string;
  tenantSlug: string;
  brandId: string;
  brandName: string;
  dateRange: ResolvedDateRange;
  comparisonRange: ResolvedComparisonRange | null;
  generatedAt: string;
  businessMetrics: {
    searchClicks: { value: number; delta: number | null; source: 'GSC'; freshness: string | null };
    websiteVisitors: { value: number; delta: number | null; source: 'LOCALBI'; freshness: string | null };
    confirmedConversions: { value: number; delta: number | null; source: 'LOCALBI'; freshness: string | null };
    profileActions: { value: number; delta: number | null; source: 'GBP'; freshness: string | null };
    trackedStores: { value: number; source: 'LOCALBI'; freshness: string | null };
    openHighPriorityOpportunities: { value: number; source: 'LOCALBI'; freshness: string | null };
  };
  dataHealth: DataHealthItem[];
  whatChanged: WhatChangedInsight[];
  search: SearchReportDto;
  website: FirstPartyWebAnalyticsReportDto;
  localPresence: GbpReportDto & { listings: ListingsReportDto };
  conversions: UnifiedConversionsReportDto;
  seoAuthority: SeoAuthorityReportDto;
  topOpportunities: UnifiedOpportunityItem[];
}

export interface ExecutiveReportDto {
  tenantId: string;
  tenantName: string;
  brandId: string;
  brandName: string;
  dateRange: ResolvedDateRange;
  comparisonRange: ResolvedComparisonRange | null;
  generatedAt: string;
  dataFreshness: Record<string, string | null>;
  partial: boolean;
  unavailableModules: string[];
  website: WebsiteReportDto;
  localActions: LocalActionsReportDto;
  telephony: TelephonyReportDto;
  gbp: GbpReportDto;
  rank: RankReportDto;
  merchant: MerchantReportDto;
  content: ContentReportDto;
  listings: ListingsReportDto;
  opportunities: OpportunitiesSummaryDto;
  stores: StorePerformanceRow[];
  search?: SearchReportDto;
  firstPartyWeb?: FirstPartyWebAnalyticsReportDto;
  conversionsUnified?: UnifiedConversionsReportDto;
  seoAuthority?: SeoAuthorityReportDto;
}

