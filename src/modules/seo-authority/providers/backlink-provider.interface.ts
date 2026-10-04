import {
  BacklinkProviderState,
  BacklinkRecord,
  ReferringDomainRecord,
  FollowState,
} from '../authority-types';

export interface BacklinkProviderDomainSummary {
  domain: string;
  totalBacklinks: number;
  referringDomains: number;
  authorityMetricName: string;
  authorityMetricValue: number;
  provider: string;
}

export interface ListBacklinksInput {
  domain: string;
  limit?: number;
  cursor?: string;
  followType?: FollowState;
  targetUrl?: string;
}

export interface ListBacklinksOutput {
  items: Omit<BacklinkRecord, 'id' | 'tenantId' | 'brandId' | 'webSurfaceId'>[];
  nextCursor?: string;
  hasMore: boolean;
  totalCount?: number;
}

export interface ListReferringDomainsInput {
  domain: string;
  limit?: number;
  cursor?: string;
  sortBy?: 'rank' | 'backlinks' | 'first_seen';
}

export interface ListReferringDomainsOutput {
  items: {
    domain: string;
    activeLinksCount: number;
    providerAuthorityMetricName?: string;
    providerAuthorityMetric?: number;
    firstSeenAt?: Date;
    lastSeenAt?: Date;
  }[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface CompetitorReferringDomainResult {
  competitorDomain: string;
  referringDomains: string[];
}

export interface BacklinkProvider {
  readonly providerName: string;
  getState(): Promise<BacklinkProviderState>;
  getDomainSummary(domain: string): Promise<BacklinkProviderDomainSummary | null>;
  listBacklinks(input: ListBacklinksInput): Promise<ListBacklinksOutput>;
  listReferringDomains(input: ListReferringDomainsInput): Promise<ListReferringDomainsOutput>;
  getCompetitorReferringDomains(
    competitorDomains: string[],
    clientDomain: string
  ): Promise<CompetitorReferringDomainResult[]>;
}
