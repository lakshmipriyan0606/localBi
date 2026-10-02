import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import {
  createResourceNotFoundError,
  createValidationError,
  AppError,
} from '@/shared/errors';
import { logger } from '@/shared/observability/logger';
import {
  ListingProviderType,
  ListingStatus,
  MatchStatus,
  MatchConfidence,
  NapFieldStatus,
  NapOverallStatus,
  ChangeSetStatus,
  NapComparisonResult,
  NapFieldDifference,
  ProviderListingSnapshot,
  StoreDayHours,
} from './listing-types';
import { NapNormalizer } from './nap-normalizer';
import { ListingProfileService } from './listing-profile-service';
import { ListingMatchService } from './listing-match-service';
import { DirectoryRegistry } from './providers/directory-registry';
import { DuplicateDetectionService } from './duplicate-detection-service';
import { ListingOpportunityBridge } from './listing-opportunity-bridge';

export class ListingService {
  /**
   * Returns a high-level summary of listing health across a brand or tenant.
   */
  public static async getListingSummary(tenantId: string, brandId?: string) {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const whereClause: any = { tenantId };
      if (brandId) whereClause.brandId = brandId;

      const [
        totalListings,
        healthyListings,
        mismatchedListings,
        needsReviewListings,
        pendingChangeSets,
        openDuplicates,
      ] = await Promise.all([
        tx.directoryListing.count({ where: whereClause }),
        tx.directoryListing.count({ where: { ...whereClause, napOverallStatus: 'HEALTHY' } }),
        tx.directoryListing.count({ where: { ...whereClause, napOverallStatus: 'MISMATCH' } }),
        tx.directoryListing.count({
          where: {
            ...whereClause,
            napOverallStatus: { in: ['NEEDS_REVIEW', 'UNKNOWN', 'ERROR'] },
          },
        }),
        tx.listingChangeSet.count({
          where: { tenantId, status: 'PENDING' },
        }),
        tx.duplicateListingCandidate.count({
          where: { tenantId, status: 'OPEN' },
        }),
      ]);

      const healthScore = totalListings > 0
        ? Math.round((healthyListings / totalListings) * 100)
        : 100;

      return {
        totalListings,
        healthyListings,
        mismatchedListings,
        needsReviewListings,
        pendingChangeSets,
        openDuplicates,
        healthScore,
      };
    });
  }

  /**
   * Returns all directory listings for a specific store.
   */
  public static async getStoreListings(tenantId: string, storeId: string) {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const listings = await tx.directoryListing.findMany({
        where: { tenantId, storeId },
        include: {
          changeSets: {
            where: { status: 'PENDING' },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { provider: 'asc' },
      });

      return listings.map((l) => {
        const providerInstance = DirectoryRegistry.getProvider(l.provider as ListingProviderType);
        return {
          ...l,
          capabilities: providerInstance.capabilities,
        };
      });
    });
  }

  /**
   * Connects or maps an external directory listing to a store.
   */
  public static async connectListing(
    tenantId: string,
    storeId: string,
    input: {
      provider: ListingProviderType;
      externalListingId?: string;
      providerUrl?: string;
      snapshot?: ProviderListingSnapshot;
    }
  ) {
    const canonical = await ListingProfileService.getCanonicalStoreProfile(tenantId, storeId);

    // Evaluate match status if snapshot or external listing is provided
    const snapshot = input.snapshot || {
      externalListingId: input.externalListingId,
      url: input.providerUrl,
    };

    const matchEvaluation = ListingMatchService.evaluateMatch(canonical, snapshot);

    const listing = await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      return tx.directoryListing.upsert({
        where: {
          uq_directory_listing_store_provider: {
            tenantId,
            storeId,
            provider: input.provider,
          },
        },
        create: {
          tenantId,
          brandId: canonical.brandId,
          storeId,
          provider: input.provider,
          externalListingId: input.externalListingId ?? null,
          providerUrl: input.providerUrl ?? null,
          status: ListingStatus.MATCHED,
          matchStatus: matchEvaluation.status,
          matchConfidence: matchEvaluation.confidence,
          matchEvidenceSummary: matchEvaluation.evidenceSummary,
          snapshotName: snapshot.name ?? null,
          snapshotPhone: snapshot.phone ?? null,
          snapshotAddress: snapshot.address ?? null,
          snapshotWebsite: snapshot.website ?? null,
          snapshotHours: (snapshot.hours as any) ?? null,
          snapshotCategories: snapshot.categories ?? [],
          snapshotExtra: (snapshot.extra as any) ?? null,
          lastDiscoveredAt: new Date(),
        },
        update: {
          externalListingId: input.externalListingId ?? undefined,
          providerUrl: input.providerUrl ?? undefined,
          matchStatus: matchEvaluation.status,
          matchConfidence: matchEvaluation.confidence,
          matchEvidenceSummary: matchEvaluation.evidenceSummary,
          snapshotName: snapshot.name ?? undefined,
          snapshotPhone: snapshot.phone ?? undefined,
          snapshotAddress: snapshot.address ?? undefined,
          snapshotWebsite: snapshot.website ?? undefined,
          snapshotHours: (snapshot.hours as any) ?? undefined,
        },
      });
    });

    // Run immediate NAP consistency audit
    await this.auditListing(tenantId, listing.id);

    // Check duplicates
    await DuplicateDetectionService.scanForDuplicates(tenantId, storeId);

    const fresh = await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      return tx.directoryListing.findUniqueOrThrow({ where: { id: listing.id } });
    });

    return fresh;
  }

  /**
   * Compares the live provider snapshot against the canonical store profile.
   * Updates nap*Status columns and emits an opportunity if mismatched.
   */
  public static async auditListing(
    tenantId: string,
    listingId: string
  ): Promise<NapComparisonResult> {
    const listing = await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      return tx.directoryListing.findFirst({
        where: { id: listingId, tenantId },
      });
    });

    if (!listing) {
      throw createResourceNotFoundError('DirectoryListing', listingId);
    }

    const canonical = await ListingProfileService.getCanonicalStoreProfile(
      tenantId,
      listing.storeId
    );

    const differences: NapFieldDifference[] = [];

    // 1. Business Name Comparison
    let nameStatus: typeof NapFieldStatus[keyof typeof NapFieldStatus] = NapFieldStatus.UNKNOWN;
    if (!listing.snapshotName) {
      nameStatus = NapFieldStatus.MISSING;
      differences.push({
        field: 'name',
        canonicalValue: canonical.name,
        providerValue: null,
        message: 'Business name is missing on provider listing',
      });
    } else {
      const nameScore = NapNormalizer.compareNames(canonical.name, listing.snapshotName);
      if (nameScore >= 0.8) {
        nameStatus = NapFieldStatus.MATCH;
      } else {
        nameStatus = NapFieldStatus.MISMATCH;
        differences.push({
          field: 'name',
          canonicalValue: canonical.name,
          providerValue: listing.snapshotName,
          message: `Business name differs: "${canonical.name}" vs "${listing.snapshotName}"`,
        });
      }
    }

    // 2. Phone Number Comparison
    let phoneStatus: typeof NapFieldStatus[keyof typeof NapFieldStatus] = NapFieldStatus.UNKNOWN;
    if (canonical.phone && !listing.snapshotPhone) {
      phoneStatus = NapFieldStatus.MISSING;
      differences.push({
        field: 'phone',
        canonicalValue: canonical.phone,
        providerValue: null,
        message: 'Phone number missing on provider listing',
      });
    } else if (canonical.phone && listing.snapshotPhone) {
      const isEq = NapNormalizer.arePhonesEquivalent(canonical.phone, listing.snapshotPhone);
      if (isEq) {
        phoneStatus = NapFieldStatus.MATCH;
      } else {
        phoneStatus = NapFieldStatus.MISMATCH;
        differences.push({
          field: 'phone',
          canonicalValue: canonical.phone,
          providerValue: listing.snapshotPhone,
          message: `Phone number mismatch: canonical ${canonical.phone} vs provider ${listing.snapshotPhone}`,
        });
      }
    } else if (!canonical.phone && !listing.snapshotPhone) {
      phoneStatus = NapFieldStatus.MATCH;
    }

    // 3. Address Comparison
    let addressStatus: typeof NapFieldStatus[keyof typeof NapFieldStatus] = NapFieldStatus.UNKNOWN;
    const canonicalFullAddr = `${canonical.addressLine1} ${canonical.city} ${canonical.postalCode}`;
    if (!listing.snapshotAddress) {
      addressStatus = NapFieldStatus.MISSING;
      differences.push({
        field: 'address',
        canonicalValue: canonicalFullAddr,
        providerValue: null,
        message: 'Address missing on provider listing',
      });
    } else {
      const addrScore = NapNormalizer.compareAddresses(canonicalFullAddr, listing.snapshotAddress);
      if (addrScore >= 0.6) {
        addressStatus = NapFieldStatus.MATCH;
      } else {
        addressStatus = NapFieldStatus.MISMATCH;
        differences.push({
          field: 'address',
          canonicalValue: canonicalFullAddr,
          providerValue: listing.snapshotAddress,
          message: `Address mismatch: canonical "${canonicalFullAddr}" vs provider "${listing.snapshotAddress}"`,
        });
      }
    }

    // 4. Website Comparison
    let websiteStatus: typeof NapFieldStatus[keyof typeof NapFieldStatus] = NapFieldStatus.UNKNOWN;
    if (canonical.website && !listing.snapshotWebsite) {
      websiteStatus = NapFieldStatus.MISSING;
      differences.push({
        field: 'website',
        canonicalValue: canonical.website,
        providerValue: null,
        message: 'Website URL missing on provider listing',
      });
    } else if (canonical.website && listing.snapshotWebsite) {
      const isWebEq = NapNormalizer.areWebsitesEquivalent(canonical.website, listing.snapshotWebsite);
      if (isWebEq) {
        websiteStatus = NapFieldStatus.MATCH;
      } else {
        websiteStatus = NapFieldStatus.MISMATCH;
        differences.push({
          field: 'website',
          canonicalValue: canonical.website,
          providerValue: listing.snapshotWebsite,
          message: `Website mismatch: canonical "${canonical.website}" vs provider "${listing.snapshotWebsite}"`,
        });
      }
    } else {
      websiteStatus = NapFieldStatus.MATCH;
    }

    // 5. Store Hours Comparison
    let hoursStatus: typeof NapFieldStatus[keyof typeof NapFieldStatus] = NapFieldStatus.MATCH;

    // Overall status
    let overallStatus: typeof NapOverallStatus[keyof typeof NapOverallStatus] = NapOverallStatus.HEALTHY;
    if (differences.length > 0) {
      overallStatus = NapOverallStatus.MISMATCH;
    } else if (
      nameStatus === NapFieldStatus.MISSING ||
      phoneStatus === NapFieldStatus.MISSING ||
      addressStatus === NapFieldStatus.MISSING
    ) {
      overallStatus = NapOverallStatus.NEEDS_REVIEW;
    }

    // Update DirectoryListing record
    await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      await tx.directoryListing.update({
        where: { id: listingId },
        data: {
          napNameStatus: nameStatus,
          napPhoneStatus: phoneStatus,
          napAddressStatus: addressStatus,
          napWebsiteStatus: websiteStatus,
          napHoursStatus: hoursStatus,
          napOverallStatus: overallStatus,
          lastVerifiedAt: new Date(),
        },
      });
    });

    // If mismatch detected, emit NAP_MISMATCH opportunity to SEO Opportunity Engine
    if (overallStatus === NapOverallStatus.MISMATCH) {
      await ListingOpportunityBridge.emitNapMismatchOpportunity(
        tenantId,
        canonical.brandId,
        canonical.storeId,
        listing.provider as ListingProviderType,
        differences
      );
    }

    return {
      nameStatus,
      phoneStatus,
      addressStatus,
      websiteStatus,
      hoursStatus,
      overallStatus,
      differences,
    };
  }

  /**
   * Audits all directory listings for a store.
   */
  public static async auditAllStoreListings(tenantId: string, storeId: string) {
    const listings = await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      return tx.directoryListing.findMany({
        where: { tenantId, storeId },
        select: { id: true },
      });
    });

    const results = [];
    for (const l of listings) {
      const res = await this.auditListing(tenantId, l.id);
      results.push({ listingId: l.id, ...res });
    }
    return results;
  }

  /**
   * Proposes a new ListingChangeSet for human approval.
   */
  public static async proposeChangeSet(
    tenantId: string,
    listingId: string,
    requestedBy?: string
  ) {
    const listing = await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      return tx.directoryListing.findFirst({
        where: { id: listingId, tenantId },
      });
    });

    if (!listing) {
      throw createResourceNotFoundError('DirectoryListing', listingId);
    }

    // Run fresh audit to detect differences
    const auditResult = await this.auditListing(tenantId, listingId);
    if (auditResult.differences.length === 0) {
      throw createValidationError('No differences detected between canonical profile and provider listing');
    }

    const canonical = await ListingProfileService.getCanonicalStoreProfile(
      tenantId,
      listing.storeId
    );

    // Create PENDING changeset with stale-check snapshot
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const changeSet = await tx.listingChangeSet.create({
        data: {
          tenantId,
          listingId,
          proposedChanges: auditResult.differences as any,
          canonicalVersionAt: canonical.canonicalVersionAt,
          status: ChangeSetStatus.PENDING,
          priority: 'MEDIUM',
          requestedBy: requestedBy ?? null,
        },
      });

      logger.info(
        { tenantId, listingId, changeSetId: changeSet.id },
        'Created ListingChangeSet awaiting human approval'
      );

      return changeSet;
    });
  }

  /**
   * Human approval gate: reviews and executes or rejects a proposed ListingChangeSet.
   */
  public static async reviewChangeSet(
    tenantId: string,
    changeSetId: string,
    decision: 'APPROVED' | 'REJECTED',
    reviewedBy: string,
    reviewNote?: string
  ) {
    const changeSet = await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      return tx.listingChangeSet.findFirst({
        where: { id: changeSetId, tenantId },
        include: { listing: true },
      });
    });

    if (!changeSet) {
      throw createResourceNotFoundError('ListingChangeSet', changeSetId);
    }

    if (changeSet.status !== ChangeSetStatus.PENDING) {
      throw createValidationError(`Cannot review changeset with status ${changeSet.status}`);
    }

    // Rejection path
    if (decision === 'REJECTED') {
      return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
        return tx.listingChangeSet.update({
          where: { id: changeSetId },
          data: {
            status: ChangeSetStatus.REJECTED,
            reviewedBy,
            reviewedAt: new Date(),
            reviewNote: reviewNote ?? null,
          },
        });
      });
    }

    // Approval path: perform Stale Check
    const canonical = await ListingProfileService.getCanonicalStoreProfile(
      tenantId,
      changeSet.listing.storeId
    );

    if (canonical.canonicalVersionAt.getTime() > changeSet.canonicalVersionAt.getTime()) {
      logger.warn(
        { tenantId, changeSetId, canonicalAt: canonical.canonicalVersionAt, changeSetAt: changeSet.canonicalVersionAt },
        'ListingChangeSet is stale because canonical profile changed since proposal'
      );

      return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
        return tx.listingChangeSet.update({
          where: { id: changeSetId },
          data: {
            status: ChangeSetStatus.STALE,
            reviewedBy,
            reviewedAt: new Date(),
            reviewNote: 'Canonical profile was updated after this change set was proposed. The change set is stale. Please generate a fresh change set.',
          },
        });
      });
    }

    // Mark EXECUTING
    await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      await tx.listingChangeSet.update({
        where: { id: changeSetId },
        data: {
          status: ChangeSetStatus.EXECUTING,
          reviewedBy,
          reviewedAt: new Date(),
          reviewNote: reviewNote ?? null,
        },
      });
    });

    // Execute via provider connector
    const provider = DirectoryRegistry.getProvider(changeSet.listing.provider as ListingProviderType);
    const differences = changeSet.proposedChanges as unknown as NapFieldDifference[];

    const writeResult = await provider.applyChanges(
      tenantId,
      changeSet.listing.externalListingId || '',
      differences,
      canonical
    );

    let finalStatus: typeof ChangeSetStatus[keyof typeof ChangeSetStatus] = ChangeSetStatus.APPLIED;
    if (writeResult.resultStatus === 'MANUAL_ACTION_REQUIRED') {
      finalStatus = ChangeSetStatus.MANUAL_ACTION_REQUIRED;
    } else if (!writeResult.success) {
      finalStatus = ChangeSetStatus.FAILED;
    }

    const updatedChangeSet = await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      return tx.listingChangeSet.update({
        where: { id: changeSetId },
        data: {
          status: finalStatus,
          executedAt: new Date(),
          providerResult: writeResult.resultStatus,
          providerError: writeResult.error ?? null,
          reviewNote: writeResult.manualInstructions
            ? `${reviewNote ? reviewNote + '\n\n' : ''}${writeResult.manualInstructions}`
            : reviewNote,
        },
      });
    });

    // Run fresh audit to reflect updated state
    await this.auditListing(tenantId, changeSet.listingId);

    return updatedChangeSet;
  }

  /**
   * Retrieves change sets with optional status filter.
   */
  public static async getChangeSets(
    tenantId: string,
    options?: { listingId?: string; status?: string }
  ) {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      return tx.listingChangeSet.findMany({
        where: {
          tenantId,
          ...(options?.listingId ? { listingId: options.listingId } : {}),
          ...(options?.status ? { status: options.status } : {}),
        },
        include: {
          listing: {
            include: {
              store: {
                select: { id: true, name: true, city: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  }
}
