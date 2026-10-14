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

export interface AssignedStoreInfoDto {
  id: string;
  name: string;
  city: string | null;
}

export interface KeywordPerformanceItemDto {
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
  trackedStoresCount: number;
  assignedStores: AssignedStoreInfoDto[];
  // Rank metrics (from local geo-grid engine)
  latestRank: number | null;
  previousRank: number | null;
  rankDelta: number | null; // previousRank - latestRank (positive = improvement)
  rankMovement: 'IMPROVED' | 'DECLINED' | 'UNCHANGED' | 'NEW' | 'UNRANKED';
  top3Coverage: number | null;
  top10Coverage: number | null;
  shareOfVoice: number | null;
  lastCheckedAt: Date | null;
  // Search Console metrics (from Google Search Console)
  gscClicks: number;
  gscImpressions: number;
  gscCtr: number;
  gscAvgPosition: number | null;
  hasGscData: boolean;
}

export interface SeoPerformanceSummaryDto {
  totalTrackedKeywords: number;
  activeKeywordsCount: number;
  pausedKeywordsCount: number;
  keywordsWithRankData: number;
  improvedCount: number;
  declinedCount: number;
  unchangedCount: number;
  top3Count: number;
  top10Count: number;
  top20Count: number;
  beyond20Count: number;
  totalGscClicks: number;
  totalGscImpressions: number;
  averageGscCtr: number;
  averageGscPosition: number | null;
  lastScanTime: Date | null;
  lastSyncTime: Date | null;
}

