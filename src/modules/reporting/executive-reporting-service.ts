import { prisma } from '@/shared/database/client';
import { Prisma } from '@prisma/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { ClientReportContext, ClientReportContextService, ResolveReportContextOptions } from './client-report-context-service';
import { ExecutiveReportDto, WebsiteReportDto, LocalActionsReportDto, TelephonyReportDto, GbpReportDto, RankReportDto, MerchantReportDto, ContentReportDto, ListingsReportDto, OpportunitiesSummaryDto, StorePerformanceRow } from './reporting-types';
import { WebsiteReportingAdapter } from './adapters/website-adapter';
import { LocalActionsReportingAdapter } from './adapters/local-actions-adapter';
import { TelephonyReportingAdapter } from './adapters/telephony-adapter';
import { GbpReportingAdapter } from './adapters/gbp-adapter';
import { RankReportingAdapter } from './adapters/rank-adapter';
import { MerchantReportingAdapter } from './adapters/merchant-adapter';
import { ContentReportingAdapter } from './adapters/content-adapter';
import { ListingsReportingAdapter } from './adapters/listings-adapter';
import { OpportunitiesReportingAdapter } from './adapters/opportunities-adapter';
import { StoreReportingAdapter } from './adapters/store-reporting-adapter';
import { ComparisonEngine } from './comparison-engine';
import { createResourceNotFoundError } from '@/shared/errors';

