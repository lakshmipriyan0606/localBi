import { z } from 'zod';

export const SeoAnalysisState = {
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  PARTIAL: 'PARTIAL',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

export type SeoAnalysisStateValue = typeof SeoAnalysisState[keyof typeof SeoAnalysisState];

export const SeoAnalysisStage = {
  STAGE_1_GSC: 'COLLECTING_GSC_DATA',
  STAGE_2_SERP: 'FETCHING_SEARCH_RESULTS',
  STAGE_3_COMPETITORS: 'SELECTING_COMPETITORS',
  STAGE_4_CLIENT_PAGE: 'ANALYZING_YOUR_PAGE',
  STAGE_5_COMPETITOR_PAGES: 'ANALYZING_COMPETITOR_PAGES',
  STAGE_6_SIGNAL_COMPARISON: 'COMPARING_SEO_SIGNALS',
  STAGE_7_AI_RECOMMENDATIONS: 'GENERATING_RECOMMENDATIONS',
  STAGE_8_SAVING_OPPORTUNITIES: 'SAVING_OPPORTUNITIES',
  STAGE_9_COMPLETED: 'COMPLETED',
} as const;

export type SeoAnalysisStageValue = typeof SeoAnalysisStage[keyof typeof SeoAnalysisStage];

export const STAGE_DESCRIPTIONS: Record<SeoAnalysisStageValue, string> = {
  [SeoAnalysisStage.STAGE_1_GSC]: '1. Collecting Search Console data',
  [SeoAnalysisStage.STAGE_2_SERP]: '2. Fetching search results',
  [SeoAnalysisStage.STAGE_3_COMPETITORS]: '3. Selecting competitors',
  [SeoAnalysisStage.STAGE_4_CLIENT_PAGE]: '4. Analyzing your page',
  [SeoAnalysisStage.STAGE_5_COMPETITOR_PAGES]: '5. Analyzing competitor pages',
  [SeoAnalysisStage.STAGE_6_SIGNAL_COMPARISON]: '6. Comparing SEO signals',
  [SeoAnalysisStage.STAGE_7_AI_RECOMMENDATIONS]: '7. Generating recommendations',
  [SeoAnalysisStage.STAGE_8_SAVING_OPPORTUNITIES]: '8. Saving opportunities',
  [SeoAnalysisStage.STAGE_9_COMPLETED]: '9. Completed',
};

export const SeoSearchIntent = {
  LOCAL: 'LOCAL',
  COMMERCIAL: 'COMMERCIAL',
  TRANSACTIONAL: 'TRANSACTIONAL',
  INFORMATIONAL: 'INFORMATIONAL',
  NAVIGATIONAL: 'NAVIGATIONAL',
  MIXED: 'MIXED',
} as const;

export type SeoSearchIntentValue = typeof SeoSearchIntent[keyof typeof SeoSearchIntent];

export const SeoKeywordStatus = {
  RANKING: 'RANKING',
  NOT_PRESENT_IN_AVAILABLE_GSC_DATA: 'NOT_PRESENT_IN_AVAILABLE_GSC_DATA',
  IMPROVING: 'IMPROVING',
  DECLINING: 'DECLINING',
  STABLE: 'STABLE',
  HIGH_IMPRESSIONS_LOW_CTR: 'HIGH_IMPRESSIONS_LOW_CTR',
} as const;

export type SeoKeywordStatusValue = typeof SeoKeywordStatus[keyof typeof SeoKeywordStatus];

export const SeoEvidenceNature = {
  FACT: 'FACT',
  INFERRED: 'INFERRED',
} as const;

export type SeoEvidenceNatureValue = typeof SeoEvidenceNature[keyof typeof SeoEvidenceNature];

export const SeoApprovalStatus = {
  GENERATED: 'GENERATED',
  PENDING_REVIEW: 'PENDING_REVIEW',
  APPROVED: 'APPROVED',
  EDITED: 'EDITED',
  REJECTED: 'REJECTED',
  IMPLEMENTATION_PENDING: 'IMPLEMENTATION_PENDING',
  IMPLEMENTED: 'IMPLEMENTED',
  VERIFIED: 'VERIFIED',
  VERIFICATION_FAILED: 'VERIFICATION_FAILED',
} as const;

export type SeoApprovalStatusValue = typeof SeoApprovalStatus[keyof typeof SeoApprovalStatus];

export const SeoConfidence = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
} as const;

export type SeoConfidenceValue = typeof SeoConfidence[keyof typeof SeoConfidence];

export const SeoPriority = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
} as const;

export type SeoPriorityValue = typeof SeoPriority[keyof typeof SeoPriority];

export interface SeoPageSignals {
  url: string;
  finalUrl: string;
  httpStatus: number;
  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  robots: string | null;
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
  };
  mainContentSummary: string;
  wordCount: number;
  internalLinkCount: number;
  externalLinkCount: number;
  imageCount: number;
  missingAltCount: number;
  structuredDataTypes: string[];
  faqSignals: Array<{ question: string; answerSnippet?: string }>;
  serviceTopics: string[];
  locationSignals: string[];
  keywordOccurrences: {
    inTitle: boolean;
    inMetaDescription: boolean;
    inH1: boolean;
    inH2: boolean;
    inBodyCount: number;
  };
  indexability: {
    isIndexable: boolean;
    reason: string;
  };
  language?: string | null;
  capturedAt: Date;
}

export interface NormalizedSerpResult {
  position: number;
  url: string;
  domain: string;
  title: string;
  snippet: string;
  resultType: 'ORGANIC' | 'LOCAL_PACK' | 'FEATURED_SNIPPET' | 'KNOWLEDGE_PANEL';
  provider: string;
  capturedAt: Date;
}

