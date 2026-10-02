import {
  ListingProviderType,
  ProviderCapabilities,
  CanonicalStoreProfile,
  ProviderListingSnapshot,
  NapFieldDifference,
  ProviderWriteResult,
} from './listing-types';

export abstract class DirectoryProvider {
  public abstract readonly provider: ListingProviderType;
  public abstract readonly capabilities: ProviderCapabilities;

  /**
   * Fetches the current live snapshot from the directory provider.
   * If listing is not found or deleted, returns null.
   * If there is an authentication or network error, throws AppError(LISTING_PROVIDER_ERROR).
   */
  public abstract fetchListing(
    tenantId: string,
    externalListingId: string
  ): Promise<ProviderListingSnapshot | null>;

  /**
   * Writes approved changes to the directory provider.
   * If the provider is manual-only, throws or returns MANUAL_ACTION_REQUIRED result with portal instructions.
   */
  public abstract applyChanges(
    tenantId: string,
    externalListingId: string,
    differences: NapFieldDifference[],
    canonical: CanonicalStoreProfile
  ): Promise<ProviderWriteResult>;

  /**
   * Provides step-by-step human instructions for manual-only providers.
   */
  public abstract getPortalInstructions(
    canonical: CanonicalStoreProfile,
    differences: NapFieldDifference[]
  ): string;

  /**
   * Discovers matching listings from the provider based on canonical store details.
   */
  public abstract discover(
    tenantId: string,
    canonical: CanonicalStoreProfile
  ): Promise<ProviderListingSnapshot[]>;
}
