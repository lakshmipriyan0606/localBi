import { DirectoryProvider } from '../directory-provider';
import { ListingProvider, ListingProviderType, ProviderCapabilities } from '../listing-types';
import { GbpListingProvider } from './gbp-listing-provider';
import { ManualListingProvider } from './manual-listing-provider';

export class DirectoryRegistry {
  private static providers: Map<ListingProviderType, DirectoryProvider> = new Map();

  static {
    // Register Google Business Profile
    const gbp = new GbpListingProvider();
    this.providers.set(ListingProvider.GOOGLE_BUSINESS_PROFILE, gbp);

    // Register Manual-only Providers
    const manualProviders: ListingProviderType[] = [
      ListingProvider.APPLE_BUSINESS_CONNECT,
      ListingProvider.BING_PLACES,
      ListingProvider.JUSTDIAL,
      ListingProvider.YELP,
      ListingProvider.FACEBOOK,
      ListingProvider.FOURSQUARE,
      ListingProvider.MANUAL,
    ];

    for (const p of manualProviders) {
      this.providers.set(p, new ManualListingProvider(p));
    }
  }

  /**
   * Retrieves the DirectoryProvider instance for a given provider type.
   */
  public static getProvider(provider: ListingProviderType): DirectoryProvider {
    const instance = this.providers.get(provider);
    if (!instance) {
      // Fallback to generic manual provider
      return new ManualListingProvider(provider);
    }
    return instance;
  }

  /**
   * Returns all registered directory providers.
   */
  public static getAllProviders(): DirectoryProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Returns capability declarations for all supported providers.
   */
  public static getAllCapabilities(): ProviderCapabilities[] {
    return this.getAllProviders().map(p => p.capabilities);
  }
}
