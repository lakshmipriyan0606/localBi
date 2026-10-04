import dns from 'dns';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { createValidationError } from '@/shared/errors';
import { UpsertThemeInput, DEFAULT_THEME_VALUES } from './theme-service';

export interface DraftBrandDesignDto {
  sourceUrl: string;
  theme: UpsertThemeInput;
  extractedAssets: {
    logoUrl?: string | undefined;
    faviconUrl?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
  };
  warnings: string[];
}

export class BrandDesignImportService {
  private static readonly MAX_REDIRECTS = 3;
  private static readonly TIMEOUT_MS = 10000;
  private static readonly MAX_RESPONSE_BYTES = 1024 * 1024; // 1 MB

  /**
   * Evaluates whether an IPv4 or IPv6 address belongs to private, loopback,
   * link-local, multicast, or cloud-metadata address spaces.
   */
  public static isDisallowedIp(ip: string): boolean {
    const trimmed = ip.trim().toLowerCase();

    // Check for IPv4-mapped IPv6 (::ffff:127.0.0.1, etc.)
    if (trimmed.startsWith('::ffff:')) {
      const ipv4Part = trimmed.substring(7);
      return this.isDisallowedIpv4(ipv4Part);
    }

    if (trimmed.includes(':')) {
      return this.isDisallowedIpv6(trimmed);
    }

    return this.isDisallowedIpv4(trimmed);
  }

  private static isDisallowedIpv4(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return true; // malformed IP treated as disallowed
    }

    const [a, b, c, d] = parts;

    // 0.0.0.0/8 (Current network)
    if (a === 0) return true;

    // 10.0.0.0/8 (Private network RFC 1918)
    if (a === 10) return true;

    // 100.64.0.0/10 (Carrier-grade NAT RFC 6598)
    if (a === 100 && b >= 64 && b <= 127) return true;

    // 127.0.0.0/8 (Loopback RFC 1122)
    if (a === 127) return true;

    // 169.254.0.0/16 (Link-local RFC 3927, includes cloud metadata 169.254.169.254)
    if (a === 169 && b === 254) return true;

    // 172.16.0.0/12 (Private network RFC 1918)
    if (a === 172 && b >= 16 && b <= 31) return true;

    // 192.0.0.0/24 (IETF assignments)
    if (a === 192 && b === 0 && c === 0) return true;

    // 192.0.2.0/24 (TEST-NET-1)
    if (a === 192 && b === 0 && c === 2) return true;

    // 192.88.99.0/24 (6to4 relay)
    if (a === 192 && b === 88 && c === 99) return true;

    // 192.168.0.0/16 (Private network RFC 1918)
    if (a === 192 && b === 168) return true;

    // 198.18.0.0/15 (Benchmarking)
    if (a === 198 && (b === 18 || b === 19)) return true;

    // 198.51.100.0/24 (TEST-NET-2)
    if (a === 198 && b === 51 && c === 100) return true;

    // 203.0.113.0/24 (TEST-NET-3)
    if (a === 203 && b === 0 && c === 113) return true;

    // 224.0.0.0/4 (Multicast)
    if (a >= 224 && a <= 239) return true;

    // 240.0.0.0/4 (Reserved / Future use)
    if (a >= 240) return true;

