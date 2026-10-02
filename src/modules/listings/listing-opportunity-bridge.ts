import { createHash } from 'crypto';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { NapFieldDifference, ListingProviderType } from './listing-types';
import { logger } from '@/shared/observability/logger';

export class ListingOpportunityBridge {
  /**
   * Generates a deterministic SHA-256 identity hash for an opportunity.
   */
  private static generateIdentityHash(...parts: string[]): string {
    return createHash('sha256').update(parts.join(':')).digest('hex');
  }

  /**
   * Emits or updates a NAP_MISMATCH opportunity when provider snapshot conflicts with canonical NAP.
   */
  public static async emitNapMismatchOpportunity(
    tenantId: string,
    brandId: string,
    storeId: string,
    provider: ListingProviderType,
    differences: NapFieldDifference[]
  ): Promise<string | null> {
    if (!differences || differences.length === 0) {
      return null;
    }

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const identityHash = this.generateIdentityHash(
        tenantId,
        brandId,
        storeId,
        provider,
        'NAP_MISMATCH'
      );

      const fieldList = differences.map(d => d.field.toUpperCase()).join(', ');
      const title = `NAP Consistency Mismatch on ${provider} (${fieldList})`;
      const summary = `Canonical store profile differs from ${provider} live listing for fields: ${fieldList}. Differences: ${differences.map(d => d.message).join('; ')}.`;

      const existing = await tx.opportunity.findFirst({
        where: { tenantId, identityHash },
      });

      if (existing) {
        // Update existing open opportunity
        if (existing.status === 'OPEN' || existing.status === 'IN_REVIEW') {
          await tx.opportunity.update({
            where: { id: existing.id },
            data: {
              title,
              summary,
              lastEvaluatedAt: new Date(),
              actionPayload: { differences: differences as any },
            },
          });
          return existing.id;
        }
        return existing.id;
      }

      // Create new opportunity with evidence
      const opp = await tx.opportunity.create({
        data: {
          tenantId,
          brandId,
          storeId,
          type: 'NAP_MISMATCH',
          status: 'OPEN',
          priority: 'HIGH',
          priorityScore: 85.0,
          confidence: 'HIGH',
          title,
          summary,
          actionType: provider === 'GOOGLE_BUSINESS_PROFILE' ? 'FIX_GBP_PROFILE' : 'UPDATE_METADATA',
          actionPayload: { provider, differences: differences as any },
          ruleId: 'RULE_NAP_MISMATCH',
          ruleVersion: '1.0.0',
          identityHash,
          evidence: {
            create: [
              {
                tenant: { connect: { id: tenantId } },
                source: 'LOCALBI',
                metric: 'nap_mismatch',
                value: differences.length,
                formattedValue: `${differences.length} conflicting fields`,
                entityType: 'LOCATION',
                entityId: storeId,
                entityLabel: provider,
                details: { differences: differences as any },
              },
            ],
          },
        },
      });

      logger.info(
        { tenantId, storeId, provider, opportunityId: opp.id },
        'Emitted NAP_MISMATCH opportunity to SEO Opportunity Engine'
      );

      return opp.id;
    });
  }

  /**
   * Emits a DUPLICATE_LISTING opportunity when duplicate candidates are found.
   */
  public static async emitDuplicateOpportunity(
    tenantId: string,
    brandId: string,
    storeId: string,
    provider: ListingProviderType,
    duplicateCount: number
  ): Promise<string | null> {
    if (duplicateCount <= 0) return null;

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const identityHash = this.generateIdentityHash(
        tenantId,
        brandId,
        storeId,
        provider,
        'DUPLICATE_LISTING'
      );

      const title = `Duplicate Listing Candidate Detected on ${provider}`;
      const summary = `${duplicateCount} duplicate candidate pair(s) flagged for store on ${provider}. Requires manual review and resolution.`;

      const existing = await tx.opportunity.findFirst({
        where: { tenantId, identityHash },
      });

      if (existing) {
        return existing.id;
      }

      const opp = await tx.opportunity.create({
        data: {
          tenantId,
          brandId,
          storeId,
          type: 'DUPLICATE_LISTING',
          status: 'OPEN',
          priority: 'HIGH',
          priorityScore: 80.0,
          confidence: 'HIGH',
          title,
          summary,
          actionType: 'FIX_GBP_PROFILE',
          actionPayload: { provider, duplicateCount },
          ruleId: 'RULE_DUPLICATE_LISTING',
          ruleVersion: '1.0.0',
          identityHash,
          evidence: {
            create: [
              {
                tenant: { connect: { id: tenantId } },
                source: 'LOCALBI',
                metric: 'duplicate_count',
                value: duplicateCount,
                formattedValue: `${duplicateCount} duplicate pairs`,
                entityType: 'LOCATION',
                entityId: storeId,
                entityLabel: provider,
              },
            ],
          },
        },
      });

      logger.info(
        { tenantId, storeId, provider, opportunityId: opp.id },
        'Emitted DUPLICATE_LISTING opportunity'
      );

      return opp.id;
    });
  }
}
