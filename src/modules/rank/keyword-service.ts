import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { AuthorizedContext, AuthorizationService, Action } from '@/shared/authorization/policy';
import { logger } from '@/shared/observability/logger';

export interface KeywordDto {
  id: string;
  brandId: string;
  term: string;
  normalizedTerm: string;
  source: string;
  status: string;
  locale: string;
  country: string;
  createdAt: Date;
  updatedAt: Date;
  trackedStoresCount?: number;
}

export interface StoreKeywordDto {
  id: string;
  storeId: string;
  keywordId: string;
  term: string;
  normalizedTerm: string;
  trackingEnabled: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export class KeywordService {
  /**
   * Normalizes a keyword: trims leading/trailing spaces, collapses multiple
   * interior spaces, and lowercases for uniform indexing without semantic mutation.
   */
  public static normalizeKeyword(term: string): string {
    return term
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  /**
   * Adds or activates a brand keyword.
   */
  public static async addKeyword(
    tenantId: string,
    brandId: string,
    termOrParams: string | { term: string; source?: any; locale?: string; country?: string; tags?: string[] },
    optionsOrContext?: any,
    maybeContext?: AuthorizedContext
  ): Promise<KeywordDto> {
    let term: string;
    let source: any = 'MANUAL';
    let locale = 'en';
    let country = 'IN';
    let context: AuthorizedContext;

    if (typeof termOrParams === 'string') {
      term = termOrParams;
      if (optionsOrContext && ('role' in optionsOrContext || 'scopeMode' in optionsOrContext)) {
        context = optionsOrContext as AuthorizedContext;
      } else {
        source = optionsOrContext?.source ?? 'MANUAL';
        locale = optionsOrContext?.locale ?? 'en';
        country = optionsOrContext?.country ?? 'IN';
        context = maybeContext!;
      }
    } else {
      term = termOrParams.term;
      source = termOrParams.source ?? 'MANUAL';
      locale = termOrParams.locale ?? 'en';
      country = termOrParams.country ?? 'IN';
      context = optionsOrContext as AuthorizedContext;
    }

    AuthorizationService.assertCan(context, Action.DASHBOARD_VIEW);

    const cleanTerm = term.trim().replace(/\s+/g, ' ');
    if (cleanTerm.length < 2) {
      throw new Error('Keyword must be at least 2 characters long');
    }
    const normalizedTerm = this.normalizeKeyword(cleanTerm);
    const dbSource =
      source === 'GSC' || source === 'GSC_IMPORT'
        ? 'GSC_IMPORT'
        : source === 'GBP' || source === 'GBP_IMPORT'
        ? 'GBP_IMPORT'
        : 'MANUAL';

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // Brand must belong to this tenant
      const brand = await tx.brand.findFirst({
        where: { id: brandId, tenantId, isArchived: false },
        select: { id: true },
      });
      if (!brand) {
        throw new Error(`Brand ${brandId} not found`);
      }

      const keyword = await tx.keyword.upsert({
        where: {
          uq_keyword_tenant_brand_term: {
            tenantId,
            brandId,
            normalizedTerm,
          },
        },
        create: {
          tenantId,
          brandId,
          term: cleanTerm,
          normalizedTerm,
          source: dbSource,
          status: 'ACTIVE',
          locale,
          country,
        },
        update: {
          status: 'ACTIVE',
          updatedAt: new Date(),
        },
      });

      logger.info(
        { tenantId, brandId, keywordId: keyword.id, term: keyword.term },
        '[KeywordService] Upserted keyword'
      );

      return keyword;
    });
  }

