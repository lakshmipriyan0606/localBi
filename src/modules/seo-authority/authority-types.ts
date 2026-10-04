import { z } from 'zod';

// ============================================================================
// 1. PROVIDER & STATUS ENUMS
// ============================================================================

export type BacklinkProviderState =
  | 'CONFIGURED'
  | 'NOT_CONFIGURED'
  | 'NO_DATA'
  | 'STALE'
  | 'PARTIAL'
  | 'RATE_LIMITED'
  | 'AUTH_REQUIRED'
  | 'UPSTREAM_ERROR';

export type FollowState =
  | 'FOLLOW'
  | 'NOFOLLOW'
  | 'UGC'
  | 'SPONSORED'
  | 'UNKNOWN';

export type BacklinkStatus =
  | 'ACTIVE'
  | 'LOST'
  | 'RECONCILED';

export type RelevanceDimensionScore =
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'UNKNOWN';

export type RiskLevel =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'UNKNOWN';

export type LinkContext =
  | 'EDITORIAL'
  | 'RESOURCE'
  | 'DIRECTORY'
  | 'CITATION'
  | 'PRESS'
  | 'UNKNOWN';

export type RelationshipType =
  | 'SUPPLIER'
  | 'LOCAL_ORGANIZATION'
  | 'INDUSTRY_ASSOCIATION'
  | 'PARTNERSHIP'
  | 'RESOURCE_PAGE'
  | 'EDITORIAL'
  | 'UNKNOWN';

export type CitationFieldStatus =
  | 'MATCH'
  | 'NEEDS_REVIEW'
  | 'MISMATCH'
  | 'MISSING'
  | 'UNKNOWN';

export type DirectoryPresenceStatus =
  | 'PRESENT'
  | 'MISSING'
  | 'UNKNOWN';

// ============================================================================
// 2. NORMALIZED DOMAIN MODELS
// ============================================================================

export interface BacklinkRecord {
  id: string;
  tenantId: string;
  brandId: string;
  webSurfaceId: string;
  provider: string; // e.g., 'DATAFORSEO', 'AHREFS', 'SEMRUSH'
  externalId?: string | null;
  referringDomain: string;
  linkingUrl: string;
  targetUrl: string;
  targetPageId?: string | null;
  anchorText?: string | null;
  followState: FollowState;
  firstSeenAt?: Date | null;
  lastSeenAt?: Date | null;
  status: BacklinkStatus;
  providerAuthorityMetric?: number | null; // e.g. 68
  providerAuthorityMetricName?: string | null; // e.g. 'DR', 'Domain Rank'
  discoveredAt: Date;
  updatedAt: Date;
}

export interface ReferringDomainRecord {
  id: string;
  tenantId: string;
  brandId: string;
  webSurfaceId: string;
  domain: string;
  activeLinksCount: number;
  linkedPagesCount: number;
  providerAuthorityMetric?: number | null;
  providerAuthorityMetricName?: string | null;
  firstSeenAt?: Date | null;
  lastSeenAt?: Date | null;
  competitorOverlapCount: number;
  opportunityState: 'NONE' | 'OPPORTUNITY_CREATED' | 'DISMISSED';
  updatedAt: Date;
}

export interface CompetitorBacklinkGapCandidate {
  domain: string;
  clientHasBacklink: boolean;
  competitorCount: number;
  competitorDomains: string[];
  relevance: {
    overall: RelevanceDimensionScore;
    topical: RelevanceDimensionScore;
    industry: RelevanceDimensionScore;
    local: RelevanceDimensionScore;
    businessLegitimacy: RelevanceDimensionScore;
    linkContext: LinkContext;
    relationshipType: RelationshipType;
    explanation: string;
  };
  risk: {
    level: RiskLevel;
    reasons: string[];
  };
  provenance: 'RULE_BASED' | 'AI_ANALYZED';
  providerMetric?: {
    name: string;
    value: number;
    provider: string;
  } | null;
  sampleSourceUrls: string[];
}

// ============================================================================
// 3. CITATION INTELLIGENCE MODELS
// ============================================================================

export interface ExpectedDirectory {
  provider: string;
  displayName: string;
  portalUrl?: string;
  isManualOnly: boolean;
  applicableCountries: string[];
  applicableCategories?: string[];
  importance: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

export interface StoreCitationOverview {
  storeId: string;
  storeName: string;
  storeCity: string;
  country: string;
  metrics: {
    totalExpected: number;
    present: number;
    healthy: number;
    needsReview: number;
    mismatch: number;
    duplicates: number;
    missing: number;
    unknown: number;
  };
  listings: StoreListingDetail[];
  missingDirectories: MissingDirectoryDetail[];
}

export interface StoreListingDetail {
  listingId: string;
  provider: string;
  providerUrl?: string | null;
  claimStatus: 'CLAIMED' | 'UNCLAIMED' | 'UNKNOWN';
  consistency: 'HEALTHY' | 'NEEDS_REVIEW' | 'MISMATCH' | 'ERROR';
  lastChecked?: Date | null;
  comparison: {
    name: { canonical: string; provider: string | null; status: CitationFieldStatus };
    phone: { canonical: string | null; provider: string | null; status: CitationFieldStatus };
    address: { canonical: string; provider: string | null; status: CitationFieldStatus };
    website: { canonical: string | null; provider: string | null; status: CitationFieldStatus };
    hours: { canonical: any; provider: any; status: CitationFieldStatus };
  };
  hasPendingChangeSet: boolean;
  isManualOnly: boolean;
}

export interface MissingDirectoryDetail {
  provider: string;
  displayName: string;
  portalUrl?: string;
  importance: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  reason: string;
  competitorsPresentCount: number;
  status: 'MISSING' | 'UNKNOWN';
}

// ============================================================================
// 4. TOP-LEVEL DTOs FOR UI
// ============================================================================

export interface SeoAuthorityOverviewDto {
  providerState: BacklinkProviderState;
  providerMessage?: string | undefined;
  freshness: {
    lastSyncedAt?: string | null;
    lastAuditedAt?: string | null;
    isStale: boolean;
  };
  backlinks: {
    totalBacklinks: number;
    referringDomains: number;
    newLinksLast30Days: number;
    lostLinksLast30Days: number;
    activeOpportunities: number;
  };
  citations: {
    totalStores: number;
    trackedListings: number;
    healthyListings: number;
    mismatchedListings: number;
    openDuplicates: number;
    confirmedMissingDirectories: number;
    pendingChangeSets: number;
  };
  topReferringDomains: ReferringDomainRecord[];
  topCompetitorGaps: CompetitorBacklinkGapCandidate[];
}
