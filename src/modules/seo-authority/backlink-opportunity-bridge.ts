import crypto from 'node:crypto';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { logger } from '@/shared/observability/logger';
import { CompetitorBacklinkGapCandidate } from './authority-types';

export class BacklinkOpportunityBridge {
  private static generateIdentityHash(
    tenantId: string,
    brandId: string,
    webSurfaceId: string,
    domain: string
  ): string {
    return crypto
      .createHash('sha256')
      .update(`${tenantId}:${brandId}:${webSurfaceId}:backlink:${domain.toLowerCase().trim()}`)
      .digest('hex');
  }

  /**
   * Bridges a qualified competitor backlink gap candidate to the canonical Opportunity engine.
   * Enforces deduplication and respects dismissed cooldown.
   */
  public static async createOpportunityFromCandidate(
    tenantId: string,
    brandId: string,
    webSurfaceId: string,
    candidate: CompetitorBacklinkGapCandidate
  ): Promise<string | null> {
    const identityHash = this.generateIdentityHash(tenantId, brandId, webSurfaceId, candidate.domain);

    // Check if an existing opportunity exists
    const existing = await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      return tx.opportunity.findFirst({
        where: { tenantId, identityHash },
        include: { evidence: true },
      });
    });

    if (existing) {
      // If already OPEN or IN_REVIEW, simply return id
      if (['OPEN', 'IN_REVIEW', 'ACCEPTED'].includes(existing.status)) {
        return existing.id;
      }

      // If DISMISSED recently (within 30 days cooldown), do not recreate
      if (existing.status === 'DISMISSED' && existing.dismissedAt) {
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        if (Date.now() - existing.dismissedAt.getTime() < thirtyDaysMs) {
          logger.info({ domain: candidate.domain }, 'Backlink opportunity is in dismissed cooldown period');
          return existing.id;
        }
      }
    }

    // Determine ethical outreach action
    let actionType = 'REVIEW_EDITORIAL_OPPORTUNITY';
    let actionTitle = `Editorial Mention Outreach — ${candidate.domain}`;

    if (candidate.relevance.relationshipType === 'INDUSTRY_ASSOCIATION') {
      actionType = 'REVIEW_INDUSTRY_ASSOCIATION';
      actionTitle = `Industry Association Profile — ${candidate.domain}`;
    } else if (candidate.relevance.relationshipType === 'SUPPLIER') {
      actionType = 'REVIEW_SUPPLIER_RELATIONSHIP';
      actionTitle = `Supplier / Partner Directory Listing — ${candidate.domain}`;
    } else if (candidate.relevance.relationshipType === 'LOCAL_ORGANIZATION') {
      actionType = 'REVIEW_LOCAL_ORGANIZATION';
      actionTitle = `Local Chamber / Organization Partnership — ${candidate.domain}`;
    } else if (candidate.relevance.linkContext === 'RESOURCE') {
      actionType = 'REVIEW_RESOURCE_PAGE';
      actionTitle = `Curated Resource Inclusion — ${candidate.domain}`;
    }

    const priority = candidate.relevance.overall === 'HIGH' ? 'HIGH' : 'MEDIUM';
    const priorityScore = candidate.relevance.overall === 'HIGH' ? 85.0 : 65.0;

    const summary = `Competitors (${candidate.competitorDomains.join(', ')}) have established presence on ${candidate.domain}. ${candidate.relevance.explanation} Evaluated as ${candidate.risk.level} risk.`;

    const opp = await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const created = await tx.opportunity.upsert({
        where: {
          uq_opportunity_identity_hash: {
            tenantId,
            identityHash,
          },
        },
        create: {
          tenantId,
          brandId,
          webSurfaceId,
          type: 'BACKLINK_OPPORTUNITY',
          status: 'OPEN',
          priority,
          priorityScore,
          confidence: candidate.relevance.overall === 'HIGH' ? 'HIGH' : 'MEDIUM',
          title: actionTitle,
          summary,
          actionType,
          actionPayload: {
            domain: candidate.domain,
            competitors: candidate.competitorDomains,
            relevance: candidate.relevance,
            risk: candidate.risk,
            sampleUrls: candidate.sampleSourceUrls,
            provenance: candidate.provenance,
          },
          ruleId: 'backlink_competitor_gap_v1',
          ruleVersion: '1.0.0',
          identityHash,
          detectedAt: new Date(),
          lastEvaluatedAt: new Date(),
        },
        update: {
          priority,
          priorityScore,
          summary,
          lastEvaluatedAt: new Date(),
          actionPayload: {
            domain: candidate.domain,
            competitors: candidate.competitorDomains,
            relevance: candidate.relevance,
            risk: candidate.risk,
            sampleUrls: candidate.sampleSourceUrls,
            provenance: candidate.provenance,
          },
        },
      });

      // Attach evidence record
      await tx.opportunityEvidence.create({
        data: {
          tenantId,
          opportunityId: created.id,
          source: 'BACKLINK_PROVIDER',
          metric: 'competitor_overlap',
          value: candidate.competitorCount,
          comparisonValue: 0,
          formattedValue: `${candidate.competitorCount} competitors`,
          entityType: 'DOMAIN',
          entityLabel: candidate.domain,
          details: {
            competitorDomains: candidate.competitorDomains,
            relevance: candidate.relevance,
            risk: candidate.risk,
          },
        },
      });

      return created;
    });

    return opp.id;
  }
}
