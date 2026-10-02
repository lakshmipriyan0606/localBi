export type EligibilityStatus = 'READY' | 'MISSING_REQUIRED_DATA' | 'UNSUPPORTED' | 'NOT_PUBLISHED';

export interface EligibilityIssue {
  field: string;
  message: string;
  severity: 'ERROR' | 'WARNING';
}

export interface EligibilityResult {
  status: EligibilityStatus;
  isEligible: boolean;
  issues: EligibilityIssue[];
}

export interface ProductEligibilityInput {
  id: string;
  name: string;
  description?: string | null | undefined;
  basePrice?: number | string | null | undefined;
  currency?: string | null | undefined;
  publishStatus: string; // DRAFT, PUBLISHED, UNPUBLISHED
  status: string; // ACTIVE, INACTIVE
  sku: string;
  media?: Array<{ url: string; type?: string | undefined }> | undefined;
  canonicalUrl?: string | null | undefined;
  brandName?: string | null | undefined;
  gtin?: string | null | undefined;
  mpn?: string | null | undefined;
  condition?: string | null | undefined;
}

/**
 * Service to deterministically validate whether a LocalBi Product
 * satisfies Google Merchant Center publication requirements.
 */
export class MerchantEligibilityService {
  /**
   * Validate a product for Merchant Center publication.
   */
  public static validate(product: ProductEligibilityInput): EligibilityResult {
    const issues: EligibilityIssue[] = [];

    // 1. Publication & Active status check
    if (product.publishStatus !== 'PUBLISHED') {
      return {
        status: 'NOT_PUBLISHED',
        isEligible: false,
        issues: [
          {
            field: 'publishStatus',
            message: `Product is in ${product.publishStatus} state. Only PUBLISHED products can be submitted to Merchant Center.`,
            severity: 'ERROR',
          },
        ],
      };
    }

    if (product.status !== 'ACTIVE') {
      return {
        status: 'NOT_PUBLISHED',
        isEligible: false,
        issues: [
          {
            field: 'status',
            message: 'Product status is INACTIVE. Inactive products cannot be submitted to Merchant Center.',
            severity: 'ERROR',
          },
        ],
      };
    }

    // 2. Required title validation
    const trimmedTitle = (product.name || '').trim();
    if (!trimmedTitle) {
      issues.push({
        field: 'title',
        message: 'Product title is required.',
        severity: 'ERROR',
      });
    } else if (trimmedTitle.length > 150) {
      issues.push({
        field: 'title',
        message: `Product title exceeds 150 characters (current length: ${trimmedTitle.length}).`,
        severity: 'ERROR',
      });
    }

    // 3. Required description validation
    const trimmedDesc = (product.description || '').trim();
    if (!trimmedDesc) {
      issues.push({
        field: 'description',
        message: 'Product description is required.',
        severity: 'ERROR',
      });
    } else if (trimmedDesc.length > 5000) {
      issues.push({
        field: 'description',
        message: `Product description exceeds 5,000 characters (current length: ${trimmedDesc.length}).`,
        severity: 'ERROR',
      });
    }

    // 4. Price & Currency validation
    const priceNum = Number(product.basePrice);
    if (!product.basePrice || isNaN(priceNum) || priceNum <= 0) {
      issues.push({
        field: 'basePrice',
        message: 'A valid positive base price is required for Merchant Center publication.',
        severity: 'ERROR',
      });
    }

    if (!product.currency || product.currency.trim().length !== 3) {
      issues.push({
        field: 'currency',
        message: 'A valid 3-letter ISO 4217 currency code (e.g. INR, USD) is required.',
        severity: 'ERROR',
      });
    }

    // 5. Image link validation (Section 12: Stable public URLs, no localhost or temporary signed urls)
    const validImages = (product.media || []).filter((m) => {
      if (!m.url) return false;
      const url = m.url.toLowerCase();
      const isHttp = url.startsWith('http://') || url.startsWith('https://');
      const isLocal = url.includes('localhost') || url.includes('127.0.0.1');
      return isHttp && !isLocal;
    });

    if (validImages.length === 0) {
      issues.push({
        field: 'image',
        message: 'At least one valid public image URL (http/https, non-local) is required.',
        severity: 'ERROR',
      });
    }

    // 6. Public product link validation (Section 11)
    if (product.canonicalUrl) {
      const link = product.canonicalUrl.toLowerCase();
      if (!link.startsWith('http://') && !link.startsWith('https://')) {
        issues.push({
          field: 'link',
          message: 'Product landing page URL must be a valid public http/https link.',
          severity: 'ERROR',
        });
      } else if (link.includes('localhost') || link.includes('127.0.0.1') || link.includes('/preview')) {
        issues.push({
          field: 'link',
          message: 'Product landing page cannot use localhost or draft preview URLs.',
          severity: 'ERROR',
        });
      }
    }

    // 7. SKU / Offer ID validation (Section 10)
    if (!product.sku || !product.sku.trim()) {
      issues.push({
        field: 'sku',
        message: 'Product SKU is required for stable Merchant Center offer identity.',
        severity: 'ERROR',
      });
    }

    // 8. GTIN / MPN & Brand validation (Section 49)
    const hasGtin = Boolean(product.gtin && product.gtin.trim());
    const hasMpn = Boolean(product.mpn && product.mpn.trim());
    const hasBrand = Boolean(product.brandName && product.brandName.trim());

    if (!hasGtin && !(hasMpn && hasBrand)) {
      issues.push({
        field: 'identifiers',
        message: 'Recommended: provide GTIN, or both MPN and Brand name for standard merchant identification.',
        severity: 'WARNING',
      });
    }

    const hasErrors = issues.some((i) => i.severity === 'ERROR');

    return {
      status: hasErrors ? 'MISSING_REQUIRED_DATA' : 'READY',
      isEligible: !hasErrors,
      issues,
    };
  }
}
