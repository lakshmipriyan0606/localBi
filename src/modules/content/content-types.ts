/**
 * Phase 11: Content & Growth Engine Types
 * Blog CMS + SEO Content + Editorial Workflow + Internal Linking + AI-Assisted Drafting
 */

export const ContentType = {
  ARTICLE: 'ARTICLE',
  BLOG: 'BLOG',
  GUIDE: 'GUIDE',
  FAQ_CONTENT: 'FAQ_CONTENT',
  CUSTOM: 'CUSTOM',
} as const;

export type ContentTypeValue = typeof ContentType[keyof typeof ContentType];

export const ContentStatus = {
  DRAFT: 'DRAFT',
  IN_REVIEW: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
  REJECTED: 'REJECTED',
} as const;

export type ContentStatusValue = typeof ContentStatus[keyof typeof ContentStatus];

export const ContentOrigin = {
  HUMAN: 'HUMAN',
  AI_ASSISTED: 'AI_ASSISTED',
  AI_GENERATED_DRAFT: 'AI_GENERATED_DRAFT',
} as const;

export type ContentOriginValue = typeof ContentOrigin[keyof typeof ContentOrigin];

export const ContentRelationTargetType = {
  PRODUCT: 'PRODUCT',
  STORE: 'STORE',
  CATEGORY: 'CATEGORY',
  KEYWORD: 'KEYWORD',
  CONTENT: 'CONTENT',
} as const;

export type ContentRelationTargetTypeValue = typeof ContentRelationTargetType[keyof typeof ContentRelationTargetType];

export const ContentBriefStatus = {
  DRAFT: 'DRAFT',
  READY: 'READY',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  DISCARDED: 'DISCARDED',
} as const;

export type ContentBriefStatusValue = typeof ContentBriefStatus[keyof typeof ContentBriefStatus];