export interface KeywordPerformanceOverviewOptions {
  status?: string;
  search?: string;
  source?: string;
  movement?: 'IMPROVED' | 'DECLINED' | 'UNCHANGED' | 'NEW' | 'UNRANKED' | 'ALL';
  storeId?: string;
  days?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface KeywordPerformanceResultDto {
  summary: SeoPerformanceSummaryDto;
  items: KeywordPerformanceItemDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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
    termOrParams: string | { term: string; source?: string; locale?: string; country?: string; tags?: string[] },
    optionsOrContext?: { source?: string; locale?: string; country?: string; tags?: string[] } | AuthorizedContext,
    maybeContext?: AuthorizedContext
  ): Promise<KeywordDto> {
    let term: string;
    let source = 'MANUAL';
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
      queries = metrics.map((m) => m.query?.queryText || '');
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
      terms = metrics.map((m) => m.term);
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
  ): Promise<KeywordDto> {
    AuthorizationService.assertCan(context, Action.DASHBOARD_VIEW);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const updated = await tx.keyword.update({
        where: { id: keywordId },
        data: {
          status,
          updatedAt: new Date(),
        },
      });
      return updated;
    });
  }

  /**
   * Lists keywords for a brand with store mapping counts.
   */
  public static async listBrandKeywords(
    tenantId: string,
    brandId: string,
    optionsOrContext?: { status?: string; search?: string; page?: number; limit?: number } | AuthorizedContext,
    maybeContext?: AuthorizedContext
  ): Promise<{ items: KeywordDto[]; total: number }> {
    let context: AuthorizedContext;
    let options: { status?: string; search?: string; page?: number; limit?: number } = {};

    if (optionsOrContext && ('role' in optionsOrContext || 'scopeMode' in optionsOrContext)) {
      context = optionsOrContext as AuthorizedContext;
    } else {
      options = (optionsOrContext as { status?: string; search?: string; page?: number; limit?: number }) || {};
      context = maybeContext!;
    }

    AuthorizationService.assertCan(context, Action.DASHBOARD_VIEW);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const brand = await tx.brand.findFirst({
        where: { id: brandId, tenantId, isArchived: false },
        select: { id: true },
      });
      if (!brand) throw new Error(`Brand ${brandId} not found`);

      const where: { tenantId: string; brandId: string; status?: string; term?: { contains: string; mode: 'insensitive' } } = { tenantId, brandId };
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

  /**
   * Deletes a keyword and cascades to associated store mappings and rank records.
   */
  public static async deleteKeyword(
    tenantId: string,
    keywordId: string,
    context: AuthorizedContext
  ): Promise<{ success: boolean; id: string }> {
    AuthorizationService.assertCan(context, Action.DASHBOARD_VIEW);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const keyword = await tx.keyword.findFirst({
        where: { id: keywordId, tenantId },
        select: { id: true, term: true, brandId: true },
      });
      if (!keyword) {
        throw new Error(`Keyword ${keywordId} not found`);
      }

      await tx.keyword.delete({
        where: { id: keywordId },
      });

      logger.info(
        { tenantId, keywordId, term: keyword.term, brandId: keyword.brandId },
        '[KeywordService] Deleted keyword'
      );

      return { success: true, id: keywordId };
    });
  }

  /**
   * Comprehensive Keyword Performance Overview combining local geo-grid rank telemetry
   * and Google Search Console performance with safe zero-handling, deterministic movement
   * calculations, and rich brand-level SEO summary KPIs.
   */
  public static async getKeywordPerformanceOverview(
    tenantId: string,
    brandId: string,
    options: KeywordPerformanceOverviewOptions = {},
    context: AuthorizedContext
  ): Promise<KeywordPerformanceResultDto> {
    AuthorizationService.assertCan(context, Action.DASHBOARD_VIEW);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // 1. Verify brand ownership
      const brand = await tx.brand.findFirst({
        where: { id: brandId, tenantId, isArchived: false },
        select: { id: true, name: true },
      });
      if (!brand) throw new Error(`Brand ${brandId} not found`);

      // 2. Resolve date boundaries
      const days = options.days ? Math.max(1, options.days) : 30;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // 3. Resolve brand-scoped GSC property
      const mappings = await tx.internalResourceMapping.findMany({
        where: {
          tenantId,
          status: 'ACTIVE',
          OR: [{ internalId: brandId }, { brandId }],
          resource: { provider: 'GOOGLE_SEARCH_CONSOLE' },
        },
        select: { resourceId: true },
      });
      const gscResourceIds = mappings.map((m) => m.resourceId);

      let brandGscPropertyId: string | null = null;
      if (gscResourceIds.length > 0) {
        const prop = await tx.gscProperty.findFirst({
          where: { tenantId, resourceId: { in: gscResourceIds } },
          select: { id: true },
        });
        brandGscPropertyId = prop?.id || null;
      }

      // 4. Pre-fetch GSC query metrics by normalized keyword
      const gscMetricsByTerm = new Map<
        string,
        { clicks: number; impressions: number; sumPos: number; lastDate: Date | null }
      >();
      let lastGscSyncTime: Date | null = null;

      if (brandGscPropertyId) {
        const gscQueries = await tx.gscQuery.findMany({
          where: { tenantId, propertyId: brandGscPropertyId },
          include: {
            dailyMetrics: {
              where: {
                date: { gte: startDate },
              },
              select: {
                date: true,
                clicks: true,
                impressions: true,
                sumPositionImpressions: true,
              },
            },
          },
        });

        for (const q of gscQueries) {
          const norm = this.normalizeKeyword(q.queryText);
          let clicks = 0;
          let impressions = 0;
          let sumPos = 0;
          let latestMetricDate: Date | null = null;

          for (const dm of q.dailyMetrics) {
            clicks += dm.clicks;
            impressions += dm.impressions;
            sumPos += dm.sumPositionImpressions;
            if (!latestMetricDate || dm.date > latestMetricDate) {
              latestMetricDate = dm.date;
            }
            if (!lastGscSyncTime || dm.date > lastGscSyncTime) {
              lastGscSyncTime = dm.date;
            }
          }

          const existing = gscMetricsByTerm.get(norm) || {
            clicks: 0,
            impressions: 0,
            sumPos: 0,
            lastDate: null,
          };
          gscMetricsByTerm.set(norm, {
            clicks: existing.clicks + clicks,
            impressions: existing.impressions + impressions,
            sumPos: existing.sumPos + sumPos,
            lastDate:
              latestMetricDate && (!existing.lastDate || latestMetricDate > existing.lastDate)
                ? latestMetricDate
                : existing.lastDate,
          });
        }
      }

      // 5. Fetch all brand keywords with store assignments
      const keywords = await tx.keyword.findMany({
        where: { tenantId, brandId },
        include: {
          storeKeywords: {
            where: options.storeId ? { storeId: options.storeId } : undefined,
            include: {
              store: {
                select: { id: true, name: true, city: true },
              },
            },
          },
        },
        orderBy: [{ status: 'asc' }, { term: 'asc' }],
      });

      // Filter by store if requested
      const eligibleKeywords = options.storeId
        ? keywords.filter((k) => k.storeKeywords.length > 0)
        : keywords;

      // 6. Fetch latest completed rank runs for these keywords
      const rankRuns = await tx.rankRun.findMany({
        where: {
          tenantId,
          brandId,
          storeId: options.storeId || undefined,
          status: { in: ['SUCCESS', 'COMPLETED', 'PARTIAL'] },
        },
        orderBy: { scheduledDate: 'desc' },
        include: {
          summary: true,
        },
        take: 2000,
      });

      // Group runs by keywordId
      const runsByKeyword = new Map<string, Array<typeof rankRuns[0]>>();
      let lastScanTime: Date | null = null;

      for (const run of rankRuns) {
        if (!lastScanTime || (run.completedAt && run.completedAt > lastScanTime)) {
          lastScanTime = run.completedAt;
        }
        const list = runsByKeyword.get(run.keywordId) || [];
        if (list.length < 2) {
          list.push(run);
          runsByKeyword.set(run.keywordId, list);
        }
      }

      // 7. Aggregate performance rows and calculate SEO Summary KPIs
      const allItems: KeywordPerformanceItemDto[] = [];
      let totalGscClicks = 0;
      let totalGscImpressions = 0;
      let totalGscSumPos = 0;
      let improvedCount = 0;
      let declinedCount = 0;
      let unchangedCount = 0;
      let top3Count = 0;
      let top10Count = 0;
      let top20Count = 0;
      let beyond20Count = 0;
      let keywordsWithRankData = 0;

      for (const kw of eligibleKeywords) {
        const runs = runsByKeyword.get(kw.id) || [];
        const latestRun = runs[0];
        const prevRun = runs[1];

        const latestRank = latestRun?.summary?.averageFoundRank ?? null;
        const prevRank = prevRun?.summary?.averageFoundRank ?? null;

        let rankDelta: number | null = null;
        let rankMovement: 'IMPROVED' | 'DECLINED' | 'UNCHANGED' | 'NEW' | 'UNRANKED' = 'UNRANKED';

        if (latestRank !== null) {
          keywordsWithRankData++;
          if (latestRank <= 3) top3Count++;
          else if (latestRank <= 10) top10Count++;
          else if (latestRank <= 20) top20Count++;
          else beyond20Count++;

          if (prevRank !== null) {
            // Rank 1 is better than Rank 10: improvement = previousRank - latestRank > 0
            const diff = prevRank - latestRank;
            rankDelta = Math.round(diff * 10) / 10;
            if (diff > 0.05) {
              rankMovement = 'IMPROVED';
              improvedCount++;
            } else if (diff < -0.05) {
              rankMovement = 'DECLINED';
              declinedCount++;
            } else {
              rankMovement = 'UNCHANGED';
              unchangedCount++;
            }
          } else {
            rankMovement = 'NEW';
          }
        }

        // GSC lookup
        const gsc = gscMetricsByTerm.get(kw.normalizedTerm) || {
          clicks: 0,
          impressions: 0,
          sumPos: 0,
          lastDate: null,
        };
        totalGscClicks += gsc.clicks;
        totalGscImpressions += gsc.impressions;
        totalGscSumPos += gsc.sumPos;

        const gscCtr =
          gsc.impressions > 0 ? Math.round((gsc.clicks / gsc.impressions) * 10000) / 100 : 0;
        const gscAvgPosition =
          gsc.impressions > 0 ? Math.round((gsc.sumPos / gsc.impressions) * 10) / 10 : null;

        allItems.push({
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
          trackedStoresCount: kw.storeKeywords.length,
          assignedStores: kw.storeKeywords.map((sk) => ({
            id: sk.store.id,
            name: sk.store.name,
            city: sk.store.city,
          })),
          latestRank,
          previousRank: prevRank,
          rankDelta,
          rankMovement,
          top3Coverage: latestRun?.summary?.top3Coverage ?? null,
          top10Coverage: latestRun?.summary?.top10Coverage ?? null,
          shareOfVoice: latestRun?.summary?.shareOfVoice ?? null,
          lastCheckedAt: latestRun?.completedAt ?? null,
          gscClicks: gsc.clicks,
          gscImpressions: gsc.impressions,
          gscCtr,
          gscAvgPosition,
          hasGscData: gsc.impressions > 0 || gsc.clicks > 0,
        });
      }

      // 8. Assemble SEO performance summary KPIs
      const summary: SeoPerformanceSummaryDto = {
        totalTrackedKeywords: eligibleKeywords.length,
        activeKeywordsCount: eligibleKeywords.filter((k) => k.status === 'ACTIVE').length,
        pausedKeywordsCount: eligibleKeywords.filter((k) => k.status === 'PAUSED').length,
        keywordsWithRankData,
        improvedCount,
        declinedCount,
        unchangedCount,
        top3Count,
        top10Count,
        top20Count,
        beyond20Count,
        totalGscClicks,
        totalGscImpressions,
        averageGscCtr:
          totalGscImpressions > 0
            ? Math.round((totalGscClicks / totalGscImpressions) * 10000) / 100
            : 0,
        averageGscPosition:
          totalGscImpressions > 0
            ? Math.round((totalGscSumPos / totalGscImpressions) * 10) / 10
            : null,
        lastScanTime,
        lastSyncTime: lastGscSyncTime,
      };

      // 9. Filter items
      let filtered = allItems;
      if (options.search) {
        const q = options.search.toLowerCase().trim();
        filtered = filtered.filter((i) => i.term.toLowerCase().includes(q));
      }
      if (options.source && options.source !== 'ALL') {
        filtered = filtered.filter((i) => i.source === options.source);
      }
      if (options.status && options.status !== 'ALL') {
        filtered = filtered.filter((i) => i.status === options.status);
      }
      if (options.movement && options.movement !== 'ALL') {
        filtered = filtered.filter((i) => i.rankMovement === options.movement);
      }

      // 10. Sort items
      const sortBy = options.sortBy || 'term';
      const sortDir = options.sortDir === 'desc' ? -1 : 1;

      filtered.sort((a, b) => {
        switch (sortBy) {
          case 'latestRank': {
            const valA = a.latestRank !== null ? a.latestRank : 9999;
            const valB = b.latestRank !== null ? b.latestRank : 9999;
            return (valA - valB) * sortDir;
          }
          case 'rankDelta': {
            const valA = a.rankDelta !== null ? a.rankDelta : -9999;
            const valB = b.rankDelta !== null ? b.rankDelta : -9999;
            return (valA - valB) * sortDir;
          }
          case 'gscClicks':
            return (a.gscClicks - b.gscClicks) * sortDir;
          case 'gscImpressions':
            return (a.gscImpressions - b.gscImpressions) * sortDir;
          case 'gscCtr':
            return (a.gscCtr - b.gscCtr) * sortDir;
          case 'gscAvgPosition': {
            const valA = a.gscAvgPosition !== null ? a.gscAvgPosition : 9999;
            const valB = b.gscAvgPosition !== null ? b.gscAvgPosition : 9999;
            return (valA - valB) * sortDir;
          }
          case 'lastCheckedAt': {
            const valA = a.lastCheckedAt ? new Date(a.lastCheckedAt).getTime() : 0;
            const valB = b.lastCheckedAt ? new Date(b.lastCheckedAt).getTime() : 0;
            return (valA - valB) * sortDir;
          }
          case 'createdAt': {
            const valA = new Date(a.createdAt).getTime();
            const valB = new Date(b.createdAt).getTime();
            return (valA - valB) * sortDir;
          }
          case 'term':
          default:
            return a.term.localeCompare(b.term) * sortDir;
        }
      });

      // 11. Pagination
      const page = Math.max(1, options.page ?? 1);
      const limit = Math.max(1, options.limit ?? 25);
      const total = filtered.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const paginatedItems = filtered.slice((page - 1) * limit, page * limit);

      return {
        summary,
        items: paginatedItems,
        total,
        page,
        limit,
        totalPages,
      };
    });
  }
}
