/**
 * Phase 10: Page Coverage Service
 * Evaluates whether an existing landing page, store page, or category page exists
 * for a given search demand keyword, store, or product entity.
 */

import { prisma } from '@/shared/database/client';
import { Prisma } from '@prisma/client';

export interface PageCoverageResult {
  hasCoverage: boolean;
  coverageType: 'EXACT_STORE' | 'EXACT_CATEGORY' | 'EXACT_PRODUCT' | 'CITY_PAGE' | 'TOPICAL_MATCH' | 'NONE';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  bestMatchingPageId?: string | null;
  bestMatchingPageSlug?: string | null;
  matchingPagesCount: number;
}

export class PageCoverageService {
  /**
   * Evaluates coverage across published pages for a brand, considering
   * store, category, product, or keyword context.
   */
  public static async evaluateCoverage(
    tenantId: string,
    brandId: string,
    params: {
      keywordTerm?: string | undefined;
      storeId?: string | null | undefined;
      categoryId?: string | null | undefined;
      productId?: string | null | undefined;
      city?: string | null | undefined;
    },
    db: Prisma.TransactionClient | typeof prisma = prisma
  ): Promise<PageCoverageResult> {
    // 1. Check direct entity relationship matches (highest precision)
    if (params.storeId) {
      const storePage = await db.page.findFirst({
        where: {
          tenantId,
          brandId,
          storeId: params.storeId,
          status: 'PUBLISHED',
        },
      });

      if (storePage) {
        return {
          hasCoverage: true,
          coverageType: 'EXACT_STORE',
          confidence: 'HIGH',
          bestMatchingPageId: storePage.id,
          bestMatchingPageSlug: storePage.slug,
          matchingPagesCount: 1,
        };
      }
    }

    if (params.productId) {
      const productPage = await db.page.findFirst({
        where: {
          tenantId,
          brandId,
          productId: params.productId,
          status: 'PUBLISHED',
        },
      });

      if (productPage) {
        return {
          hasCoverage: true,
          coverageType: 'EXACT_PRODUCT',
          confidence: 'HIGH',
          bestMatchingPageId: productPage.id,
          bestMatchingPageSlug: productPage.slug,
          matchingPagesCount: 1,
        };
      }
    }

    if (params.categoryId) {
      const categoryPage = await db.page.findFirst({
        where: {
          tenantId,
          brandId,
          categoryId: params.categoryId,
          status: 'PUBLISHED',
        },
      });

      if (categoryPage) {
        return {
          hasCoverage: true,
          coverageType: 'EXACT_CATEGORY',
          confidence: 'HIGH',
          bestMatchingPageId: categoryPage.id,
          bestMatchingPageSlug: categoryPage.slug,
          matchingPagesCount: 1,
        };
      }
    }

    // 2. City-level coverage if city is specified
    if (params.city) {
      const normalizedCity = params.city.trim().toLowerCase().replace(/\s+/g, '-');
      const cityPage = await db.page.findFirst({
        where: {
          tenantId,
          brandId,
          citySlug: normalizedCity,
          status: 'PUBLISHED',
        },
      });

      if (cityPage) {
        return {
          hasCoverage: true,
          coverageType: 'CITY_PAGE',
          confidence: 'MEDIUM',
          bestMatchingPageId: cityPage.id,
          bestMatchingPageSlug: cityPage.slug,
          matchingPagesCount: 1,
        };
      }
    }

    // 3. Keyword / topical slug match
    if (params.keywordTerm) {
      const normalizedTermSlug = params.keywordTerm
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      // Check if any published page slug contains the core tokens
      const candidatePages = await db.page.findMany({
        where: {
          tenantId,
          brandId,
          status: 'PUBLISHED',
          slug: {
            contains: normalizedTermSlug,
            mode: 'insensitive',
          },
        },
        take: 3,
      });

      const firstCandidate = candidatePages[0];
      if (firstCandidate) {
        return {
          hasCoverage: true,
          coverageType: 'TOPICAL_MATCH',
          confidence: 'MEDIUM',
          bestMatchingPageId: firstCandidate.id,
          bestMatchingPageSlug: firstCandidate.slug,
          matchingPagesCount: candidatePages.length,
        };
      }
    }

    return {
      hasCoverage: false,
      coverageType: 'NONE',
      confidence: 'HIGH',
      bestMatchingPageId: null,
      bestMatchingPageSlug: null,
      matchingPagesCount: 0,
    };
  }
}