export interface StructuredContentBlock {
  id: string;
  type: 'paragraph' | 'heading' | 'image' | 'callout' | 'product_card' | 'store_card' | 'faq_accordion' | 'list' | 'quote' | 'code' | 'raw_html';
  content?: string | undefined;
  level?: 1 | 2 | 3 | 4 | 5 | 6 | undefined;
  items?: string[] | undefined;
  url?: string | undefined;
  alt?: string | undefined;
  caption?: string | undefined;
  productId?: string | undefined;
  locationId?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface ContentAuthorRecord {
  id: string;
  tenantId: string;
  brandId: string;
  name: string;
  slug: string;
  bio?: string | null | undefined;
  role?: string | null | undefined;
  avatarUrl?: string | null | undefined;
  socialLinks?: Record<string, string> | null | undefined;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentCategoryRecord {
  id: string;
  tenantId: string;
  brandId: string;
  name: string;
  slug: string;
  description?: string | null | undefined;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentBriefRecord {
  id: string;
  tenantId: string;
  brandId: string;
  keywordId?: string | null | undefined;
  opportunityId?: string | null | undefined;
  workingTitle: string;
  primaryTopic: string;
  primaryKeyword?: string | null | undefined;
  secondaryKeywords?: string[] | null | undefined;
  intent: string;
  targetAudience?: string | null | undefined;
  relatedProductIds?: string[] | null | undefined;
  relatedStoreIds?: string[] | null | undefined;
  relatedCategoryIds?: string[] | null | undefined;
  requiredTopics?: string[] | null | undefined;
  notes?: string | null | undefined;
  status: ContentBriefStatusValue;
  createdBy?: string | null | undefined;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentVersionRecord {
  id: string;
  tenantId: string;
  contentItemId: string;
  version: number;
  title: string;
  slug: string;
  excerpt?: string | null | undefined;
  content: {
    markdown?: string | undefined;
    blocks?: StructuredContentBlock[] | undefined;
    [key: string]: unknown;
  };
  seoTitle?: string | null | undefined;
  seoDescription?: string | null | undefined;
  canonicalUrl?: string | null | undefined;
  ogImageUrl?: string | null | undefined;
  status: string;
  origin: string;
  aiAudit?: Record<string, unknown> | null | undefined;
  changeSummary?: string | null | undefined;
  createdBy?: string | null | undefined;
  publishedAt?: Date | null | undefined;
  createdAt: Date;
}

export interface ContentRelationRecord {
  id: string;
  tenantId: string;
  contentItemId: string;
  targetType: ContentRelationTargetTypeValue;
  targetId: string;
  sortOrder: number;
  notes?: string | null | undefined;
  createdAt: Date;
}

export interface RedirectRecord {
  id: string;
  tenantId: string;
  webSurfaceId?: string | null | undefined;
  fromPath: string;
  toPath: string;
  statusCode: number;
  reason?: string | null | undefined;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentItemRecord {
  id: string;
  tenantId: string;
  brandId: string;
  webSurfaceId?: string | null | undefined;
  briefId?: string | null | undefined;
  authorId?: string | null | undefined;
  categoryId?: string | null | undefined;
  type: ContentTypeValue;
  title: string;
  slug: string;
  excerpt?: string | null | undefined;
  status: ContentStatusValue;
  featuredImageUrl?: string | null | undefined;
  featuredImageAlt?: string | null | undefined;
  currentVersionNumber: number;
  publishedVersionId?: string | null | undefined;
  publishedAt?: Date | null | undefined;
  scheduledAt?: Date | null | undefined;
  createdAt: Date;
  updatedAt: Date;

  // Populated relations
  currentVersion?: ContentVersionRecord | null | undefined;
  publishedVersion?: ContentVersionRecord | null | undefined;
  author?: ContentAuthorRecord | null | undefined;
  category?: ContentCategoryRecord | null | undefined;
  brief?: ContentBriefRecord | null | undefined;
  versions?: ContentVersionRecord[] | undefined;
  relations?: ContentRelationRecord[] | undefined;
}

export interface CreateContentItemInput {
  tenantId: string;
  brandId: string;
  webSurfaceId?: string | null | undefined;
  briefId?: string | null | undefined;
  authorId?: string | null | undefined;
  categoryId?: string | null | undefined;
  type?: ContentTypeValue | undefined;
  title: string;
  slug: string;
  excerpt?: string | null | undefined;
  contentMarkdown?: string | null | undefined;
  contentBlocks?: StructuredContentBlock[] | null | undefined;
  seoTitle?: string | null | undefined;
  seoDescription?: string | null | undefined;
  canonicalUrl?: string | null | undefined;
  ogImageUrl?: string | null | undefined;
  featuredImageUrl?: string | null | undefined;
  featuredImageAlt?: string | null | undefined;
  origin?: ContentOriginValue | undefined;
  userId: string;
  changeSummary?: string | null | undefined;
  scheduledAt?: Date | null | undefined;
  aiAudit?: Record<string, unknown> | null | undefined;
}

export interface UpdateContentItemInput {
  title?: string | undefined;
  slug?: string | undefined;
  excerpt?: string | null | undefined;
  contentMarkdown?: string | null | undefined;
  contentBlocks?: StructuredContentBlock[] | null | undefined;
  seoTitle?: string | null | undefined;
  seoDescription?: string | null | undefined;
  canonicalUrl?: string | null | undefined;
  ogImageUrl?: string | null | undefined;
  featuredImageUrl?: string | null | undefined;
  featuredImageAlt?: string | null | undefined;
  authorId?: string | null | undefined;
  categoryId?: string | null | undefined;
  webSurfaceId?: string | null | undefined;
  briefId?: string | null | undefined;
  type?: ContentTypeValue | undefined;
  scheduledAt?: Date | null | undefined;
  changeSummary?: string | null | undefined;
  origin?: ContentOriginValue | undefined;
  userId: string;
  expectedVersionNumber?: number | undefined;
  aiAudit?: Record<string, unknown> | null | undefined;
}

export interface WorkflowTransitionInput {
  tenantId: string;
  contentId: string;
  newStatus: ContentStatusValue;
  userId: string;
  rejectionReason?: string | undefined;
}

export interface ContentFilterParams {
  tenantId: string;
  brandId?: string | undefined;
  webSurfaceId?: string | undefined;
  type?: ContentTypeValue | undefined;
  status?: ContentStatusValue | undefined;
  categoryId?: string | undefined;
  authorId?: string | undefined;
  search?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export interface DetectedMention {
  entityType: 'PRODUCT' | 'STORE' | 'CATEGORY' | 'ARTICLE';
  entityId: string;
  entityName: string;
  matchedText: string;
  targetUrl: string;
  occurrenceIndex: number;
}

export interface InternalLinkSuggestion {
  sourceContentId: string;
  sourceTitle: string;
  targetUrl: string;
  anchorText: string;
  targetEntityType: 'PRODUCT' | 'STORE' | 'CATEGORY' | 'ARTICLE';
  targetEntityId: string;
  contextSnippet: string;
  relevanceScore: number;
}

export interface BrokenLinkReportItem {
  contentItemId: string;
  contentTitle: string;
  contentSlug: string;
  brokenUrl: string;
  reason: 'NOT_FOUND' | 'CIRCULAR_REDIRECT' | 'MALFORMED_URL';
}

export interface OrphanContentReportItem {
  contentItemId: string;
  title: string;
  slug: string;
  publishedAt?: Date | null | undefined;
  inboundLinkCount: number;
}

export interface GroundedFactContext {
  brandName: string;
  brandIndustry?: string | undefined;
  brandDescription?: string | undefined;
  locations: Array<{
    id: string;
    name: string;
    city: string;
    state?: string | undefined;
    address: string;
    phone?: string | undefined;
  }>;
  products: Array<{
    id: string;
    name: string;
    category?: string | undefined;
    description?: string | undefined;
    priceFormatted?: string | undefined;
  }>;
  opportunityEvidence?: {
    primaryKeyword: string;
    secondaryKeywords: string[];
    searchVolume?: number | undefined;
    opportunityType?: string | undefined;
    intent?: string | undefined;
  } | undefined;
}

export interface AiDraftRequest {
  tenantId: string;
  brandId: string;
  briefId?: string | undefined;
  opportunityId?: string | undefined;
  primaryKeyword: string;
  targetAudience?: string | undefined;
  suggestedTitle?: string | undefined;
  contentType?: ContentTypeValue | undefined;
  userId: string;
  customInstructions?: string | undefined;
}

export interface AiDraftResult {
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  contentMarkdown: string;
  contentBlocks: StructuredContentBlock[];
  keyTakeaways: string[];
  readingTimeMinutes: number;
  wordCount: number;
  promptVersion: string;
  modelIdentifier: string;
  auditMetadata: {
    generatedAt: string;
    verifiedFactsUsed: string[];
    groundedEntities: {
      locationCount: number;
      productCount: number;
    };
  };
}
