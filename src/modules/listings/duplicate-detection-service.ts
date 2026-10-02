import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { createResourceNotFoundError, AppError } from '@/shared/errors';
import { NapNormalizer } from './nap-normalizer';
import { DuplicateCandidateStatusType, MatchConfidence } from './listing-types';
import { logger } from '@/shared/observability/logger';

export interface DuplicateDetectionResult {
  detectedCount: number;
  candidateIds: string[];
}

export class DuplicateDetectionService {
  /**
   * Scans all directory listings for a store/provider to detect duplicate candidates.
   */
  public static async scanForDuplicates(
    tenantId: string,
    storeId: string
  ): Promise<DuplicateDetectionResult> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // Find all listings for this store
      const storeListings = await tx.directoryListing.findMany({
        where: { tenantId, storeId },
      });

      const candidateIds: string[] = [];

      for (const listingA of storeListings) {
        // Find other listings on the same provider across the entire tenant
        const potentialDuplicates = await tx.directoryListing.findMany({
          where: {
            tenantId,
            provider: listingA.provider,
            id: { not: listingA.id },
          },
        });

        for (const listingB of potentialDuplicates) {
          // Avoid duplicate pairs in reverse order
          if (listingA.id > listingB.id) continue;

          let sharedPhone = false;
          let sharedAddress = false;
          let sharedPlaceId = false;
          const evidence: string[] = [];
          let score = 0;

          // 1. Phone match
          if (listingA.snapshotPhone && listingB.snapshotPhone) {
            if (NapNormalizer.arePhonesEquivalent(listingA.snapshotPhone, listingB.snapshotPhone)) {
              sharedPhone = true;
              score += 0.4;
              evidence.push(`Identical phone number (${listingA.snapshotPhone})`);
            }
          }

          // 2. Address match
          if (listingA.snapshotAddress && listingB.snapshotAddress) {
            const addrSim = NapNormalizer.compareAddresses(listingA.snapshotAddress, listingB.snapshotAddress);
            if (addrSim >= 0.75) {
              sharedAddress = true;
              score += 0.4;
              evidence.push(`High address similarity (${Math.round(addrSim * 100)}%)`);
            }
          }

          // 3. External Place ID / Listing ID match
          if (
            listingA.externalListingId &&
            listingB.externalListingId &&
            listingA.externalListingId === listingB.externalListingId
          ) {
            sharedPlaceId = true;
            score += 0.5;
            evidence.push(`Shared external listing identifier (${listingA.externalListingId})`);
          }

          // 4. Name similarity
          if (listingA.snapshotName && listingB.snapshotName) {
            const nameSim = NapNormalizer.compareNames(listingA.snapshotName, listingB.snapshotName);
            if (nameSim >= 0.7) {
              score += 0.25;
              evidence.push(`High name similarity (${Math.round(nameSim * 100)}%)`);
            }
          }

          // If evidence threshold met (e.g. shared phone + shared address, or shared Place ID)
          if (score >= 0.5 || sharedPlaceId || (sharedPhone && sharedAddress)) {
            let confidence = MatchConfidence.LOW;
            if (score >= 0.75 || sharedPlaceId) {
              confidence = MatchConfidence.HIGH;
            } else if (score >= 0.5) {
              confidence = MatchConfidence.MEDIUM;
            }

            const evidenceSummary = evidence.join('; ');

            // Upsert duplicate candidate record
            const candidate = await tx.duplicateListingCandidate.upsert({
              where: {
                uq_duplicate_pair: {
                  tenantId,
                  listingAId: listingA.id,
                  listingBId: listingB.id,
                },
              },
              create: {
                tenantId,
                storeId,
                provider: listingA.provider,
                listingAId: listingA.id,
                listingBId: listingB.id,
                confidence,
                evidenceSummary,
                sharedPhone,
                sharedAddress,
                sharedPlaceId,
                status: 'OPEN',
              },
              update: {
                confidence,
                evidenceSummary,
                sharedPhone,
                sharedAddress,
                sharedPlaceId,
              },
            });

            candidateIds.push(candidate.id);
            logger.info(
              { tenantId, storeId, listingAId: listingA.id, listingBId: listingB.id, confidence },
              'Duplicate listing candidate flagged'
            );
          }
        }
      }

      return {
        detectedCount: candidateIds.length,
        candidateIds,
      };
    });
  }

  /**
   * Retrieves duplicate candidates with optional filters.
   */
  public static async getDuplicates(
    tenantId: string,
    options?: { storeId?: string; provider?: string; status?: string }
  ) {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      return tx.duplicateListingCandidate.findMany({
        where: {
          tenantId,
          ...(options?.storeId ? { storeId: options.storeId } : {}),
          ...(options?.provider ? { provider: options.provider } : {}),
          ...(options?.status ? { status: options.status } : {}),
        },
        include: {
          listingA: true,
          listingB: true,
          store: {
            select: { id: true, name: true, city: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  }

  /**
   * Resolves a duplicate candidate decision with human audit trail.
   */
  public static async resolveCandidate(
    tenantId: string,
    candidateId: string,
    decision: {
      status: DuplicateCandidateStatusType;
      resolvedBy: string;
      resolutionNote?: string;
    }
  ) {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const candidate = await tx.duplicateListingCandidate.findFirst({
        where: { id: candidateId, tenantId },
      });

      if (!candidate) {
        throw createResourceNotFoundError('DuplicateListingCandidate', candidateId);
      }

      const updated = await tx.duplicateListingCandidate.update({
        where: { id: candidateId },
        data: {
          status: decision.status,
          resolvedAt: new Date(),
          resolvedBy: decision.resolvedBy,
          resolutionNote: decision.resolutionNote ?? null,
        },
      });

      logger.info(
        { tenantId, candidateId, status: decision.status, resolvedBy: decision.resolvedBy },
        'Duplicate listing candidate resolved'
      );

      return updated;
    });
  }
}