    return false;
  }

  private static isDisallowedIpv6(ip: string): boolean {
    const normalized = ip.toLowerCase();

    // Loopback
    if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;

    // Unspecified
    if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true;

    // Unique local address fc00::/7 (fc00... or fd00...)
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

    // Link-local address fe80::/10 (fe8, fe9, fea, feb)
    if (
      normalized.startsWith('fe8') ||
      normalized.startsWith('fe9') ||
      normalized.startsWith('fea') ||
      normalized.startsWith('feb')
    ) {
      return true;
    }

    // Multicast ff00::/8
    if (normalized.startsWith('ff')) return true;

    // Documentation 2001:db8::/32
    if (normalized.startsWith('2001:db8:') || normalized.startsWith('2001:0db8:')) return true;

    return false;
  }

  /**
   * Validates target URL against SSRF rules and DNS resolution.
   */
  public static async validateUrlSafety(targetUrl: string): Promise<URL> {
    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
    } catch {
      throw createValidationError('Invalid URL format.');
    }

    // Protocol check: only http and https allowed
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw createValidationError(`Unsupported protocol "${parsed.protocol}". Only HTTP and HTTPS are allowed.`);
    }

    const hostname = parsed.hostname.toLowerCase();

    // Check common localhost patterns
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      throw createValidationError('SSRF Protection: Access to local domains is prohibited.');
    }

    // Check if hostname is an encoded or raw IP directly
    if (/^(\d+|0x[0-9a-fA-F]+)$/.test(hostname)) {
      throw createValidationError('SSRF Protection: Integer or hexadecimal IP addresses are prohibited.');
    }

    // DNS lookup - must check all resolved addresses
    let addresses: dns.LookupAddress[];
    try {
      addresses = await dns.promises.lookup(hostname, { all: true });
    } catch (err: any) {
      throw createValidationError(`Failed to resolve host "${hostname}": ${err.message}`);
    }

    if (!addresses || addresses.length === 0) {
      throw createValidationError(`No IP addresses found for host "${hostname}".`);
    }

    for (const record of addresses) {
      if (this.isDisallowedIp(record.address)) {
        throw createValidationError(
          `SSRF Protection: Host "${hostname}" resolves to prohibited IP address "${record.address}".`
        );
      }
    }

    return parsed;
  }

  /**
   * Safely fetches HTML content from the given URL with redirect protection,
   * timeout, and size limits.
   */
  public static async fetchHtmlSafely(targetUrl: string): Promise<{ html: string; finalUrl: string }> {
    let currentUrl = targetUrl;
    let redirectCount = 0;

    while (redirectCount <= this.MAX_REDIRECTS) {
      const parsedUrl = await this.validateUrlSafety(currentUrl);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

      try {
        const response = await fetch(parsedUrl.toString(), {
          method: 'GET',
          redirect: 'manual', // handle redirects manually to re-validate DNS each time
          signal: controller.signal,
          headers: {
            'User-Agent': 'LocalBi-DesignImporter/1.0 (+https://localbi.app)',
            Accept: 'text/html,application/xhtml+xml',
          },
        });

        clearTimeout(timeoutId);

        // Check for redirects
        if (
          response.status === 301 ||
          response.status === 302 ||
          response.status === 303 ||
          response.status === 307 ||
          response.status === 308
        ) {
          const location = response.headers.get('location');
          if (!location) {
            throw createValidationError('Redirect response missing Location header.');
          }

          redirectCount++;
          if (redirectCount > this.MAX_REDIRECTS) {
            throw createValidationError(`Maximum redirect limit of ${this.MAX_REDIRECTS} exceeded.`);
          }

          // Resolve relative redirect against current URL
          currentUrl = new URL(location, currentUrl).toString();
          continue;
        }

        if (!response.ok) {
          throw createValidationError(`HTTP ${response.status}: Failed to retrieve target website.`);
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
          throw createValidationError(
            `Unsupported content-type "${contentType}". Only HTML documents can be imported.`
          );
        }

        // Verify content-length if available
        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength, 10) > this.MAX_RESPONSE_BYTES) {
          throw createValidationError('Target document exceeds the 1MB safety size limit.');
        }

        // Read up to 1MB safely
        const text = await response.text();
        if (text.length > this.MAX_RESPONSE_BYTES) {
          throw createValidationError('Target document exceeds the 1MB safety size limit.');
        }

        return { html: text, finalUrl: currentUrl };
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          throw createValidationError('Connection timed out while fetching website for design import.');
        }
        throw err;
      }
    }

    throw createValidationError(`Maximum redirect limit of ${this.MAX_REDIRECTS} exceeded.`);
  }

  /**
   * Extracts visual design tokens (colors, typography, logo, layout tendencies)
   * from the HTML. DOES NOT copy page text, articles, or proprietary code.
   */
  public static extractDesignTokens(html: string, baseUrl: string): DraftBrandDesignDto {
    const warnings: string[] = [];

    // 1. Meta theme-color
    let primaryColor: string | undefined;
    const themeColorMatch = html.match(/<meta\s+[^>]*name=["']theme-color["'][^>]*content=["']([^"']+)["']/i);
    if (themeColorMatch && themeColorMatch[1]) {
      primaryColor = this.normalizeHexColor(themeColorMatch[1].trim());
    }

    // 2. CSS variables or styles for colors
    if (!primaryColor) {
      const primaryVarMatch = html.match(/--(?:primary|brand|main)(?:-color)?\s*:\s*(#[0-9a-fA-F]{3,8}|rgb[a]?\([^)]+\)|hsl[a]?\([^)]+\))/i);
      if (primaryVarMatch && primaryVarMatch[1]) {
        primaryColor = this.normalizeHexColor(primaryVarMatch[1].trim());
      }
    }

    // Look for prominent background colors in styles
    if (!primaryColor) {
      const colorMatches = Array.from(html.matchAll(/background(?:-color)?\s*:\s*(#[0-9a-fA-F]{6})/gi));
      if (colorMatches.length > 0) {
        // Pick the first non-white, non-black prominent color
        for (const match of colorMatches) {
          const col = match[1].toLowerCase();
          if (col !== '#ffffff' && col !== '#000000' && col !== '#f8fafc' && col !== '#0f172a') {
            primaryColor = match[1];
            break;
          }
        }
      }
    }

    if (!primaryColor) {
      primaryColor = DEFAULT_THEME_VALUES.primaryColor;
      warnings.push('Could not detect a prominent primary brand color; using default indigo palette.');
    }

    // 3. Secondary & accent colors
    let secondaryColor: string | undefined;
    const secondaryVarMatch = html.match(/--(?:secondary|dark|slate)(?:-color)?\s*:\s*(#[0-9a-fA-F]{3,8})/i);
    if (secondaryVarMatch && secondaryVarMatch[1]) {
      secondaryColor = this.normalizeHexColor(secondaryVarMatch[1].trim());
    }
    if (!secondaryColor) {
      secondaryColor = DEFAULT_THEME_VALUES.secondaryColor;
    }

    let accentColor: string | undefined;
    const accentVarMatch = html.match(/--(?:accent|highlight|amber)(?:-color)?\s*:\s*(#[0-9a-fA-F]{3,8})/i);
    if (accentVarMatch && accentVarMatch[1]) {
      accentColor = this.normalizeHexColor(accentVarMatch[1].trim());
    }
    if (!accentColor) {
      accentColor = DEFAULT_THEME_VALUES.accentColor;
    }

    // 4. Typography: Google Fonts or font-family
    let fontHeading: string | undefined;
    let fontBody: string | undefined;

    const googleFontMatch = html.match(/fonts\.googleapis\.com\/css2\?family=([a-zA-Z0-9+:]+)/i);
    if (googleFontMatch && googleFontMatch[1]) {
      const rawFamily = googleFontMatch[1].split('&')[0].split(':')[0].replace(/\+/g, ' ');
      fontHeading = `${rawFamily}, sans-serif`;
      fontBody = `${rawFamily}, sans-serif`;
    }

    if (!fontHeading) {
      const fontMatch = html.match(/font-family\s*:\s*([^;}{"']+)/i);
      if (fontMatch && fontMatch[1]) {
        const cleaned = fontMatch[1].trim().split(',')[0].replace(/['"]/g, '');
        if (cleaned && cleaned.length < 40 && !cleaned.toLowerCase().includes('inherit')) {
          fontHeading = `${cleaned}, sans-serif`;
          fontBody = `${cleaned}, sans-serif`;
        }
      }
    }

    if (!fontHeading) {
      fontHeading = DEFAULT_THEME_VALUES.fontHeading;
      fontBody = DEFAULT_THEME_VALUES.fontBody;
    }

    // 5. Border radius tendencies
    let buttonRadius = DEFAULT_THEME_VALUES.buttonRadius;
    let cardRadius = DEFAULT_THEME_VALUES.cardRadius;
    if (html.includes('rounded-full') || html.includes('border-radius: 9999px') || html.includes('border-radius: 50px')) {
      buttonRadius = '9999px';
    } else if (html.includes('rounded-xl') || html.includes('border-radius: 12px') || html.includes('border-radius: 0.75rem')) {
      buttonRadius = '0.75rem';
      cardRadius = '1rem';
    } else if (html.includes('rounded-none') || html.includes('border-radius: 0px')) {
      buttonRadius = '0px';
      cardRadius = '0px';
    }

    // 6. Extracted assets (favicon / logo / title)
    let faviconUrl: string | undefined;
    const iconMatch = html.match(/<link\s+[^>]*rel=["'](?:shortcut\s+)?icon["'][^>]*href=["']([^"']+)["']/i);
    if (iconMatch && iconMatch[1]) {
      try {
        faviconUrl = new URL(iconMatch[1], baseUrl).toString();
      } catch {
        // ignore malformed favicon URL
      }
    }

    let logoUrl: string | undefined;
    const ogImageMatch = html.match(/<meta\s+[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    if (ogImageMatch && ogImageMatch[1]) {
      try {
        logoUrl = new URL(ogImageMatch[1], baseUrl).toString();
      } catch {
        // ignore malformed URL
      }
    }

    let title: string | undefined;
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim();
    }

    let description: string | undefined;
    const descMatch = html.match(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    if (descMatch && descMatch[1]) {
      description = descMatch[1].trim();
    }

    return {
      sourceUrl: baseUrl,
      theme: {
        primaryColor,
        secondaryColor,
        accentColor,
        backgroundColor: DEFAULT_THEME_VALUES.backgroundColor,
        textColor: DEFAULT_THEME_VALUES.textColor,
        fontHeading: fontHeading || DEFAULT_THEME_VALUES.fontHeading,
        fontBody: fontBody || DEFAULT_THEME_VALUES.fontBody,
        buttonRadius,
        cardRadius,
        customCss: null,
      },
      extractedAssets: {
        logoUrl,
        faviconUrl,
        title,
        description,
      },
      warnings,
    };
  }

  private static normalizeHexColor(val: string): string | undefined {
    if (/^#[0-9a-fA-F]{6}$/.test(val)) return val;
    if (/^#[0-9a-fA-F]{3}$/.test(val)) {
      return `#${val[1]}${val[1]}${val[2]}${val[2]}${val[3]}${val[3]}`;
    }
    return undefined;
  }

  /**
   * Imports design tokens from an external URL for review.
   */
  public static async importFromUrl(url: string): Promise<DraftBrandDesignDto> {
    const { html, finalUrl } = await this.fetchHtmlSafely(url);
    return this.extractDesignTokens(html, finalUrl);
  }

  /**
   * Imports design tokens from the verified ORIGINAL WebSurface of a brand.
   */
  public static async importFromOriginalSurface(
    tenantId: string,
    brandId: string
  ): Promise<DraftBrandDesignDto> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const originalSurface = await tx.webSurface.findFirst({
        where: {
          tenantId,
          brandId,
          type: 'ORIGINAL',
        },
        include: {
          domains: {
            where: { isPrimary: true },
          },
        },
      });

      if (!originalSurface) {
        throw createValidationError(
          'No verified ORIGINAL website surface found for this brand. Please specify the brand website URL directly.'
        );
      }

      const primaryDomain = originalSurface.domains[0]?.hostname;
      if (!primaryDomain) {
        throw createValidationError(
          'Original website surface does not have a primary domain configured.'
        );
      }

      const fullUrl = primaryDomain.startsWith('http') ? primaryDomain : `https://${primaryDomain}`;
      return this.importFromUrl(fullUrl);
    });
  }
}
