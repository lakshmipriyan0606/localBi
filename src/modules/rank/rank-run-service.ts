import crypto from 'node:crypto';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { AuthorizedContext, AuthorizationService, Action } from '@/shared/authorization/policy';
import { Prisma } from '@prisma/client';
import { logger } from '@/shared/observability/logger';
import { GeoGridService } from './geo-grid-service';
import { RankProviderRegistry, PointObservationResult, CompetitorObservation } from './rank-provider';
import { CompetitorService } from './competitor-service';

export interface RankRunDto {
  id: string;
  storeId: string;
  keywordId: string;
  gridConfigId: string;
  provider: string;
  status: string;
  businessKey: string;
  scheduledDate: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: Date;
  summary?: RankRunSummaryDto | null;
  observations?: PointObservationDto[];
}

export interface RankRunSummaryDto {
  totalPoints: number;
  validCheckedPoints: number;
  foundPoints: number;
  top3Count: number;
  top10Count: number;
  averageFoundRank: number | null;
  top3Coverage: number;
  top10Coverage: number;
  shareOfVoice: number;
}

export interface PointObservationDto {
  pointIndex: number;
  row: number;
  col: number;
  latitude: number;
  longitude: number;
  distanceKm: number;
  rank: number | null;
  found: boolean;
  checkedDepth: number;
  topCompetitors?: Array<{ position: number; name: string; externalPlaceId?: string | null }>;
}

export interface StoreRankDashboardDto {
  storeId: string;
  storeName: string;
  trackedKeywordsCount: number;
  averageFoundRank: number | null;
  top3Coverage: number;
  top10Coverage: number;
  averageShareOfVoice: number;
  keywordRows: Array<{
    keywordId: string;
    term: string;
    latestRank: number | null;
    top3Coverage: number;
    top10Coverage: number;
    averageFoundRank: number | null;
    shareOfVoice: number;
    lastCheckedAt: Date | null;
    status: string;
  }>;
}

export interface BrandRankDashboardDto {
  brandId: string;
  brandName: string;
  totalStores: number;
  totalTrackedKeywords: number;
  brandAverageFoundRank: number | null;
  brandTop3Coverage: number;
  brandTop10Coverage: number;
  storeRows: Array<{
    storeId: string;
    storeName: string;
    city: string;
    trackedKeywordsCount: number;
    averageFoundRank: number | null;
    top3Coverage: number;
    top10Coverage: number;
    shareOfVoice: number;
  }>;
}

export class RankRunService {
  /**
   * Computes the summary metrics for a set of point observations.
   * Exposes transparent formulas (no arbitrary "LocalBi Score"):
   * - averageFoundRank: sum(found ranks) / count(found). null if none found.
   * - top3Coverage: (count(rank <= 3) / validCheckedPoints) * 100.
   * - top10Coverage: (count(rank <= 10) / validCheckedPoints) * 100.
   * - shareOfVoice: position-weighted visibility across checked points (0-100).
   */
  public static computeSummary(
    observations: PointObservationResult[],
    totalPoints: number
  ): RankRunSummaryDto {
    const validPoints = observations.length;
    if (validPoints === 0) {
      return {
        totalPoints,
        validCheckedPoints: 0,
        foundPoints: 0,
        top3Count: 0,
        top10Count: 0,
        averageFoundRank: null,
        top3Coverage: 0,
        top10Coverage: 0,
        shareOfVoice: 0,
      };
    }

    let foundPoints = 0;
    let rankSum = 0;
    let top3Count = 0;
    let top10Count = 0;
    let weightedScoreSum = 0;

    for (const obs of observations) {
      if (obs.found && obs.rank != null && obs.rank > 0) {
        foundPoints++;
        rankSum += obs.rank;

        if (obs.rank <= 3) top3Count++;
        if (obs.rank <= 10) top10Count++;

        // Position weight: rank 1 = 20 pts, rank 2 = 19 pts, ..., rank 20 = 1 pt
        const weight = Math.max(0, 21 - obs.rank);
        weightedScoreSum += weight;
      }
    }

    const averageFoundRank =
      foundPoints > 0 ? Math.round((rankSum / foundPoints) * 10) / 10 : null;

    const top3Coverage = Math.round((top3Count / validPoints) * 1000) / 10;
    const top10Coverage = Math.round((top10Count / validPoints) * 1000) / 10;

    // Max possible weighted score is 20 * validPoints
    const maxScore = validPoints * 20;
    const shareOfVoice =
      maxScore > 0 ? Math.round((weightedScoreSum / maxScore) * 1000) / 10 : 0;

    return {
      totalPoints,
      validCheckedPoints: validPoints,
      foundPoints,
      top3Count,
      top10Count,
      averageFoundRank,
      top3Coverage,
      top10Coverage,
      shareOfVoice,
    };
  }

