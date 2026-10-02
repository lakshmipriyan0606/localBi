export const ListingProvider = {
  GOOGLE_BUSINESS_PROFILE: 'GOOGLE_BUSINESS_PROFILE',
  APPLE_BUSINESS_CONNECT: 'APPLE_BUSINESS_CONNECT',
  BING_PLACES: 'BING_PLACES',
  YELP: 'YELP',
  FACEBOOK: 'FACEBOOK',
  FOURSQUARE: 'FOURSQUARE',
  JUSTDIAL: 'JUSTDIAL',
  MANUAL: 'MANUAL',
} as const;

export type ListingProviderType = typeof ListingProvider[keyof typeof ListingProvider];

export const ListingStatus = {
  NOT_CHECKED: 'NOT_CHECKED',
  DISCOVERED: 'DISCOVERED',
  MATCHED: 'MATCHED',
  UNVERIFIED: 'UNVERIFIED',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
  SYNCING: 'SYNCING',
  SYNCED: 'SYNCED',
  STALE: 'STALE',
  ERROR: 'ERROR',
  REMOVED: 'REMOVED',
  DUPLICATE: 'DUPLICATE',
  MANUAL_ACTION_REQUIRED: 'MANUAL_ACTION_REQUIRED',
} as const;

export type ListingStatusType = typeof ListingStatus[keyof typeof ListingStatus];

export const MatchStatus = {
  UNKNOWN: 'UNKNOWN',
  MATCHED: 'MATCHED',
  POSSIBLE_MATCH: 'POSSIBLE_MATCH',
  NO_MATCH: 'NO_MATCH',
  AMBIGUOUS: 'AMBIGUOUS',
} as const;

export type MatchStatusType = typeof MatchStatus[keyof typeof MatchStatus];

export const MatchConfidence = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
} as const;

export type MatchConfidenceType = typeof MatchConfidence[keyof typeof MatchConfidence];

export const NapFieldStatus = {
  MATCH: 'MATCH',
  MISMATCH: 'MISMATCH',
  MISSING: 'MISSING',
  UNKNOWN: 'UNKNOWN',
} as const;

export type NapFieldStatusType = typeof NapFieldStatus[keyof typeof NapFieldStatus];

export const NapOverallStatus = {
  HEALTHY: 'HEALTHY',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
  MISMATCH: 'MISMATCH',
  ERROR: 'ERROR',
  UNKNOWN: 'UNKNOWN',
} as const;

export type NapOverallStatusType = typeof NapOverallStatus[keyof typeof NapOverallStatus];

export const ChangeSetStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  EXECUTING: 'EXECUTING',
  APPLIED: 'APPLIED',
  FAILED: 'FAILED',
  STALE: 'STALE',
  MANUAL_ACTION_REQUIRED: 'MANUAL_ACTION_REQUIRED',
} as const;

export type ChangeSetStatusType = typeof ChangeSetStatus[keyof typeof ChangeSetStatus];

export const DuplicateCandidateStatus = {
  OPEN: 'OPEN',
  CONFIRMED_DUPLICATE: 'CONFIRMED_DUPLICATE',
  DISMISSED: 'DISMISSED',
  RESOLVED: 'RESOLVED',
} as const;

export type DuplicateCandidateStatusType = typeof DuplicateCandidateStatus[keyof typeof DuplicateCandidateStatus];

export interface StoreDayHours {
  dayOfWeek: number; // 0 = Mon, 6 = Sun
  isClosed: boolean;
  openTime?: string | null;  // "HH:MM"
  closeTime?: string | null; // "HH:MM"
}

export interface CanonicalStoreProfile {
  storeId: string;
  brandId: string;
  tenantId: string;
  name: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string | null;
  website?: string | null;
  googlePlaceId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isClosed?: boolean;
  hours: StoreDayHours[];
  canonicalVersionAt: Date;
}

export interface ProviderListingSnapshot {
  name?: string | null;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  hours?: any;
  categories?: string[];
  extra?: Record<string, unknown> | null;
  url?: string | null;
  externalListingId?: string | null;
}

export interface NapFieldDifference {
  field: 'name' | 'phone' | 'address' | 'website' | 'hours';
  canonicalValue: any;
  providerValue: any;
  message: string;
}

export interface NapComparisonResult {
  nameStatus: NapFieldStatusType;
  phoneStatus: NapFieldStatusType;
  addressStatus: NapFieldStatusType;
  websiteStatus: NapFieldStatusType;
  hoursStatus: NapFieldStatusType;
  overallStatus: NapOverallStatusType;
  differences: NapFieldDifference[];
}

export interface ProviderCapabilities {
  provider: ListingProviderType;
  name: string;
  canDiscover: boolean;
  canRead: boolean;
  canWrite: boolean;
  isManualOnly: boolean;
  supportsStoreHours: boolean;
  supportsDuplicatesDetection: boolean;
  portalUrl?: string;
}

export interface MatchEvaluationResult {
  status: MatchStatusType;
  confidence: MatchConfidenceType;
  score: number;
  evidenceSummary: string;
  phoneMatched: boolean;
  addressSimilarity: number;
  nameSimilarity: number;
  distanceMeters?: number | null;
  placeIdMatched: boolean;
}

export interface ProviderWriteResult {
  success: boolean;
  resultStatus: 'SUCCESS' | 'PENDING_PROVIDER_REVIEW' | 'FAILED' | 'MANUAL_ACTION_REQUIRED';
  providerListingId?: string;
  error?: string;
  manualInstructions?: string;
}
