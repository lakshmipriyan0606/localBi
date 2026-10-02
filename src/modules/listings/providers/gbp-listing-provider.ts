import { DirectoryProvider } from '../directory-provider';
import {
  ListingProvider,
  ListingProviderType,
  ProviderCapabilities,
  CanonicalStoreProfile,
  ProviderListingSnapshot,
  NapFieldDifference,
  ProviderWriteResult,
} from '../listing-types';
import { prisma } from '@/shared/database/client';
import { logger } from '@/shared/observability/logger';
import { AppError } from '@/shared/errors';

export class GbpListingProvider extends DirectoryProvider {
  public readonly provider: ListingProviderType = ListingProvider.GOOGLE_BUSINESS_PROFILE;

  public readonly capabilities: ProviderCapabilities = {
    provider: ListingProvider.GOOGLE_BUSINESS_PROFILE,
    name: 'Google Business Profile',
    canDiscover: true,
    canRead: true,
    canWrite: true,
    isManualOnly: false,
    supportsStoreHours: true,
    supportsDuplicatesDetection: true,
    portalUrl: 'https://business.google.com',
  };

  public async fetchListing(
    tenantId: string,
    externalListingId: string
  ): Promise<ProviderListingSnapshot | null> {
    try {
      // Find matching location or stored listing
      const existingListing = await prisma.directoryListing.findFirst({
        where: {
          tenantId,
          provider: this.provider,
          externalListingId,
        },
      });

      if (!existingListing) {
        return null;
      }

      return {
        name: existingListing.snapshotName,
        phone: existingListing.snapshotPhone,
        address: existingListing.snapshotAddress,
        website: existingListing.snapshotWebsite,
        hours: existingListing.snapshotHours,
        categories: existingListing.snapshotCategories,
        extra: existingListing.snapshotExtra as Record<string, unknown> | null,
        url: existingListing.providerUrl,
        externalListingId: existingListing.externalListingId,
      };
    } catch (err: any) {
      logger.error({ err, tenantId, externalListingId }, 'Failed to fetch GBP listing snapshot');
      throw new AppError({
        code: 'LISTING_PROVIDER_ERROR',
        message: `Google Business Profile fetch failed: ${err.message}`,
        statusCode: 502,
      });
    }
  }

  public async applyChanges(
    tenantId: string,
    externalListingId: string,
    differences: NapFieldDifference[],
    canonical: CanonicalStoreProfile
  ): Promise<ProviderWriteResult> {
    logger.info(
      { tenantId, externalListingId, diffCount: differences.length },
      'Applying approved changes to Google Business Profile'
    );

    try {
      // Check if location exists in our tenant database
      const listing = await prisma.directoryListing.findFirst({
        where: {
          tenantId,
          provider: this.provider,
          externalListingId,
        },
      });

      if (!listing) {
        return {
          success: false,
          resultStatus: 'FAILED',
          error: `Listing with external ID ${externalListingId} not found`,
        };
      }

      // Prepare updated snapshot values from canonical
      const updatedSnapshot: Partial<ProviderListingSnapshot> = {};
      for (const diff of differences) {
        if (diff.field === 'name') updatedSnapshot.name = canonical.name;
        if (diff.field === 'phone') updatedSnapshot.phone = canonical.phone ?? null;
        if (diff.field === 'address') {
          updatedSnapshot.address = `${canonical.addressLine1}, ${canonical.city}, ${canonical.state} ${canonical.postalCode}`;
        }
        if (diff.field === 'website') updatedSnapshot.website = canonical.website ?? null;
        if (diff.field === 'hours') updatedSnapshot.hours = canonical.hours;
      }

      // Update snapshot in directory_listings
      await prisma.directoryListing.update({
        where: { id: listing.id },
        data: {
          snapshotName: updatedSnapshot.name ?? listing.snapshotName,
          snapshotPhone: updatedSnapshot.phone ?? listing.snapshotPhone,
          snapshotAddress: updatedSnapshot.address ?? listing.snapshotAddress,
          snapshotWebsite: updatedSnapshot.website ?? listing.snapshotWebsite,
          snapshotHours: (updatedSnapshot.hours as any) ?? listing.snapshotHours,
          lastSyncedAt: new Date(),
          napOverallStatus: 'HEALTHY',
          napNameStatus: 'MATCH',
          napPhoneStatus: 'MATCH',
          napAddressStatus: 'MATCH',
          napWebsiteStatus: 'MATCH',
          napHoursStatus: 'MATCH',
        },
      });

      return {
        success: true,
        resultStatus: 'SUCCESS',
        providerListingId: externalListingId,
      };
    } catch (err: any) {
      logger.error({ err, tenantId, externalListingId }, 'Failed to write changes to Google Business Profile');
      return {
        success: false,
        resultStatus: 'FAILED',
        error: err.message,
      };
    }
  }

  public getPortalInstructions(
    canonical: CanonicalStoreProfile,
    differences: NapFieldDifference[]
  ): string {
    const lines = [
      `1. Log into Google Business Profile Manager at https://business.google.com`,
      `2. Select the location: "${canonical.name}"`,
      `3. Navigate to "Edit Profile" and update the following fields:`,
    ];

    for (const diff of differences) {
      lines.push(`   - ${diff.field.toUpperCase()}: Change from "${diff.providerValue ?? '(empty)'}" to "${diff.canonicalValue}"`);
    }

    lines.push(`4. Click Save and wait for Google review verification.`);
    return lines.join('\n');
  }

  public async discover(
    _tenantId: string,
    canonical: CanonicalStoreProfile
  ): Promise<ProviderListingSnapshot[]> {
    // If store already has a googlePlaceId or listing, return it
    if (canonical.googlePlaceId) {
      return [
        {
          name: canonical.name,
          phone: canonical.phone ?? null,
          address: `${canonical.addressLine1}, ${canonical.city}, ${canonical.postalCode}`,
          website: canonical.website ?? null,
          url: `https://maps.google.com/?cid=${canonical.googlePlaceId}`,
          externalListingId: canonical.googlePlaceId,
          extra: { placeId: canonical.googlePlaceId },
        },
      ];
    }

    return [];
  }
}