  /**
   * Triggers a rank run for a Store + Keyword combination.
   * Enforces:
   * 1. Store is active (not closed or archived)
   * 2. Keyword is active (not paused)
   * 3. Cross-brand ownership match
   * 4. Idempotency on (tenant, store, keyword, gridConfig, scheduledDate)
   */
  public static async triggerRankRun(
    tenantId: string,
    storeId: string,
    keywordId: string,
    options: {
      gridSize?: number;
      radiusKm?: number;
      force?: boolean;
    } = {},
    context: AuthorizedContext
  ): Promise<RankRunDto> {
    AuthorizationService.assertCan(context, Action.DASHBOARD_VIEW);

    const now = new Date();
    const scheduledDateStr = now.toISOString().split('T')[0]!;
    const scheduledDate = new Date(`${scheduledDateStr}T00:00:00.000Z`);

    // 1. Get or create grid configuration (validates coordinates)
    const gridOptions: { gridSize?: number; radiusKm?: number } = {};
    if (options.gridSize !== undefined) gridOptions.gridSize = options.gridSize;
    if (options.radiusKm !== undefined) gridOptions.radiusKm = options.radiusKm;

    const { config, points } = await GeoGridService.getOrCreateGridConfig(
      tenantId,
      storeId,
      gridOptions,
      context
    );

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // 2. Validate Store active status
      const store = await tx.location.findFirst({
        where: { id: storeId, tenantId, isArchived: false },
        select: {
          id: true,
          brandId: true,
          name: true,
          storeCode: true,
          googlePlaceId: true,
          addressLine1: true,
          city: true,
          isClosed: true,
        },
      });
      if (!store) throw new Error(`Store ${storeId} not found`);
      if (store.isClosed) {
        throw new Error(`Cannot run rank check for closed store "${store.name}"`);
      }

      // 3. Validate Keyword active status & Brand match
      const keyword = await tx.keyword.findFirst({
        where: { id: keywordId, tenantId },
        select: { id: true, brandId: true, term: true, status: true },
      });
      if (!keyword) throw new Error(`Keyword ${keywordId} not found`);
      if (keyword.brandId !== store.brandId) {
        throw new Error('Store and Keyword belong to different brands');
      }
      if (keyword.status === 'PAUSED') {
        throw new Error(`Cannot run rank check for paused keyword "${keyword.term}"`);
      }

      // 3b. Ensure StoreKeyword mapping is active for tracking
      await tx.storeKeyword.upsert({
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
          trackingEnabled: true,
        },
        update: {
          trackingEnabled: true,
          updatedAt: new Date(),
        },
      });

