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

export class ManualListingProvider extends DirectoryProvider {
  public readonly provider: ListingProviderType;
  public readonly capabilities: ProviderCapabilities;

  private static readonly PORTAL_INFO: Record<string, { name: string; portalUrl: string }> = {
    [ListingProvider.APPLE_BUSINESS_CONNECT]: {
      name: 'Apple Business Connect',
      portalUrl: 'https://businessconnect.apple.com',
    },
    [ListingProvider.BING_PLACES]: {
      name: 'Bing Places for Business',
      portalUrl: 'https://www.bingplaces.com',
    },
    [ListingProvider.JUSTDIAL]: {
      name: 'Justdial',
      portalUrl: 'https://www.justdial.com/free-listing',
    },
    [ListingProvider.YELP]: {
      name: 'Yelp for Business',
      portalUrl: 'https://biz.yelp.com',
    },
    [ListingProvider.FACEBOOK]: {
      name: 'Facebook Pages Manager',
      portalUrl: 'https://business.facebook.com',
    },
    [ListingProvider.FOURSQUARE]: {
      name: 'Foursquare for Business',
      portalUrl: 'https://foursquare.com/business',
    },
    [ListingProvider.MANUAL]: {
      name: 'Manual Directory',
      portalUrl: '',
    },
  };

  constructor(provider: ListingProviderType = ListingProvider.MANUAL) {
    super();
    this.provider = provider;
    const info = ManualListingProvider.PORTAL_INFO[provider] || {
      name: provider,
      portalUrl: '',
    };

    this.capabilities = {
      provider,
      name: info.name,
      canDiscover: false,
      canRead: false,
      canWrite: false,
      isManualOnly: true,
      supportsStoreHours: true,
      supportsDuplicatesDetection: false,
      portalUrl: info.portalUrl,
    };
  }

  public async fetchListing(
    tenantId: string,
    externalListingId: string
  ): Promise<ProviderListingSnapshot | null> {
    try {
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
      logger.error({ err, tenantId, externalListingId, provider: this.provider }, 'Failed to fetch manual listing');
      throw new AppError({
        code: 'LISTING_PROVIDER_ERROR',
        message: `${this.capabilities.name} query failed: ${err.message}`,
        statusCode: 500,
      });
    }
  }

  public async applyChanges(
    tenantId: string,
    externalListingId: string,
    differences: NapFieldDifference[],
    canonical: CanonicalStoreProfile
  ): Promise<ProviderWriteResult> {
    const instructions = this.getPortalInstructions(canonical, differences);
    logger.info(
      { tenantId, provider: this.provider, externalListingId },
      'Manual-only provider update requires human operator action'
    );

    return {
      success: true,
      resultStatus: 'MANUAL_ACTION_REQUIRED',
      manualInstructions: instructions,
    };
  }

  public getPortalInstructions(
    canonical: CanonicalStoreProfile,
    differences: NapFieldDifference[]
  ): string {
    const lines = [
      `== Action Required: Manual Directory Update ==`,
      `Provider: ${this.capabilities.name}`,
      this.capabilities.portalUrl ? `Portal URL: ${this.capabilities.portalUrl}` : '',
      `Business: "${canonical.name}"`,
      `Store Address: ${canonical.addressLine1}, ${canonical.city}, ${canonical.postalCode}`,
      ``,
      `Please log into the provider portal and apply the following verified canonical updates:`,
    ];

    for (const diff of differences) {
      lines.push(`- ${diff.field.toUpperCase()}:`);
      lines.push(`    Current in Directory: "${diff.providerValue ?? '(none)'}"`);
      lines.push(`    Canonical Target:     "${diff.canonicalValue}"`);
    }

    lines.push(``);
    lines.push(`Once applied in the portal, mark the Change Set as APPLIED in LocalBI.`);
    return lines.filter(Boolean).join('\n');
  }

  public async discover(
    tenantId: string,
    canonical: CanonicalStoreProfile
  ): Promise<ProviderListingSnapshot[]> {
    // Manual providers do not support automatic API discovery
    return [];
  }
}