export class ExecutiveReportingService {
  /**
   * Generates a unified ExecutiveReportDto across all 9 modules for the given context.
   * Completely multi-tenant and RLS-scoped.
   */
  public static async generateReport(context: ClientReportContext): Promise<ExecutiveReportDto> {
    const tenantId = context.tenant.id;

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const unavailableModules: string[] = [];

      // Run all module adapters in parallel
      const [
        websiteRes,
        actionsRes,
        telephonyRes,
        gbpRes,
        rankRes,
        merchantRes,
        contentRes,
        listingsRes,
        opportunitiesRes,
        storesRes,
      ] = await Promise.allSettled([
        WebsiteReportingAdapter.getReport(tx, context),
        LocalActionsReportingAdapter.getReport(tx, context),
        TelephonyReportingAdapter.getReport(tx, context),
        GbpReportingAdapter.getReport(tx, context),
        RankReportingAdapter.getReport(tx, context),
        MerchantReportingAdapter.getReport(tx, context),
        ContentReportingAdapter.getReport(tx, context),
        ListingsReportingAdapter.getReport(tx, context),
        OpportunitiesReportingAdapter.getReport(tx, context),
        StoreReportingAdapter.getStoreRows(tx, context),
      ]);

      const website: WebsiteReportDto =
        websiteRes.status === 'fulfilled'
          ? websiteRes.value
          : (unavailableModules.push('website'), this.fallbackWebsite());

      const localActions: LocalActionsReportDto =
        actionsRes.status === 'fulfilled'
          ? actionsRes.value
          : (unavailableModules.push('localActions'), this.fallbackActions());

      const telephony: TelephonyReportDto =
        telephonyRes.status === 'fulfilled'
          ? telephonyRes.value
          : (unavailableModules.push('telephony'), this.fallbackTelephony());

      const gbp: GbpReportDto =
        gbpRes.status === 'fulfilled'
          ? gbpRes.value
          : (unavailableModules.push('gbp'), this.fallbackGbp());

      const rank: RankReportDto =
        rankRes.status === 'fulfilled'
          ? rankRes.value
          : (unavailableModules.push('rank'), this.fallbackRank());

      const merchant: MerchantReportDto =
        merchantRes.status === 'fulfilled'
          ? merchantRes.value
          : (unavailableModules.push('merchant'), this.fallbackMerchant());

      const content: ContentReportDto =
        contentRes.status === 'fulfilled'
          ? contentRes.value
          : (unavailableModules.push('content'), this.fallbackContent());

      const listings: ListingsReportDto =
        listingsRes.status === 'fulfilled'
          ? listingsRes.value
          : (unavailableModules.push('listings'), this.fallbackListings());

      const opportunities: OpportunitiesSummaryDto =
        opportunitiesRes.status === 'fulfilled'
          ? opportunitiesRes.value
          : (unavailableModules.push('opportunities'), this.fallbackOpportunities());

      const stores: StorePerformanceRow[] =
        storesRes.status === 'fulfilled' ? storesRes.value : [];

      const partial = unavailableModules.length > 0;

      return {
        tenantId: context.tenant.id,
        tenantName: context.tenant.name,
        brandId: context.brand.id,
        brandName: context.brand.name,
        dateRange: context.dateRange,
        comparisonRange: context.comparisonRange,
        generatedAt: new Date().toISOString(),
        dataFreshness: context.dataFreshness,
        partial,
        unavailableModules,
        website,
        localActions,
        telephony,
        gbp,
        rank,
        merchant,
        content,
        listings,
        opportunities,
        stores,
      };
    });
  }

  /**
   * Helper that resolves context and generates the executive report.
   */
  public static async getExecutiveReport(options: ResolveReportContextOptions): Promise<ExecutiveReportDto> {
    const context = await ClientReportContextService.resolveContext(options);
    return this.generateReport(context);
  }

  /**
   * Creates an immutable ReportSnapshot in the database for client history, PDF generation, or scheduled delivery.
   */
  public static async createSnapshot(
    context: ClientReportContext,
    title?: string,
    userId?: string
  ): Promise<{ id: string; generatedAt: Date }> {
    const reportDto = await this.generateReport(context);

    return TenantContextService.withTenantContext(prisma, context.tenant.id, async (tx) => {
      const snapshotTitle =
        title ||
        `${context.brand.name} Executive Report (${context.dateRange.startDate} - ${context.dateRange.endDate})`;

      const snapshot = await tx.reportSnapshot.create({
        data: {
          tenantId: context.tenant.id,
          brandId: context.brand.id,
          title: snapshotTitle,
          reportType: 'EXECUTIVE',
          reportVersion: '1.0.0',
          dateRange: context.dateRange as unknown as object,
          comparisonRange: context.comparisonRange ? (context.comparisonRange as unknown as object) : Prisma.DbNull,
          filterConfig: {
            webSurfaceId: context.selectedWebSurface?.id || null,
            storeIds: context.selectedStoreIds,
            scope: context.scope,
          },
          payload: reportDto as unknown as object,
          partial: reportDto.partial,
          unavailableModules: reportDto.unavailableModules,
          dataFreshness: context.dataFreshness,
          createdBy: userId || null,
        },
      });

      return { id: snapshot.id, generatedAt: snapshot.generatedAt };
    });
  }

  /**
   * Retrieves an immutable ReportSnapshot ensuring strict tenant isolation.
   */
  public static async getSnapshot(tenantId: string, snapshotId: string): Promise<ExecutiveReportDto> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const snapshot = await tx.reportSnapshot.findFirst({
        where: {
          tenantId,
          id: snapshotId,
        },
      });

      if (!snapshot) {
        throw createResourceNotFoundError('ReportSnapshot', snapshotId);
      }

      return snapshot.payload as unknown as ExecutiveReportDto;
    });
  }

  /**
   * Lists historical report snapshots for a brand.
   */
  public static async listSnapshots(tenantId: string, brandId: string) {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      return tx.reportSnapshot.findMany({
        where: {
          tenantId,
          brandId,
        },
        select: {
          id: true,
          title: true,
          reportType: true,
          dateRange: true,
          partial: true,
          generatedAt: true,
          createdAt: true,
        },
        orderBy: { generatedAt: 'desc' },
        take: 30,
      });
    });
  }

  // ── Fallback builders for module-level fault tolerance ──
  private static fallbackWebsite(): WebsiteReportDto {
    return {
      state: 'UPSTREAM_ERROR',
      webSurfaceType: 'LOCALBI',
      webSurfaceId: '',
      metrics: {
        users: ComparisonEngine.calculate(0, null),
        sessions: ComparisonEngine.calculate(0, null),
        pageViews: ComparisonEngine.calculate(0, null),
        gscClicks: ComparisonEngine.calculate(0, null),
        gscImpressions: ComparisonEngine.calculate(0, null),
        ctr: ComparisonEngine.calculate(0, null),
        averagePosition: ComparisonEngine.calculatePositionDelta(0, null),
      },
      timeseries: [],
      topQueries: [],
      topPages: [],
    };
  }

  private static fallbackActions(): LocalActionsReportDto {
    return {
      state: 'UPSTREAM_ERROR',
      metrics: {
        calls: ComparisonEngine.calculate(0, null),
        whatsapp: ComparisonEngine.calculate(0, null),
        directions: ComparisonEngine.calculate(0, null),
        formLeads: ComparisonEngine.calculate(0, null),
        bookings: ComparisonEngine.calculate(0, null),
        totalActions: ComparisonEngine.calculate(0, null),
      },
      byChannel: [],
    };
  }

  private static fallbackTelephony(): TelephonyReportDto {
    return {
      state: 'UPSTREAM_ERROR',
      metrics: {
        inboundCalls: ComparisonEngine.calculate(0, null),
        answeredRate: ComparisonEngine.calculate(0, null),
        totalTalkMinutes: ComparisonEngine.calculate(0, null),
        avgDurationSeconds: ComparisonEngine.calculate(0, null),
      },
      recentCalls: [],
    };
  }

  private static fallbackGbp(): GbpReportDto {
    return {
      state: 'UPSTREAM_ERROR',
      metrics: {
        mappedLocations: 0,
        averageRating: ComparisonEngine.calculate(0, null),
        totalReviews: ComparisonEngine.calculate(0, null),
        unansweredReviews: ComparisonEngine.calculate(0, null),
        profileCompleteness: 0,
      },
      ratingBreakdown: [],
    };
  }

  private static fallbackRank(): RankReportDto {
    return {
      state: 'UPSTREAM_ERROR',
      metrics: {
        trackedKeywords: 0,
        top3Coverage: ComparisonEngine.calculate(0, null),
        top10Coverage: ComparisonEngine.calculate(0, null),
        foundCoverage: ComparisonEngine.calculate(0, null),
        averageFoundRank: ComparisonEngine.calculatePositionDelta(0, null),
      },
      topKeywords: [],
    };
  }

  private static fallbackMerchant(): MerchantReportDto {
    return {
      state: 'UPSTREAM_ERROR',
      metrics: {
        enabledProducts: 0,
        approved: ComparisonEngine.calculate(0, null),
        disapproved: ComparisonEngine.calculate(0, null),
        inventoryErrors: ComparisonEngine.calculate(0, null),
      },
      topIssues: [],
    };
  }

  private static fallbackContent(): ContentReportDto {
    return {
      state: 'UPSTREAM_ERROR',
      metrics: {
        publishedArticles: ComparisonEngine.calculate(0, null),
        organicClicks: ComparisonEngine.calculate(0, null),
        organicConversions: ComparisonEngine.calculate(0, null),
      },
      topArticles: [],
    };
  }

  private static fallbackListings(): ListingsReportDto {
    return {
      state: 'UPSTREAM_ERROR',
      metrics: {
        providersChecked: 0,
        healthyCount: ComparisonEngine.calculate(0, null),
        needsReviewCount: ComparisonEngine.calculate(0, null),
        duplicatesCount: ComparisonEngine.calculate(0, null),
      },
      providerSummary: [],
    };
  }

  private static fallbackOpportunities(): OpportunitiesSummaryDto {
    return {
      state: 'UPSTREAM_ERROR',
      metrics: {
        openCount: 0,
        highPriorityCount: 0,
        completedCount: 0,
      },
      topOpportunities: [],
    };
  }
}
