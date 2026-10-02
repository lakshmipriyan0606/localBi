/**
 * Phase 10: Keyword Intelligence + SEO Opportunity Engine Types
 * Factual Signals + Explainable Recommendations + Transparent Prioritization
 */

export const OpportunityType = {
  HIGH_IMPRESSIONS_LOW_CTR: 'HIGH_IMPRESSIONS_LOW_CTR',
  HIGH_DEMAND_LOW_RANK: 'HIGH_DEMAND_LOW_RANK',
  HIGH_CONVERSION_LOW_VISIBILITY: 'HIGH_CONVERSION_LOW_VISIBILITY',
  PAGE_WITH_TRAFFIC_NO_CONVERSIONS: 'PAGE_WITH_TRAFFIC_NO_CONVERSIONS',
  MISSING_LANDING_PAGE: 'MISSING_LANDING_PAGE',
  GBP_PROFILE_INCOMPLETE: 'GBP_PROFILE_INCOMPLETE',
  UNANSWERED_REVIEWS: 'UNANSWERED_REVIEWS',
  MERCHANT_PRODUCT_ISSUE: 'MERCHANT_PRODUCT_ISSUE',
  LOCAL_RANK_DECLINE: 'LOCAL_RANK_DECLINE',
  SEARCH_DEMAND_GROWTH: 'SEARCH_DEMAND_GROWTH',
} as const;

export type OpportunityTypeValue = typeof OpportunityType[keyof typeof OpportunityType];

export const OpportunityStatus = {
  OPEN: 'OPEN',
  IN_REVIEW: 'IN_REVIEW',
  ACCEPTED: 'ACCEPTED',
  DISMISSED: 'DISMISSED',
  COMPLETED: 'COMPLETED',
  STALE: 'STALE',
} as const;

export type OpportunityStatusValue = typeof OpportunityStatus[keyof typeof OpportunityStatus];

export const OpportunityPriority = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
} as const;

export type OpportunityPriorityValue = typeof OpportunityPriority[keyof typeof OpportunityPriority];

export const OpportunityConfidence = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
} as const;

export type OpportunityConfidenceValue = typeof OpportunityConfidence[keyof typeof OpportunityConfidence];

export const OpportunityActionType = {
  UPDATE_METADATA: 'UPDATE_METADATA',
  IMPROVE_EXISTING_PAGE: 'IMPROVE_EXISTING_PAGE',
  CREATE_PAGE: 'CREATE_PAGE',
  ADD_PRODUCT_TO_STORE: 'ADD_PRODUCT_TO_STORE',
  FIX_GBP_PROFILE: 'FIX_GBP_PROFILE',
  RESPOND_TO_REVIEWS: 'RESPOND_TO_REVIEWS',
  FIX_MERCHANT_PRODUCT: 'FIX_MERCHANT_PRODUCT',
  INVESTIGATE_RANK_DECLINE: 'INVESTIGATE_RANK_DECLINE',
  IMPROVE_CTA: 'IMPROVE_CTA',
  ADD_KEYWORD_TRACKING: 'ADD_KEYWORD_TRACKING',
} as const;

export type OpportunityActionTypeValue = typeof OpportunityActionType[keyof typeof OpportunityActionType];

export const DismissalReason = {
  NOT_RELEVANT: 'NOT_RELEVANT',
  ALREADY_ADDRESSED: 'ALREADY_ADDRESSED',
  BUSINESS_DECISION: 'BUSINESS_DECISION',
  INCORRECT_MAPPING: 'INCORRECT_MAPPING',
  LOW_PRIORITY: 'LOW_PRIORITY',
  OTHER: 'OTHER',
} as const;

export type DismissalReasonValue = typeof DismissalReason[keyof typeof DismissalReason];

export const SignalSource = {
  GSC: 'GSC',
  GBP: 'GBP',
  LOCAL_RANK: 'LOCAL_RANK',
  GA4: 'GA4',
  LOCALBI: 'LOCALBI',
  MERCHANT: 'MERCHANT',
} as const;

export type SignalSourceValue = typeof SignalSource[keyof typeof SignalSource];

export interface OpportunityEvidenceDto {
  id: string;
  source: SignalSourceValue;
  metric: string;
  value: number;
  comparisonValue?: number | null | undefined;
  formattedValue?: string | null | undefined;
  dateRange?: string | null | undefined;
  entityType?: string | null | undefined;
  entityId?: string | null | undefined;
  entityLabel?: string | null | undefined;
  details?: Record<string, unknown> | null | undefined;
  capturedAt: Date;
}

export interface OpportunityDto {
  id: string;
  tenantId: string;
  brandId: string;
  storeId?: string | null | undefined;
  webSurfaceId?: string | null | undefined;
  pageId?: string | null | undefined;
  productId?: string | null | undefined;
  categoryId?: string | null | undefined;
  keywordId?: string | null | undefined;

  type: OpportunityTypeValue;
  status: OpportunityStatusValue;
  priority: OpportunityPriorityValue;
  priorityScore: number;
  confidence: OpportunityConfidenceValue;

  title: string;
  summary: string;
  actionType: OpportunityActionTypeValue;
  actionPayload?: Record<string, unknown> | null | undefined;

  ruleId: string;
  ruleVersion: string;
  identityHash: string;

  detectedAt: Date;
  lastEvaluatedAt: Date;
  resolvedAt?: Date | null | undefined;
  dismissedAt?: Date | null | undefined;
  dismissalReason?: string | null | undefined;
  dismissedBy?: string | null | undefined;
  acceptedAt?: Date | null | undefined;
  acceptedBy?: string | null | undefined;
  createdAt: Date;
  updatedAt: Date;

  // Joined entity labels for UI display
  brandName?: string | undefined;
  storeName?: string | null | undefined;
  pageSlug?: string | null | undefined;
  productName?: string | null | undefined;
  categoryName?: string | null | undefined;
  keywordTerm?: string | null | undefined;

  evidence?: OpportunityEvidenceDto[] | undefined;
}

export interface OpportunityFilterParams {
  brandId?: string | undefined;
  storeId?: string | undefined;
  status?: OpportunityStatusValue | 'ALL' | undefined;
  priority?: OpportunityPriorityValue | undefined;
  type?: OpportunityTypeValue | undefined;
  actionType?: OpportunityActionTypeValue | undefined;
  search?: string | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
}

export interface OpportunityCandidate {
  brandId: string;
  storeId?: string | null | undefined;
  webSurfaceId?: string | null | undefined;
  pageId?: string | null | undefined;
  productId?: string | null | undefined;
  categoryId?: string | null | undefined;
  keywordId?: string | null | undefined;

  type: OpportunityTypeValue;
  priority: OpportunityPriorityValue;
  priorityScore: number;
  confidence: OpportunityConfidenceValue;

  title: string;
  summary: string;
  actionType: OpportunityActionTypeValue;
  actionPayload?: Record<string, unknown> | undefined;

  ruleId: string;
  ruleVersion: string;
  entityKey: string; // Unique identifier for the affected entity

  evidence: Array<{
    source: SignalSourceValue;
    metric: string;
    value: number;
    comparisonValue?: number | undefined;
    formattedValue?: string | undefined;
    dateRange?: string | undefined;
    entityType?: string | undefined;
    entityId?: string | undefined;
    entityLabel?: string | undefined;
    details?: Record<string, unknown> | undefined;
  }>;
}

export interface OpportunitySummaryStats {
  total: number;
  open: number;
  inReview: number;
  accepted: number;
  dismissed: number;
  completed: number;
  byPriority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  byType: Record<string, number>;
}