      // 4. Deterministic businessKey for idempotency
      const businessKey = options.force
        ? `${tenantId}:${storeId}:${keywordId}:${config.id}:${scheduledDateStr}:force:${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
        : `${tenantId}:${storeId}:${keywordId}:${config.id}:${scheduledDateStr}`;

      const existing = await tx.rankRun.findUnique({
        where: {
          uq_rank_run_business_key: {
            tenantId,
            businessKey,
          },
        },
        include: { summary: true },
      });

      if (existing && !options.force) {
        logger.info(
          { tenantId, storeId, keywordId, businessKey, status: existing.status },
          '[RankRunService] Returning existing rank run (idempotency hit)'
        );
        return {
          id: existing.id,
          storeId: existing.storeId,
          keywordId: existing.keywordId,
          gridConfigId: existing.gridConfigId,
          provider: existing.provider,
          status: existing.status,
          businessKey: existing.businessKey,
          scheduledDate: existing.scheduledDate,
          startedAt: existing.startedAt,
          completedAt: existing.completedAt,
          errorCode: existing.errorCode,
          errorMessage: existing.errorMessage,
          createdAt: existing.createdAt,
          summary: existing.summary,
        };
      }

      // 5. Create new RankRun
      const rankRun = await tx.rankRun.upsert({
        where: {
          uq_rank_run_business_key: {
            tenantId,
            businessKey,
          },
        },
        create: {
          tenantId,
          brandId: store.brandId,
          storeId,
          keywordId,
          gridConfigId: config.id,
          provider: RankProviderRegistry.getProvider().name,
          status: 'RUNNING',
          businessKey,
          scheduledDate,
          startedAt: new Date(),
        },
        update: {
          status: 'RUNNING',
          startedAt: new Date(),
          completedAt: null,
          errorCode: null,
          errorMessage: null,
        },
      });

      // 6. Execute Provider Scan
      const provider = RankProviderRegistry.getProvider();
      const queryResult = await provider.checkGrid({
        keyword: keyword.term,
        points,
        targetBusiness: {
          name: store.name,
          placeId: store.googlePlaceId,
          storeCode: store.storeCode,
          address: `${store.addressLine1}, ${store.city}`,
        },
      });

      // 7. Record Observations in DB
      if (queryResult.observations.length > 0) {
        // Clear previous observations if this is a forced rerun
        await tx.rankObservation.deleteMany({
          where: { tenantId, rankRunId: rankRun.id },
        });

        // Insert observations
        for (const obs of queryResult.observations) {
          await tx.rankObservation.create({
            data: {
              tenantId,
              rankRunId: rankRun.id,
              pointIndex: obs.pointIndex,
              gridRow: obs.row,
              gridCol: obs.col,
              latitude: obs.latitude,
              longitude: obs.longitude,
              distanceKm: obs.distanceKm,
              rank: obs.rank,
              found: obs.found,
              checkedDepth: obs.checkedDepth,
              resultType: obs.resultType,
              topCompetitors: obs.topCompetitors as unknown as Prisma.InputJsonValue,
              observedAt: queryResult.observedAt,
            },
          });

          // Ingest competitors observed at this point
          if (obs.topCompetitors && obs.topCompetitors.length > 0) {
            await CompetitorService.recordCompetitors(
              tx,
              tenantId,
              storeId,
              obs.topCompetitors as CompetitorObservation[]
            );
          }
        }
      }

      // 8. Compute and persist summary
      const summaryMetrics = this.computeSummary(
        queryResult.observations,
        points.length
      );

      const finalStatus =
        queryResult.status === 'COMPLETED'
          ? 'COMPLETED'
          : queryResult.status === 'PARTIAL'
          ? 'PARTIAL'
          : 'FAILED';

      const updatedRun = await tx.rankRun.update({
        where: { id: rankRun.id },
        data: {
          status: finalStatus,
          completedAt: new Date(),
          errorCode: queryResult.errorCode ?? null,
          errorMessage: queryResult.errorMessage ?? null,
        },
      });

      const summary = await tx.rankRunSummary.upsert({
        where: { rankRunId: rankRun.id },
        create: {
          tenantId,
          rankRunId: rankRun.id,
          storeId,
          keywordId,
          totalPoints: summaryMetrics.totalPoints,
          validCheckedPoints: summaryMetrics.validCheckedPoints,
          foundPoints: summaryMetrics.foundPoints,
          top3Count: summaryMetrics.top3Count,
          top10Count: summaryMetrics.top10Count,
          averageFoundRank: summaryMetrics.averageFoundRank,
          top3Coverage: summaryMetrics.top3Coverage,
          top10Coverage: summaryMetrics.top10Coverage,
          shareOfVoice: summaryMetrics.shareOfVoice,
        },
        update: {
          totalPoints: summaryMetrics.totalPoints,
          validCheckedPoints: summaryMetrics.validCheckedPoints,
          foundPoints: summaryMetrics.foundPoints,
          top3Count: summaryMetrics.top3Count,
          top10Count: summaryMetrics.top10Count,
          averageFoundRank: summaryMetrics.averageFoundRank,
          top3Coverage: summaryMetrics.top3Coverage,
          top10Coverage: summaryMetrics.top10Coverage,
          shareOfVoice: summaryMetrics.shareOfVoice,
        },
      });

      return {
        id: updatedRun.id,
        storeId: updatedRun.storeId,
        keywordId: updatedRun.keywordId,
        gridConfigId: updatedRun.gridConfigId,
        provider: updatedRun.provider,
        status: updatedRun.status,
        businessKey: updatedRun.businessKey,
        scheduledDate: updatedRun.scheduledDate,
        startedAt: updatedRun.startedAt,
        completedAt: updatedRun.completedAt,
        errorCode: updatedRun.errorCode,
        errorMessage: updatedRun.errorMessage,
        createdAt: updatedRun.createdAt,
        summary,
        observations: queryResult.observations.map((o) => ({
          pointIndex: o.pointIndex,
          row: o.row,
          col: o.col,
          latitude: o.latitude,
          longitude: o.longitude,
          distanceKm: o.distanceKm,
          rank: o.rank,
          found: o.found,
          checkedDepth: o.checkedDepth,
          topCompetitors: o.topCompetitors,
        })),
      };
    });
  }

  /**
   * Retrieves the latest completed/partial rank run for a Store + Keyword,
   * including all grid point observations for interactive heatmap rendering.
   */
  public static async getLatestRun(
    tenantId: string,
    storeId: string,
    keywordId: string,
    context: AuthorizedContext
  ): Promise<RankRunDto | null> {
    AuthorizationService.assertCan(context, Action.DASHBOARD_VIEW);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const run = await tx.rankRun.findFirst({
        where: {
          tenantId,
          storeId,
          keywordId,
          status: { in: ['COMPLETED', 'PARTIAL'] },
        },
        orderBy: [{ scheduledDate: 'desc' }, { createdAt: 'desc' }],
        include: {
          summary: true,
          observations: {
            orderBy: { pointIndex: 'asc' },
          },
        },
      });

      if (!run) return null;

      return {
        id: run.id,
        storeId: run.storeId,
        keywordId: run.keywordId,
        gridConfigId: run.gridConfigId,
        provider: run.provider,
        status: run.status,
        businessKey: run.businessKey,
        scheduledDate: run.scheduledDate,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        errorCode: run.errorCode,
        errorMessage: run.errorMessage,
        createdAt: run.createdAt,
        summary: run.summary,
        observations: run.observations.map((obs) => ({
          pointIndex: obs.pointIndex,
          row: obs.gridRow,
          col: obs.gridCol,
          latitude: obs.latitude,
          longitude: obs.longitude,
          distanceKm: obs.distanceKm,
          rank: obs.rank,
          found: obs.found,
          checkedDepth: obs.checkedDepth,
          topCompetitors: (obs.topCompetitors as unknown as CompetitorObservation[]) ?? [],
        })),
      };
    });
  }

  /**
   * Retrieves historical runs for trend visualization (immutable time-series).
   */
  public static async getHistoricalRuns(
    tenantId: string,
    storeId: string,
    keywordId: string,
    optionsOrLimit?: { limit?: number } | number,
    maybeContext?: AuthorizedContext
  ): Promise<RankRunDto[]> {
    let limit = 30;
    let context: AuthorizedContext;

    if (typeof optionsOrLimit === 'number') {
      limit = optionsOrLimit;
      context = maybeContext!;
    } else if (optionsOrLimit && ('role' in optionsOrLimit || 'scopeMode' in optionsOrLimit)) {
      context = optionsOrLimit as AuthorizedContext;
    } else {
      limit = optionsOrLimit?.limit ?? 30;
      context = maybeContext!;
    }

    AuthorizationService.assertCan(context, Action.DASHBOARD_VIEW);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const runs = await tx.rankRun.findMany({
        where: { tenantId, storeId, keywordId },
        orderBy: { scheduledDate: 'desc' },
        take: limit,
        include: {
          summary: true,
          observations: {
            orderBy: { pointIndex: 'asc' },
          },
        },
      });

      return runs.map((run) => ({
        id: run.id,
        storeId: run.storeId,
        keywordId: run.keywordId,
        gridConfigId: run.gridConfigId,
        provider: run.provider,
        status: run.status,
        businessKey: run.businessKey,
        scheduledDate: run.scheduledDate,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        errorCode: run.errorCode,
        errorMessage: run.errorMessage,
        createdAt: run.createdAt,
        summary: run.summary,
        observations: run.observations.map((obs) => ({
          pointIndex: obs.pointIndex,
          row: obs.gridRow,
          col: obs.gridCol,
          latitude: obs.latitude,
          longitude: obs.longitude,
          distanceKm: obs.distanceKm,
          rank: obs.rank,
          found: obs.found,
          checkedDepth: obs.checkedDepth,
          topCompetitors: (obs.topCompetitors as unknown as CompetitorObservation[]) ?? [],
        })),
      }));
    });
  }

  /**
   * Generates the Store Rank Dashboard metrics across all tracked keywords.
   */
  public static async getStoreRankDashboard(
    tenantId: string,
    storeId: string,
    context: AuthorizedContext
  ): Promise<StoreRankDashboardDto> {
    AuthorizationService.assertCan(context, Action.DASHBOARD_VIEW);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const store = await tx.location.findFirst({
        where: { id: storeId, tenantId, isArchived: false },
        select: { id: true, name: true },
      });
      if (!store) throw new Error(`Store ${storeId} not found`);

      const storeKeywords = await tx.storeKeyword.findMany({
        where: { tenantId, storeId },
        include: {
          keyword: {
            select: { id: true, term: true, status: true },
          },
        },
      });

      const keywordRows = [];
      let totalFoundRanksSum = 0;
      let totalFoundCount = 0;
      let top3CoverageSum = 0;
      let top10CoverageSum = 0;
      let sovSum = 0;
      let activeRunsCount = 0;

      for (const sk of storeKeywords) {
        const latestRun = await tx.rankRun.findFirst({
          where: {
            tenantId,
            storeId,
            keywordId: sk.keywordId,
            status: { in: ['SUCCESS', 'COMPLETED', 'PARTIAL'] },
          },
          orderBy: { scheduledDate: 'desc' },
          include: { summary: true },
        });

        const summary = latestRun?.summary;

        if (summary) {
          activeRunsCount++;
          top3CoverageSum += summary.top3Coverage;
          top10CoverageSum += summary.top10Coverage;
          sovSum += summary.shareOfVoice;

          if (summary.averageFoundRank != null && summary.foundPoints > 0) {
            totalFoundRanksSum += summary.averageFoundRank * summary.foundPoints;
            totalFoundCount += summary.foundPoints;
          }
        }

        keywordRows.push({
          keywordId: sk.keywordId,
          term: sk.keyword.term,
          latestRank: summary?.averageFoundRank ?? null,
          top3Coverage: summary?.top3Coverage ?? 0,
          top10Coverage: summary?.top10Coverage ?? 0,
          averageFoundRank: summary?.averageFoundRank ?? null,
          shareOfVoice: summary?.shareOfVoice ?? 0,
          lastCheckedAt: latestRun?.completedAt ?? null,
          status: sk.keyword.status,
        });
      }

      const averageFoundRank =
        totalFoundCount > 0
          ? Math.round((totalFoundRanksSum / totalFoundCount) * 10) / 10
          : null;

      const top3Coverage =
        activeRunsCount > 0 ? Math.round((top3CoverageSum / activeRunsCount) * 10) / 10 : 0;
      const top10Coverage =
        activeRunsCount > 0 ? Math.round((top10CoverageSum / activeRunsCount) * 10) / 10 : 0;
      const averageShareOfVoice =
        activeRunsCount > 0 ? Math.round((sovSum / activeRunsCount) * 10) / 10 : 0;

      return {
        storeId: store.id,
        storeName: store.name,
        trackedKeywordsCount: storeKeywords.length,
        averageFoundRank,
        top3Coverage,
        top10Coverage,
        averageShareOfVoice,
        keywordRows,
      };
    });
  }

  /**
   * Generates the Brand-Wide Rank Dashboard aggregating all stores.
   */
  public static async getBrandRankDashboard(
    tenantId: string,
    brandId: string,
    context: AuthorizedContext
  ): Promise<BrandRankDashboardDto> {
    AuthorizationService.assertCan(context, Action.DASHBOARD_VIEW);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const brand = await tx.brand.findFirst({
        where: { id: brandId, tenantId, isArchived: false },
        select: { id: true, name: true },
      });
      if (!brand) throw new Error(`Brand ${brandId} not found`);

      const stores = await tx.location.findMany({
        where: { tenantId, brandId, isArchived: false },
        select: { id: true, name: true, city: true },
      });

      const storeRows = [];
      let totalBrandTrackedKeywords = 0;
      let brandFoundRanksSum = 0;
      let brandFoundCount = 0;
      let brandTop3Sum = 0;
      let brandTop10Sum = 0;
      let storesWithMetrics = 0;

      for (const st of stores) {
        const storeDash = await this.getStoreRankDashboard(tenantId, st.id, context);
        totalBrandTrackedKeywords += storeDash.trackedKeywordsCount;

        if (storeDash.trackedKeywordsCount > 0) {
          storesWithMetrics++;
          brandTop3Sum += storeDash.top3Coverage;
          brandTop10Sum += storeDash.top10Coverage;

          if (storeDash.averageFoundRank != null) {
            brandFoundRanksSum += storeDash.averageFoundRank;
            brandFoundCount++;
          }
        }

        storeRows.push({
          storeId: st.id,
          storeName: st.name,
          city: st.city,
          trackedKeywordsCount: storeDash.trackedKeywordsCount,
          averageFoundRank: storeDash.averageFoundRank,
          top3Coverage: storeDash.top3Coverage,
          top10Coverage: storeDash.top10Coverage,
          shareOfVoice: storeDash.averageShareOfVoice,
        });
      }

      const brandAverageFoundRank =
        brandFoundCount > 0 ? Math.round((brandFoundRanksSum / brandFoundCount) * 10) / 10 : null;

      const brandTop3Coverage =
        storesWithMetrics > 0 ? Math.round((brandTop3Sum / storesWithMetrics) * 10) / 10 : 0;
      const brandTop10Coverage =
        storesWithMetrics > 0 ? Math.round((brandTop10Sum / storesWithMetrics) * 10) / 10 : 0;

      return {
        brandId: brand.id,
        brandName: brand.name,
        totalStores: stores.length,
        totalTrackedKeywords: totalBrandTrackedKeywords,
        brandAverageFoundRank,
        brandTop3Coverage,
        brandTop10Coverage,
        storeRows,
      };
    });
  }
}
