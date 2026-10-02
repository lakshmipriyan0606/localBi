import { createValidationError } from '@/shared/errors';

export interface SeoTokenData {
  brand?: string | undefined;
  city?: string | undefined;
  locality?: string | undefined;
  store?: string | undefined;
  product?: string | undefined;
  category?: string | undefined;
}

export interface SeoConfigDto {
  id?: string | undefined;
  tenantId?: string | undefined;
  brandId?: string | undefined;
  webSurfaceId?: string | null | undefined;
  pageType?: string | null | undefined;
  titleTemplate: string;
  descriptionTemplate: string;
  keywords?: string | null | undefined;
  robotsPolicy?: string | undefined;
}

export interface ResolvedSeoDto {
  title: string;
  description: string;
  canonicalUrl: string;
  robots: string;
  keywords?: string | undefined;
  openGraph: {
    title: string;
    description: string;
    url: string;
    siteName: string;
    type: 'website' | 'article';
    images?: Array<{ url: string; alt?: string | undefined }> | undefined;
  };
  twitter: {
    card: 'summary' | 'summary_large_image';
    title: string;
    description: string;
  };
}

const ALLOWED_TOKENS = new Set([
  'brand',
  'city',
  'locality',
  'store',
  'product',
  'category',
]);

export class SeoResolver {
  /**
   * Replaces controlled placeholders in a template string with real entity values.
   * Throws a validation error if an unknown or malformed token like `{evil}` or `{foo}` is present.
   */
  public static interpolateTokens(template: string, data: SeoTokenData): string {
    if (!template) return '';

    return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, tokenName) => {
      const lower = tokenName.toLowerCase();
      if (!ALLOWED_TOKENS.has(lower)) {
        throw createValidationError(
          `Unknown SEO placeholder: "${match}". Allowed tokens are: ${Array.from(ALLOWED_TOKENS)
            .map((t) => `{${t}}`)
            .join(', ')}`
        );
      }

      const val = data[lower as keyof SeoTokenData];
      return val ? String(val).trim() : '';
    });
  }

  /**
   * Resolves complete SEO metadata for SSR rendering.
   */
  public static resolveSeo(params: {
    tokenData: SeoTokenData;
    customConfig?: SeoConfigDto | undefined;
    path: string;
    domainHostname?: string | undefined;
    isDraftOrPreview?: boolean | undefined;
    ogImageUrl?: string | undefined;
  }): ResolvedSeoDto {
    const { tokenData, customConfig, path, domainHostname, isDraftOrPreview, ogImageUrl } = params;

    const brandName = tokenData.brand || 'Official Storefront';

    // Default title template
    let defaultTitle = '{brand}';
    let defaultDesc = 'Welcome to {brand}. Discover products, locations, and direct store contact.';

    if (tokenData.product && tokenData.store) {
      defaultTitle = '{product} in {locality}, {city} | {brand}';
      defaultDesc = 'Buy {product} at {store} in {locality}, {city}. View pricing, availability, and get directions.';
    } else if (tokenData.store) {
      defaultTitle = '{store} in {locality}, {city} | {brand}';
      defaultDesc = 'Visit {store} in {locality}, {city}. Check operating hours, customer reviews, and contact options.';
    } else if (tokenData.product) {
      defaultTitle = '{product} | {brand}';
      defaultDesc = 'Discover {product} from {brand}. View product details and available locations.';
    } else if (tokenData.city) {
      defaultTitle = 'Stores in {city} | {brand}';
      defaultDesc = 'Find {brand} stores in {city}. Operating hours, directions, and catalog availability.';
    }

    const titleTpl = customConfig?.titleTemplate || defaultTitle;
    const descTpl = customConfig?.descriptionTemplate || defaultDesc;

    const title = this.interpolateTokens(titleTpl, tokenData)
      .replace(/\s{2,}/g, ' ')
      .trim();
    const description = this.interpolateTokens(descTpl, tokenData)
      .replace(/\s{2,}/g, ' ')
      .trim();

    // Canonical URL generation
    const host = domainHostname ? `https://${domainHostname}` : '';
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const canonicalUrl = host ? `${host}${cleanPath === '/' ? '' : cleanPath}` : cleanPath;

    // Robots policy: preview/drafts must NEVER be indexed
    const robots = isDraftOrPreview
      ? 'noindex, nofollow'
      : customConfig?.robotsPolicy || 'index, follow';

    return {
      title,
      description,
      canonicalUrl,
      robots,
      ...(customConfig?.keywords ? { keywords: customConfig.keywords } : {}),
      openGraph: {
        title,
        description,
        url: canonicalUrl,
        siteName: brandName,
        type: 'website',
        ...(ogImageUrl ? { images: [{ url: ogImageUrl, alt: title }] } : {}),
      },
      twitter: {
        card: ogImageUrl ? 'summary_large_image' : 'summary',
        title,
        description,
      },
    };
  }
}
