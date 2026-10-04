import { ExpectedDirectory } from './authority-types';
import { ListingProvider } from '../listings/listing-types';

export class ExpectedDirectoryEngine {
  /**
   * Curated directory targets relevant to country, business category, and provider capability.
   * Avoids arbitrary 100-directory spam lists.
   */
  private static readonly DIRECTORY_CATALOG: ExpectedDirectory[] = [
    {
      provider: ListingProvider.GOOGLE_BUSINESS_PROFILE,
      displayName: 'Google Business Profile',
      portalUrl: 'https://business.google.com',
      isManualOnly: false,
      applicableCountries: ['*'], // Global
      importance: 'CRITICAL',
    },
    {
      provider: ListingProvider.APPLE_BUSINESS_CONNECT,
      displayName: 'Apple Business Connect',
      portalUrl: 'https://businessconnect.apple.com',
      isManualOnly: true,
      applicableCountries: ['*'],
      importance: 'HIGH',
    },
    {
      provider: ListingProvider.BING_PLACES,
      displayName: 'Bing Places for Business',
      portalUrl: 'https://www.bingplaces.com',
      isManualOnly: true,
      applicableCountries: ['*'],
      importance: 'HIGH',
    },
    {
      provider: ListingProvider.JUSTDIAL,
      displayName: 'Justdial',
      portalUrl: 'https://www.justdial.com',
      isManualOnly: true,
      applicableCountries: ['IN'], // India specific
      applicableCategories: ['retail', 'perfume', 'fragrance', 'restaurant', 'healthcare', 'services', 'shopping'],
      importance: 'CRITICAL',
    },
    {
      provider: ListingProvider.YELP,
      displayName: 'Yelp for Business',
      portalUrl: 'https://biz.yelp.com',
      isManualOnly: true,
      applicableCountries: ['US', 'CA', 'GB', 'UK', 'AU'], // US/Western focused
      importance: 'HIGH',
    },
    {
      provider: ListingProvider.FACEBOOK,
      displayName: 'Facebook Places',
      portalUrl: 'https://www.facebook.com/pages',
      isManualOnly: true,
      applicableCountries: ['*'],
      importance: 'MEDIUM',
    },
    {
      provider: ListingProvider.FOURSQUARE,
      displayName: 'Foursquare City Guide',
      portalUrl: 'https://foursquare.com/business',
      isManualOnly: true,
      applicableCountries: ['US', 'CA', 'GB', 'IN'],
      importance: 'MEDIUM',
    },
  ];

  /**
   * Resolves the list of expected directories for a specific store based on country and category.
   */
  public static getExpectedDirectoriesForStore(
    country: string,
    category?: string | null
  ): ExpectedDirectory[] {
    const cleanCountry = (country || 'IN').toUpperCase().trim();
    const cleanCategory = (category || '').toLowerCase().trim();

    return this.DIRECTORY_CATALOG.filter((dir) => {
      // 1. Country filter
      const countryMatches =
        dir.applicableCountries.includes('*') ||
        dir.applicableCountries.includes(cleanCountry);
      if (!countryMatches) return false;

      // 2. Category filter
      if (dir.applicableCategories && dir.applicableCategories.length > 0) {
        if (!cleanCategory) return true; // If category unknown, include default
        const catMatches = dir.applicableCategories.some(
          (c) => cleanCategory.includes(c) || c.includes(cleanCategory)
        );
        if (!catMatches) return false;
      }

      return true;
    });
  }
}
