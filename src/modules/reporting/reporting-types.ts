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
}
