export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface StructuredDataStoreInput {
  name: string;
  telephone?: string | null | undefined;
  addressLine1?: string | null | undefined;
  city?: string | null | undefined;
  state?: string | null | undefined;
  postalCode?: string | null | undefined;
  country?: string | null | undefined;
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
  rating?: number | null | undefined;
  reviewCount?: number | null | undefined;
  url?: string | undefined;
}

export interface StructuredDataProductInput {
  name: string;
  description?: string | null | undefined;
  sku?: string | null | undefined;
  imageUrl?: string | null | undefined;
  price?: number | null | undefined;
  currency?: string | undefined;
  isAvailable?: boolean | undefined;
  url?: string | undefined;
}

export interface StructuredDataFaqInput {
  question: string;
  answer: string;
}

export interface StructuredDataArticleInput {
  headline: string;
  description?: string | null | undefined;
  authorName?: string | null | undefined;
  authorUrl?: string | null | undefined;
  publisherName: string;
  publisherLogoUrl?: string | null | undefined;
  datePublished?: string | null | undefined;
  dateModified?: string | null | undefined;
  imageUrl?: string | null | undefined;
  url?: string | undefined;
}

export class StructuredDataService {
  /**
   * Generates BreadcrumbList JSON-LD from dynamic route items.
   */
  public static generateBreadcrumbs(items: BreadcrumbItem[]): Record<string, unknown> | null {
    if (!items || items.length === 0) return null;

    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    };
  }

  /**
   * Generates LocalBusiness / Store schema. Real database values only.
   */
  public static generateStoreSchema(store: StructuredDataStoreInput): Record<string, unknown> | null {
    if (!store || !store.name) return null;

    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: store.name,
    };

    if (store.url) schema['url'] = store.url;
    if (store.telephone) schema['telephone'] = store.telephone;

    if (store.addressLine1 || store.city) {
      schema['address'] = {
        '@type': 'PostalAddress',
        ...(store.addressLine1 ? { streetAddress: store.addressLine1 } : {}),
        ...(store.city ? { addressLocality: store.city } : {}),
        ...(store.state ? { addressRegion: store.state } : {}),
        ...(store.postalCode ? { postalCode: store.postalCode } : {}),
        ...(store.country ? { addressCountry: store.country } : {}),
      };
    }

    if (store.latitude !== null && store.latitude !== undefined && store.longitude !== null && store.longitude !== undefined) {
      schema['geo'] = {
        '@type': 'GeoCoordinates',
        latitude: store.latitude,
        longitude: store.longitude,
      };
    }

    // Only emit aggregateRating when real Google reviews exist (rating > 0 and reviewCount > 0)
    if (store.rating && store.reviewCount && store.rating > 0 && store.reviewCount > 0) {
      schema['aggregateRating'] = {
        '@type': 'AggregateRating',
        ratingValue: store.rating,
        reviewCount: store.reviewCount,
      };
    }

    return schema;
  }

  /**
   * Generates Product schema with real resolved pricing and availability.
   */
  public static generateProductSchema(product: StructuredDataProductInput): Record<string, unknown> | null {
    if (!product || !product.name) return null;

    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
    };

    if (product.sku) schema['sku'] = product.sku;
    if (product.description) schema['description'] = product.description;
    if (product.imageUrl) schema['image'] = [product.imageUrl];

    if (product.price !== null && product.price !== undefined) {
      schema['offers'] = {
        '@type': 'Offer',
        price: product.price,
        priceCurrency: product.currency || 'INR',
        availability:
          product.isAvailable !== false
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
        ...(product.url ? { url: product.url } : {}),
      };
    }

    return schema;
  }

  /**
   * Generates FAQPage schema from structured Q&A items.
   */
  public static generateFaqSchema(faqs: StructuredDataFaqInput[]): Record<string, unknown> | null {
    if (!faqs || faqs.length === 0) return null;

    const validFaqs = faqs.filter((f) => f.question && f.answer);
    if (validFaqs.length === 0) return null;

    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: validFaqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    };
  }

  /**
   * Generates Article / BlogPosting schema.
   */
  public static generateArticleSchema(article: StructuredDataArticleInput): Record<string, unknown> | null {
    if (!article || !article.headline) return null;

    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.headline,
      publisher: {
        '@type': 'Organization',
        name: article.publisherName,
        ...(article.publisherLogoUrl ? { logo: { '@type': 'ImageObject', url: article.publisherLogoUrl } } : {}),
      },
    };

    if (article.description) schema['description'] = article.description;
    if (article.url) schema['url'] = article.url;
    if (article.imageUrl) schema['image'] = [article.imageUrl];
    if (article.datePublished) schema['datePublished'] = article.datePublished;
    if (article.dateModified) schema['dateModified'] = article.dateModified;

    if (article.authorName) {
      schema['author'] = {
        '@type': 'Person',
        name: article.authorName,
        ...(article.authorUrl ? { url: article.authorUrl } : {}),
      };
    }

    return schema;
  }
}
