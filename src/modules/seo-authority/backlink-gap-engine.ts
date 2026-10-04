import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { logger } from '@/shared/observability/logger';
import { BacklinkProviderRegistry } from './providers/backlink-provider-registry';
import { BacklinkRepository } from './backlink-repository';
import { BacklinkRelevanceEngine } from './backlink-relevance-engine';
import { CompetitorBacklinkGapCandidate } from './authority-types';

export class BacklinkGapEngine {
  /**
   * Identifies competitor referring domains that do not currently link to the client.
   * Evaluates relevance and risk deterministically.
   */
  public static async findCompetitorGaps(
    tenantId: string,
    brandId: string,
    webSurfaceId: string
  ): Promise<CompetitorBacklinkGapCandidate[]> {
    const provider = BacklinkProviderRegistry.getProvider();
    const providerState = await provider.getState();

    if (providerState === 'NOT_CONFIGURED') {
      return [];
    }

    // 1. Get client surface domain
    const surface = await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      return tx.webSurface.findFirst({
        where: { id: webSurfaceId, tenantId },
        include: { domains: true },
      });
    });
    if (!surface) return [];

    const rawClientDomain =
      surface.domains.find((d) => d.isPrimary)?.hostname ||
      surface.domains[0]?.hostname ||
      surface.name ||
      '';
    const clientDomain = BacklinkRepository.canonicalizeUrl(rawClientDomain).split('/')[0]!;

    // 2. Get client's existing referring domains
    const clientRefDomains = await prisma.$queryRawUnsafe<any[]>(
      `SELECT domain FROM referring_domains WHERE tenant_id = $1 AND brand_id = $2 AND web_surface_id = $3`,
      tenantId,
      brandId,
      webSurfaceId
    );
    const clientDomainSet = new Set(clientRefDomains.map((r) => r.domain.toLowerCase()));
    if (clientDomain) clientDomainSet.add(clientDomain.toLowerCase());

    // 3. Get canonical competitors
    const competitors = await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      return tx.competitor.findMany({
        where: { tenantId },
        select: { id: true, name: true, domain: true, category: true },
        take: 5,
      });
    });

    const competitorDomains = competitors
      .map((c) => c.domain ? BacklinkRepository.canonicalizeUrl(c.domain).split('/')[0]! : '')
      .filter((d) => Boolean(d) && d !== clientDomain);

    if (competitorDomains.length === 0) {
      return [];
    }

    // 4. Query provider for competitor referring domains
    const competitorResults = await provider.getCompetitorReferringDomains(
      competitorDomains,
      clientDomain
    );

    // 5. Aggregate domain overlap across competitors
    const candidateMap = new Map<string, { competitorDomains: string[] }>();
    for (const compResult of competitorResults) {
      for (const refDomain of compResult.referringDomains) {
        const cleanRef = refDomain.toLowerCase().trim();
        if (clientDomainSet.has(cleanRef)) continue; // Already linked to client!

        if (!candidateMap.has(cleanRef)) {
          candidateMap.set(cleanRef, { competitorDomains: [] });
        }
        candidateMap.get(cleanRef)!.competitorDomains.push(compResult.competitorDomain);
      }
    }

    // 6. Get tenant/brand metadata for relevance
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { industry: true },
    });

    const brand = await prisma.brand.findFirst({
      where: { id: brandId, tenantId },
      select: { name: true },
    });

    // 7. Evaluate each candidate
    const candidates: CompetitorBacklinkGapCandidate[] = [];
    for (const [candidateDomain, data] of candidateMap.entries()) {
      const relevance = BacklinkRelevanceEngine.evaluateRelevance({
        domain: candidateDomain,
        clientIndustry: tenant?.industry || undefined,
        competitorCount: data.competitorDomains.length,
      });

      const risk = BacklinkRelevanceEngine.evaluateRisk(candidateDomain);

      candidates.push({
        domain: candidateDomain,
        clientHasBacklink: false,
        competitorCount: data.competitorDomains.length,
        competitorDomains: data.competitorDomains,
        relevance,
        risk,
        provenance: 'RULE_BASED',
        providerMetric: null,
        sampleSourceUrls: [],
      });
    }

    // Sort by relevance (HIGH first) then competitor overlap count
    const scoreMap = { HIGH: 3, MEDIUM: 2, LOW: 1, UNKNOWN: 0 };
    return candidates.sort((a, b) => {
      const scoreDiff = scoreMap[b.relevance.overall] - scoreMap[a.relevance.overall];
      if (scoreDiff !== 0) return scoreDiff;
      return b.competitorCount - a.competitorCount;
    });
  }
}
