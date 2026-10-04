import { logger } from '@/shared/observability/logger';
import {
  BacklinkProvider,
  BacklinkProviderDomainSummary,
  CompetitorReferringDomainResult,
  ListBacklinksInput,
  ListBacklinksOutput,
  ListReferringDomainsInput,
  ListReferringDomainsOutput,
} from './backlink-provider.interface';
import { BacklinkProviderState, FollowState, BacklinkRecord } from '../authority-types';

export class DataForSeoBacklinkProvider implements BacklinkProvider {
  public readonly providerName = 'DATAFORSEO';

  private apiLogin: string;
  private apiPassword: string;
  private baseUrl = 'https://api.dataforseo.com/v3';

  constructor(login?: string, password?: string) {
    this.apiLogin = login || process.env.DATAFORSEO_API_LOGIN || '';
    this.apiPassword = password || process.env.DATAFORSEO_API_PASSWORD || '';
  }

  public isConfigured(): boolean {
    return Boolean(this.apiLogin && this.apiPassword);
  }

  public async getState(): Promise<BacklinkProviderState> {
    if (!this.isConfigured()) {
      return 'NOT_CONFIGURED';
    }
    return 'CONFIGURED';
  }

  private getAuthHeader(): string {
    return `Basic ${Buffer.from(`${this.apiLogin}:${this.apiPassword}`).toString('base64')}`;
  }

  public async getDomainSummary(domain: string): Promise<BacklinkProviderDomainSummary | null> {
    if (!this.isConfigured()) return null;

    try {
      const response = await fetch(`${this.baseUrl}/backlinks/summary/live`, {
        method: 'POST',
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          {
            target: domain,
            include_subdomains: true,
          },
        ]),
      });

      if (!response.ok) {
        logger.warn({ status: response.status, domain }, 'DataForSEO backlink summary returned error');
        return null;
      }

      const data = await response.json();
      const task = data?.tasks?.[0];
      const result = task?.result?.[0];

      if (!result) return null;

      return {
        domain,
        totalBacklinks: result.backlinks ?? 0,
        referringDomains: result.referring_domains ?? 0,
        authorityMetricName: 'Domain Rank',
        authorityMetricValue: result.rank ?? 0,
        provider: this.providerName,
      };
    } catch (err: any) {
      logger.error({ error: err.message, domain }, 'Failed to fetch domain backlink summary from DataForSEO');
      return null;
    }
  }

  public async listBacklinks(input: ListBacklinksInput): Promise<ListBacklinksOutput> {
    if (!this.isConfigured()) {
      return { items: [], hasMore: false };
    }

    try {
      const limit = Math.min(input.limit || 50, 100);
      const postData: any = {
        target: input.domain,
        limit,
        include_subdomains: true,
        order_by: ['rank,desc'],
      };

      if (input.cursor) {
        postData.offset = parseInt(input.cursor, 10) || 0;
      }

      if (input.followType && input.followType !== 'UNKNOWN') {
        postData.dofollow = input.followType === 'FOLLOW';
      }

      const response = await fetch(`${this.baseUrl}/backlinks/backlinks/live`, {
        method: 'POST',
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([postData]),
      });

      if (!response.ok) {
        logger.warn({ status: response.status }, 'DataForSEO backlink list returned HTTP error');
        return { items: [], hasMore: false };
      }

      const data = await response.json();
      const task = data?.tasks?.[0];
      const items = task?.result?.[0]?.items || [];
      const totalCount = task?.result?.[0]?.total_count || 0;

      const normalized: Omit<BacklinkRecord, 'id' | 'tenantId' | 'brandId' | 'webSurfaceId'>[] = items.map(
        (item: any) => {
          let followState: FollowState = 'UNKNOWN';
          if (item.is_dofollow === true) followState = 'FOLLOW';
          else if (item.is_dofollow === false) followState = 'NOFOLLOW';
          if (item.is_ugc) followState = 'UGC';
          if (item.is_sponsored) followState = 'SPONSORED';

          return {
            provider: this.providerName,
            externalId: String(item.url_from_hash || item.url_from || ''),
            referringDomain: item.domain_from || '',
            linkingUrl: item.url_from || '',
            targetUrl: item.url_to || '',
            anchorText: item.anchor || null,
            followState,
            firstSeenAt: item.first_seen ? new Date(item.first_seen) : null,
            lastSeenAt: item.last_seen ? new Date(item.last_seen) : null,
            status: item.is_lost ? 'LOST' : 'ACTIVE',
            providerAuthorityMetric: item.rank ?? null,
            providerAuthorityMetricName: 'Domain Rank',
            discoveredAt: new Date(),
            updatedAt: new Date(),
          };
        }
      );

      const currentOffset = postData.offset || 0;
      const nextOffset = currentOffset + normalized.length;
      const hasMore = nextOffset < totalCount;

      return {
        items: normalized,
        nextCursor: hasMore ? String(nextOffset) : undefined,
        hasMore,
        totalCount,
      };
    } catch (err: any) {
      logger.error({ error: err.message }, 'DataForSEO listBacklinks error');
      return { items: [], hasMore: false };
    }
  }

  public async listReferringDomains(input: ListReferringDomainsInput): Promise<ListReferringDomainsOutput> {
    if (!this.isConfigured()) {
      return { items: [], hasMore: false };
    }

    try {
      const limit = Math.min(input.limit || 50, 100);
      const postData: any = {
        target: input.domain,
        limit,
        include_subdomains: true,
        order_by: ['rank,desc'],
      };

      if (input.cursor) {
        postData.offset = parseInt(input.cursor, 10) || 0;
      }

      const response = await fetch(`${this.baseUrl}/backlinks/referring_domains/live`, {
        method: 'POST',
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([postData]),
      });

      if (!response.ok) {
        return { items: [], hasMore: false };
      }

      const data = await response.json();
      const task = data?.tasks?.[0];
      const items = task?.result?.[0]?.items || [];
      const totalCount = task?.result?.[0]?.total_count || 0;

      const normalized = items.map((item: any) => ({
        domain: item.domain || '',
        activeLinksCount: item.backlinks || 1,
        providerAuthorityMetricName: 'Domain Rank',
        providerAuthorityMetric: item.rank ?? null,
        firstSeenAt: item.first_seen ? new Date(item.first_seen) : undefined,
        lastSeenAt: item.last_seen ? new Date(item.last_seen) : undefined,
      }));

      const currentOffset = postData.offset || 0;
      const nextOffset = currentOffset + normalized.length;
      const hasMore = nextOffset < totalCount;

      return {
        items: normalized,
        nextCursor: hasMore ? String(nextOffset) : undefined,
        hasMore,
      };
    } catch (err: any) {
      logger.error({ error: err.message }, 'DataForSEO listReferringDomains error');
      return { items: [], hasMore: false };
    }
  }

  public async getCompetitorReferringDomains(
    competitorDomains: string[],
    _clientDomain: string
  ): Promise<CompetitorReferringDomainResult[]> {
    if (!this.isConfigured() || competitorDomains.length === 0) {
      return [];
    }

    const results: CompetitorReferringDomainResult[] = [];
    for (const compDomain of competitorDomains.slice(0, 5)) {
      try {
        const refDomains = await this.listReferringDomains({
          domain: compDomain,
          limit: 30,
        });
        results.push({
          competitorDomain: compDomain,
          referringDomains: refDomains.items.map((i) => i.domain),
        });
      } catch (err) {
        logger.warn({ compDomain }, 'Failed fetching competitor referring domains');
      }
    }

    return results;
  }
}
