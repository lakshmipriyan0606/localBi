import { prisma } from '@/shared/database/client';
import { logger } from '@/shared/observability/logger';
import { CompetitorCandidate, NormalizedSerpResult } from './seo-types';

const SOCIAL_DOMAINS = new Set([
  'facebook.com',
  'instagram.com',
  'twitter.com',
  'x.com',
  'linkedin.com',
  'youtube.com',
  'pinterest.com',
  'tiktok.com',
  'reddit.com',
  'quora.com',
]);

const GENERIC_DIRECTORIES = new Set([
  'justdial.com',
  'sulekha.com',
  'indiamart.com',
  'tradeindia.com',
  'yelp.com',
  'yellowpages.com',
  'tripadvisor.com',
  'wikipedia.org',
  'amazon.in',
  'amazon.com',
  'flipkart.com',
]);

export class CompetitorSelectionService {
  /**
   * Filters and ranks SERP results to select up to 3 relevant direct business competitors.
   */
  public static selectCompetitors(params: {
    serpResults: NormalizedSerpResult[];
    clientTargetUrl: string;
    keyword: string;
    location?: string | null;
    overrides?: string[] | null;
    maxCompetitors?: number;
  }): {
    autoSelected: CompetitorCandidate[];
    finalSelection: CompetitorCandidate[];
    hasHumanOverride: boolean;
  } {
    const {
      serpResults,
      clientTargetUrl,
      keyword,
      location,
      overrides,
      maxCompetitors = 3,
    } = params;

    let clientHost = '';
    try {
      clientHost = new URL(clientTargetUrl).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      // ignore
    }

    const seenDomains = new Set<string>();
    const candidates: CompetitorCandidate[] = [];

    const kwLower = keyword.toLowerCase();
    const kwTokens = kwLower.split(/\s+/).filter((t) => t.length > 2);
    const locLower = (location || '').toLowerCase();

    for (const res of serpResults) {
      if (!res.url || !res.domain) continue;

      const domain = res.domain.replace(/^www\./, '').toLowerCase();

      // Exclude client own domain
      if (clientHost && (domain === clientHost || domain.endsWith(`.${clientHost}`))) {
        continue;
      }

      // Exclude duplicate domains (take best ranking entry for domain)
      if (seenDomains.has(domain)) {
        continue;
      }
      seenDomains.add(domain);

      // Exclude social networks
      if (SOCIAL_DOMAINS.has(domain) || Array.from(SOCIAL_DOMAINS).some((s) => domain.endsWith(`.${s}`))) {
        continue;
      }

      // Identify if generic directory
      const isDirectory =
        GENERIC_DIRECTORIES.has(domain) ||
        Array.from(GENERIC_DIRECTORIES).some((d) => domain.endsWith(`.${d}`));

      // Relevance Scoring
      let score = Math.max(1, 15 - res.position); // Top positions get higher base score
      const reasons: string[] = [`Ranks #${res.position} in Google Search`];

      const titleLower = res.title.toLowerCase();
      const snippetLower = res.snippet.toLowerCase();

      if (titleLower.includes(kwLower)) {
        score += 5;
        reasons.push('Page title directly targets primary keyword');
      } else if (kwTokens.length > 0 && kwTokens.some((t) => titleLower.includes(t))) {
        score += 2;
        reasons.push('Page title contains related keyword terms');
      }

      if (locLower && (titleLower.includes(locLower) || snippetLower.includes(locLower))) {
        score += 3;
        reasons.push(`Targeted local context found (${location})`);
      }

      if (isDirectory) {
        score -= 8; // De-prioritize directories in favor of direct local businesses
      } else {
        score += 4;
        reasons.push('Direct brand/business website');
      }

      candidates.push({
        domain,
        url: res.url,
        title: res.title,
        snippet: res.snippet,
        position: res.position,
        relevanceScore: score,
        relevanceReasons: reasons,
        isDirectBusinessCompetitor: !isDirectory,
      });
    }

    // Sort by relevance score descending, then by position ascending
    candidates.sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      return a.position - b.position;
    });

    const autoSelected = candidates.slice(0, maxCompetitors);

    // Apply human overrides if provided
    let finalSelection = autoSelected;
    let hasHumanOverride = false;

    if (overrides && overrides.length > 0) {
      hasHumanOverride = true;
      const overrideList: CompetitorCandidate[] = [];

      for (const overrideUrlOrDomain of overrides.slice(0, maxCompetitors)) {
        const clean = overrideUrlOrDomain.trim().toLowerCase();
        // Check if matches an existing candidate
        const matched = candidates.find(
          (c) => c.url.toLowerCase() === clean || c.domain.toLowerCase() === clean
        );

        if (matched) {
          overrideList.push(matched);
        } else {
          // Construct entry for manually specified competitor URL
          let domain = clean;
          let fullUrl = clean;
          try {
            const parsed = new URL(clean.startsWith('http') ? clean : `https://${clean}`);
            domain = parsed.hostname.replace(/^www\./, '');
            fullUrl = parsed.toString();
          } catch {
            // keep clean
          }

          overrideList.push({
            domain,
            url: fullUrl,
            title: `Custom Competitor (${domain})`,
            snippet: 'Manually specified competitor by user override',
            position: 99,
            relevanceScore: 10,
            relevanceReasons: ['User selected / manual override'],
            isDirectBusinessCompetitor: true,
          });
        }
      }

      if (overrideList.length > 0) {
        finalSelection = overrideList;
      }
    }

    return { autoSelected, finalSelection, hasHumanOverride };
  }

  /**
   * Reuses and links canonical Competitor records in database.
   */
  public static async syncCanonicalCompetitors(params: {
    tenantId: string;
    brandId: string;
    storeId?: string | null;
    competitors: CompetitorCandidate[];
  }): Promise<string[]> {
    const { tenantId, storeId, competitors } = params;
    const competitorIds: string[] = [];

    for (const c of competitors) {
      try {
        const record = await prisma.competitor.upsert({
          where: {
            uq_competitor_place_id: {
              tenantId,
              externalPlaceId: `serp_${c.domain}`,
            },
          },
          create: {
            tenantId,
            name: c.domain,
            domain: c.domain,
            source: 'SERP_OBSERVED',
            externalPlaceId: `serp_${c.domain}`,
          },
          update: {
            name: c.domain,
            domain: c.domain,
            updatedAt: new Date(),
          },
        });

        competitorIds.push(record.id);

        if (storeId) {
          await prisma.storeCompetitor.upsert({
            where: {
              uq_store_competitor: {
                tenantId,
                storeId,
                competitorId: record.id,
              },
            },
            create: {
              tenantId,
              storeId,
              competitorId: record.id,
              observedFrequency: 1,
            },
            update: {
              observedFrequency: { increment: 1 },
              lastObservedAt: new Date(),
            },
          });
        }
      } catch (err: any) {
        logger.warn({ domain: c.domain, error: err.message }, 'Failed to sync canonical competitor record');
      }
    }

    return competitorIds;
  }
}