export interface CompetitorCandidate {
  domain: string;
  url: string;
  title: string;
  snippet: string;
  position: number;
  relevanceScore: number;
  relevanceReasons: string[];
  isDirectBusinessCompetitor: boolean;
}

export interface SeoGapItem {
  id: string;
  gapType:
    | 'TITLE_MISSING'
    | 'TITLE_TOPIC_GAP'
    | 'TITLE_LOCATION_GAP'
    | 'META_DESCRIPTION_MISSING'
    | 'H1_MISSING'
    | 'H1_TOPIC_GAP'
    | 'CONTENT_TOPIC_GAP'
    | 'SERVICE_CONTEXT_GAP'
    | 'LOCATION_CONTEXT_GAP'
    | 'FAQ_GAP'
    | 'SCHEMA_OPPORTUNITY'
    | 'INTERNAL_LINKING_GAP'
    | 'CANONICAL_ISSUE'
    | 'INDEXABILITY_ISSUE'
    | 'INTENT_ALIGNMENT_GAP';
  nature: SeoEvidenceNatureValue;
  title: string;
  clientValue: string | null;
  competitorComparison: Array<{
    domain: string;
    value: string | null;
  }>;
  explanation: string;
  severity: SeoPriorityValue;
}

// Zod Schemas for AI Structured Output
export const AiMetaTitleOptionSchema = z.object({
  title: z.string().min(5).max(75),
  reason: z.string().min(5),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  confidenceReason: z.string(),
});

export const AiMetaDescriptionOptionSchema = z.object({
  description: z.string().min(20).max(180),
  reason: z.string().min(5),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  confidenceReason: z.string(),
});

export const AiContentGapRecommendationSchema = z.object({
  topic: z.string().min(3),
  targetSection: z.string(),
  reason: z.string(),
  groundedEvidence: z.string(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
});

export const AiInternalLinkRecommendationSchema = z.object({
  sourcePageHint: z.string(),
  targetPageHint: z.string(),
  suggestedAnchor: z.string(),
  reason: z.string(),
});

export const AiTechnicalRecommendationSchema = z.object({
  issue: z.string(),
  action: z.string(),
  isCritical: z.boolean(),
  reason: z.string(),
});

export const SeoAiAnalysisResponseSchema = z.object({
  summary: z.string().min(10),
  searchIntent: z.object({
    intent: z.enum(['LOCAL', 'COMMERCIAL', 'TRANSACTIONAL', 'INFORMATIONAL', 'NAVIGATIONAL', 'MIXED']),
    confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    reason: z.string(),
  }),
  keywordAnalysis: z.object({
    keyword: z.string(),
    observedStatus: z.string(),
    summary: z.string(),
  }),
  competitorAnalysis: z.object({
    summary: z.string(),
    keyCompetitorDifferences: z.array(z.string()),
  }),
  contentGaps: z.array(AiContentGapRecommendationSchema),
  metaTitleRecommendations: z.array(AiMetaTitleOptionSchema).max(3),
  metaDescriptionRecommendations: z.array(AiMetaDescriptionOptionSchema).max(3),
  internalLinkRecommendations: z.array(AiInternalLinkRecommendationSchema),
  technicalRecommendations: z.array(AiTechnicalRecommendationSchema),
  priorityActions: z.array(z.string()),
});

export type SeoAiAnalysisResponse = z.infer<typeof SeoAiAnalysisResponseSchema>;

export interface GscPageKeywordEvidence {
  available: boolean;
  status: 'AVAILABLE' | 'NO_DATA' | 'UNLINKED' | 'ERROR';
  clicks: number;
  impressions: number;
  ctr: number;
  averagePosition: number;
  landingPage: string;
  comparisonPeriod?: {
    clicks: number;
    impressions: number;
    ctr: number;
    averagePosition: number;
  } | null;
  trend?: 'IMPROVING' | 'DECLINING' | 'STABLE' | null;
  keywordStatus: SeoKeywordStatusValue;
  error?: string | null;
}

export interface SeoAnalysisRunParams {
  tenantId: string;
  brandId: string;
  webSurfaceId: string;
  pageId?: string | null;
  targetUrl: string;
  keyword: string;
  searchLocation: string;
  country: string;
  device: 'DESKTOP' | 'MOBILE';
  searchEngine?: string;
  storeId?: string | null;
  competitorOverrides?: string[] | null;
}

export interface SeoAnalysisRunRecord {
  id: string;
  tenantId: string;
  brandId: string;
  webSurfaceId: string;
  pageId: string | null;
  targetUrl: string;
  keyword: string;
  keywordId: string | null;
  searchLocation: string;
  country: string;
  device: string;
  fingerprint: string;
  status: SeoAnalysisStateValue;
  stage: SeoAnalysisStageValue;
  progressPercent: number;
  gscEvidence: GscPageKeywordEvidence | null;
  serpResults: NormalizedSerpResult[];
  selectedCompetitors: CompetitorCandidate[];
  clientSignals: SeoPageSignals | null;
  competitorSignals: Array<{ competitorUrl: string; domain: string; signals: SeoPageSignals }>;
  gaps: SeoGapItem[];
  aiAnalysis: SeoAiAnalysisResponse | null;
  createdOpportunityIds: string[];
  unavailableParts: string[];
  executionTimesMs: {
    gscMs?: number;
    serpMs?: number;
    clientCrawlMs?: number;
    competitorCrawlMs?: number;
    gapEngineMs?: number;
    aiMs?: number;
    totalMs?: number;
  };
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  errorMessage?: string | null;
}