  /**
   * Imports keywords discovered via Google Search Console queries.
   */
  public static async importFromGsc(
    tenantId: string,
    brandId: string,
    queriesOrPropertyId: string[] | string,
    optionsOrContext: { minClicks?: number; minImpressions?: number } | AuthorizedContext,
    maybeContext?: AuthorizedContext
  ): Promise<{ importedCount: number; keywords: KeywordDto[] }> {
    let context: AuthorizedContext;
    let queries: string[] = [];

    if (Array.isArray(queriesOrPropertyId)) {
      queries = queriesOrPropertyId;
      context = optionsOrContext as AuthorizedContext;
    } else {
      const propertyId = queriesOrPropertyId;
      const opts = (optionsOrContext || {}) as { minClicks?: number; minImpressions?: number };
      context = maybeContext!;
      const minClicks = opts.minClicks ?? 0;
      const minImpressions = opts.minImpressions ?? 0;

      const metrics = await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
        return tx.gscDailyQueryMetric.findMany({
          where: {
            tenantId,
            propertyId,
            clicks: { gte: minClicks },
            impressions: { gte: minImpressions },
          },
          include: { query: true },
          take: 100,
        });
      });
      queries = metrics.map((m: any) => m.query.query);
    }

    AuthorizationService.assertCan(context, Action.DASHBOARD_VIEW);

    const validQueries = queries
      .map((q) => q.trim())
      .filter((q) => q.length >= 2);

    const uniqueMap = new Map<string, string>();
    for (const q of validQueries) {
      const norm = this.normalizeKeyword(q);
      if (!uniqueMap.has(norm)) {
        uniqueMap.set(norm, q);
      }
    }

    const imported: KeywordDto[] = [];

    for (const [, originalTerm] of uniqueMap.entries()) {
      const kw = await this.addKeyword(
        tenantId,
        brandId,
        { term: originalTerm, source: 'GSC_IMPORT' },
        context
      );
      imported.push(kw);
    }

    return { importedCount: imported.length, keywords: imported };
  }

  /**
   * Imports keywords discovered via GBP search terms.
   */
  public static async importFromGbp(
    tenantId: string,
    brandId: string,
    termsOrLocationId: string[] | string,
    optionsOrContext: { minSearches?: number } | AuthorizedContext,
    maybeContext?: AuthorizedContext
  ): Promise<{ importedCount: number; keywords: KeywordDto[] }> {
    let context: AuthorizedContext;
    let terms: string[] = [];

    if (Array.isArray(termsOrLocationId)) {
      terms = termsOrLocationId;
      context = optionsOrContext as AuthorizedContext;
    } else {
      const locationId = termsOrLocationId;
      const opts = (optionsOrContext || {}) as { minSearches?: number };
      context = maybeContext!;
      const minSearches = opts.minSearches ?? 0;

      const metrics = await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
        return tx.gbpSearchTerm.findMany({
          where: {
            tenantId,
            locationId,
            impressions: { gte: minSearches },
          },
          select: { term: true },
          take: 100,
        });
      });
      terms = metrics.map((m: any) => m.term);
    }

    AuthorizationService.assertCan(context, Action.DASHBOARD_VIEW);

    const validTerms = terms
      .map((t) => t.trim())
      .filter((t) => t.length >= 2);

    const uniqueMap = new Map<string, string>();
    for (const t of validTerms) {
      const norm = this.normalizeKeyword(t);
      if (!uniqueMap.has(norm)) {
        uniqueMap.set(norm, t);
      }
    }

    const imported: KeywordDto[] = [];

    for (const [, originalTerm] of uniqueMap.entries()) {
      const kw = await this.addKeyword(
        tenantId,
        brandId,
        { term: originalTerm, source: 'GBP_IMPORT' },
        context
      );
      imported.push(kw);
    }

    return { importedCount: imported.length, keywords: imported };
  }

  /**
   * Assigns a Brand Keyword to a specific Store location for tracking.
   * Enforces strict cross-brand isolation: Store and Keyword MUST belong to same brand.
   */
  public static async assignToStore(
    tenantId: string,
    storeId: string,
    keywordId: string,
    options: { trackingEnabled?: boolean; priority?: number } = {},
    context: AuthorizedContext
  ): Promise<StoreKeywordDto> {
    AuthorizationService.assertCan(context, Action.DASHBOARD_VIEW);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // 1. Verify store exists and get its brandId
      const store = await tx.location.findFirst({
        where: { id: storeId, tenantId, isArchived: false },
        select: { id: true, brandId: true, name: true },
      });
      if (!store) {
        throw new Error(`Store ${storeId} not found`);
      }

      // 2. Verify keyword exists and check brand ownership
      const keyword = await tx.keyword.findFirst({
        where: { id: keywordId, tenantId },
        select: { id: true, brandId: true, term: true, normalizedTerm: true },
      });
      if (!keyword) {
        throw new Error(`Keyword ${keywordId} not found`);
      }

      // 3. Strict Cross-Brand Guard: Keyword from Brand A CANNOT be assigned to Store in Brand B
      if (keyword.brandId !== store.brandId) {
        throw new Error(
          `Cross-brand assignment prohibited: Keyword "${keyword.term}" (Brand: ${keyword.brandId}) ` +
            `cannot be assigned to Store "${store.name}" (Brand: ${store.brandId})`
        );
      }

      // 4. Upsert mapping
      const mapping = await tx.storeKeyword.upsert({
        where: {
          uq_store_keyword: {
            tenantId,
            storeId,
            keywordId,
          },
        },
        create: {
          tenantId,
          storeId,
          keywordId,
          trackingEnabled: options.trackingEnabled ?? true,
          priority: options.priority ?? 1,
        },
        update: {
          trackingEnabled: options.trackingEnabled ?? true,
          priority: options.priority ?? 1,
          updatedAt: new Date(),
        },
      });

      return {
        id: mapping.id,
        storeId: mapping.storeId,
        keywordId: mapping.keywordId,
        term: keyword.term,
        normalizedTerm: keyword.normalizedTerm,
        trackingEnabled: mapping.trackingEnabled,
        priority: mapping.priority,
        createdAt: mapping.createdAt,
        updatedAt: mapping.updatedAt,
      };
    });
  }

  /**
   * Toggles tracking status for a StoreKeyword mapping.
   */
  public static async toggleStoreKeywordTracking(
    tenantId: string,
    storeKeywordId: string,
    enabled: boolean,
    context: AuthorizedContext
  ): Promise<void> {
    AuthorizationService.assertCan(context, Action.DASHBOARD_VIEW);

    await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      await tx.storeKeyword.update({
        where: { id: storeKeywordId },
        data: {
          trackingEnabled: enabled,
          updatedAt: new Date(),
        },
      });
    });
  }

  /**
   * Sets keyword status (ACTIVE vs PAUSED). Paused keywords are excluded from scheduled scans.
   */
  public static async setKeywordStatus(
    tenantId: string,
    keywordId: string,
    status: 'ACTIVE' | 'PAUSED',
    context: AuthorizedContext
  ): Promise<void> {
    AuthorizationService.assertCan(context, Action.DASHBOARD_VIEW);

    await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      await tx.keyword.update({
        where: { id: keywordId },
        data: {
          status,
          updatedAt: new Date(),
        },
      });
    });
  }

  /**
   * Lists keywords for a brand with store mapping counts.
   */
  public static async listBrandKeywords(
    tenantId: string,
    brandId: string,
    optionsOrContext?: any,
    maybeContext?: AuthorizedContext
  ): Promise<{ items: KeywordDto[]; total: number }> {
    let context: AuthorizedContext;
    let options: { status?: string; search?: string; page?: number; limit?: number } = {};

    if (optionsOrContext && ('role' in optionsOrContext || 'scopeMode' in optionsOrContext)) {
      context = optionsOrContext as AuthorizedContext;
    } else {
      options = optionsOrContext || {};
      context = maybeContext!;
    }

    AuthorizationService.assertCan(context, Action.DASHBOARD_VIEW);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const brand = await tx.brand.findFirst({
        where: { id: brandId, tenantId, isArchived: false },
        select: { id: true },
      });
      if (!brand) throw new Error(`Brand ${brandId} not found`);

      const where: any = { tenantId, brandId };
      if (options.status) where.status = options.status;
      if (options.search) {
        where.term = { contains: options.search, mode: 'insensitive' };
      }

      const total = await tx.keyword.count({ where });

      const page = Math.max(1, options.page ?? 1);
      const limit = Math.max(1, options.limit ?? 50);
      const skip = (page - 1) * limit;

      const keywords = await tx.keyword.findMany({
        where,
        include: {
          _count: {
            select: { storeKeywords: true },
          },
        },
        orderBy: [{ status: 'asc' }, { term: 'asc' }],
        skip,
        take: limit,
      });

      const items = keywords.map((kw) => ({
        id: kw.id,
        brandId: kw.brandId,
        term: kw.term,
        normalizedTerm: kw.normalizedTerm,
        source: kw.source,
        status: kw.status,
        locale: kw.locale,
        country: kw.country,
        createdAt: kw.createdAt,
        updatedAt: kw.updatedAt,
        trackedStoresCount: kw._count.storeKeywords,
      }));

      return { items, total };
    });
  }

  /**
   * Lists keywords tracked by a specific store.
   */
  public static async listStoreKeywords(
    tenantId: string,
    storeId: string,
    context: AuthorizedContext
  ): Promise<StoreKeywordDto[]> {
    AuthorizationService.assertCan(context, Action.DASHBOARD_VIEW);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const store = await tx.location.findFirst({
        where: { id: storeId, tenantId, isArchived: false },
        select: { id: true },
      });
      if (!store) throw new Error(`Store ${storeId} not found`);

      const mappings = await tx.storeKeyword.findMany({
        where: { tenantId, storeId },
        include: {
          keyword: {
            select: { term: true, normalizedTerm: true, status: true },
          },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      });

      return mappings.map((m) => ({
        id: m.id,
        storeId: m.storeId,
        keywordId: m.keywordId,
        term: m.keyword.term,
        normalizedTerm: m.keyword.normalizedTerm,
        trackingEnabled: m.trackingEnabled && m.keyword.status === 'ACTIVE',
        priority: m.priority,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      }));
    });
  }
}
