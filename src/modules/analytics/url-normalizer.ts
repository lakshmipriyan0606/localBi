import { SurfaceService } from '@/modules/page-builder/surface-service';

/**
 * Unified canonical URL and Hostname Normalization Utility for Analytics (GA4 + GSC).
 * Wraps and standardizes Phase 1 Domain normalization rules across all services.
 */
export class AnalyticsUrlNormalizer {
  /**
   * Normalizes a raw hostname or domain URL into a pure lowercase hostname.
   * Strips protocol, port, path, query params, trailing slashes, and whitespace.
   *
   * Example: "https://Locate.AalimPerfumes.com/chennai/" -> "locate.aalimperfumes.com"
   */
  public static normalizeHostname(raw: string): string {
    return SurfaceService.normalizeHostname(raw);
  }

  /**
   * Converts a hostname or URL into a canonical URL prefix suitable for GSC page filtering.
   * Always includes "https://" and a trailing slash "/".
   *
   * Example: "locate.aalimperfumes.com" -> "https://locate.aalimperfumes.com/"
   * Example: "http://locate.brand.com" -> "https://locate.brand.com/"
   */
  public static toCanonicalUrlPrefix(rawHostnameOrUrl: string): string {
    const host = this.normalizeHostname(rawHostnameOrUrl);
    return `https://${host}/`;
  }

  /**
   * Checks whether a full URL belongs to a given web surface hostname or canonical URL prefix.
   * Case-insensitive, protocol-agnostic.
   */
  public static isUrlUnderSurface(fullUrl: string, surfaceHostname: string): boolean {
    if (!fullUrl || !surfaceHostname) return false;
    try {
      const cleanHost = this.normalizeHostname(surfaceHostname);
      const urlObj = fullUrl.startsWith('http') ? new URL(fullUrl) : new URL(`https://${fullUrl}`);
      const parsedHost = urlObj.hostname.toLowerCase();

      return parsedHost === cleanHost;
    } catch {
      // Fallback simple string check if URL parsing fails
      const cleanHost = surfaceHostname.trim().toLowerCase();
      return fullUrl.toLowerCase().includes(cleanHost);
    }
  }

  /**
   * Extracts hostname safely from a full URL.
   */
  public static extractHostname(fullUrl: string): string {
    try {
      const urlObj = fullUrl.startsWith('http') ? new URL(fullUrl) : new URL(`https://${fullUrl}`);
      return urlObj.hostname.toLowerCase();
    } catch {
      return this.normalizeHostname(fullUrl);
    }
  }
}
