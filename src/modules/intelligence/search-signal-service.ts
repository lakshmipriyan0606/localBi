/**
 * Phase 10: Search Signal Service
 * Normalizes and aggregates multi-source search signals without blurring provenance.
 * Sources: GSC Queries, GBP Search Terms, Hyper Rank Grid Runs, GA4/LocalBi Conversions, Merchant issues.
 */

import { prisma } from '@/shared/database/client';
import { Prisma } from '@prisma/client';
import { KeywordService } from '@/modules/rank/keyword-service';
import { SignalSource } from './opportunity-types';

export interface NormalizedGscSignal {
  source: typeof SignalSource.GSC;
  queryText: string;
  normalizedTerm: string;
  impressions: number;
  clicks: number;
  ctr: number;
  averagePosition: number;
  targetPageUrl?: string | undefined;
  dateRange: string;
}

export interface NormalizedGbpSignal {
  source: typeof SignalSource.GBP;
  term: string;
  normalizedTerm: string;
  impressions: number;
  locationId: string;
  periodStart: Date;
  periodEnd: Date;
}

export interface NormalizedRankSignal {
  source: typeof SignalSource.LOCAL_RANK;
  keywordId: string;
  term: string;
  normalizedTerm: string;
  storeId: string;
  averageFoundRank: number;
  top3Coverage: number;
  top10Coverage: number;
  foundCoverage: number;
  gridRunDate: Date;
  priorTop3Coverage?: number | undefined;
}

export interface NormalizedConversionSignal {
  source: typeof SignalSource.LOCALBI;
  storeId?: string | undefined;
  pageId?: string | undefined;
  leadsCount: number;
  callsCount: number;
  callClicksCount: number;
  totalConversions: number;
  periodDays: number;
}

export interface StoreOperationalSignal {
  storeId: string;
  storeName: string;
  city: string;
  phone?: string | null | undefined;
  addressLine1: string;
  googlePlaceId?: string | null | undefined;
  gbpSyncStatus?: string | null | undefined;
  unansweredReviewsCount: number;
  lowestUnansweredRating?: number | undefined;
  totalReviewsCount: number;
  averageRating?: number | undefined;
}

export interface MerchantProductIssueSignal {
  source: typeof SignalSource.MERCHANT;
  productId: string;
  productName: string;
  sku: string;
  severity: string; // ERROR, WARNING
  issueCode: string;
  description: string;
  storeId?: string | null | undefined;
}

export interface AggregatedSignals {
  gscSignals: NormalizedGscSignal[];
  gbpSignals: NormalizedGbpSignal[];
  rankSignals: NormalizedRankSignal[];
  conversionSignals: NormalizedConversionSignal[];
  storeSignals: StoreOperationalSignal[];
  merchantSignals: MerchantProductIssueSignal[];
}

export class SearchSignalService {
  /**
   * Loads all factual signals for a tenant and brand within an evaluation window.
   */
  public static async loadSignals(
    tenantId: string,
    brandId: string,
    options: {
      lookbackDays?: number;
    } = {},
    db: Prisma.TransactionClient | typeof prisma = prisma
  ): Promise<AggregatedSignals> {
    const lookbackDays = options.lookbackDays ?? 28;
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - lookbackDays);

    // 1. Fetch GSC queries
    const gscProperties = await db.gscProperty.findMany({
      where: {
        tenantId,
        resource: {
          internalMappings: {
            some: {
              tenantId,
              brandId,
              status: 'ACTIVE',
            },
          },
        },
      },
      include: {
        queries: {
          include: {
            dailyMetrics: {
              where: {
                tenantId,
                date: { gte: sinceDate },
              },
            },
          },
        },
      },
    });

    const gscSignals: NormalizedGscSignal[] = [];
    for (const prop of gscProperties) {
      for (const q of prop.queries) {
        if (!q.dailyMetrics || q.dailyMetrics.length === 0) continue;

        let totalImpressions = 0;
        let totalClicks = 0;
        let sumPositionImpressions = 0;

        for (const m of q.dailyMetrics) {
          totalImpressions += m.impressions;
          totalClicks += m.clicks;
          sumPositionImpressions += m.sumPositionImpressions;
        }

        if (totalImpressions > 0) {
          const ctr = totalClicks / totalImpressions;
          const averagePosition = sumPositionImpressions / totalImpressions;

          gscSignals.push({
            source: SignalSource.GSC,
            queryText: q.queryText,
            normalizedTerm: KeywordService.normalizeKeyword(q.queryText),
            impressions: totalImpressions,
            clicks: totalClicks,
            ctr,
            averagePosition,
            dateRange: `last_${lookbackDays}_days`,
          });
        }
      }
    }

    // 2. Fetch GBP search terms & store profiles
    const stores = await db.location.findMany({
      where: {
        tenantId,
        brandId,
        isArchived: false,
      },
      include: {
        gbpSearchTerms: {
          where: {
            tenantId,
            periodEnd: { gte: sinceDate },
          },
        },
        gbpReviews: {
          where: {
            tenantId,
          },
        },
        gbpAggregate: true,
      },
    });

    const gbpSignals: NormalizedGbpSignal[] = [];
    const storeSignals: StoreOperationalSignal[] = [];

    for (const store of stores) {
      // Store Operational / GBP Profile Signals
      const unansweredReviews = store.gbpReviews.filter(
        (r) => !r.replyComment || r.replyComment.trim() === ''
      );
      const lowestRating = unansweredReviews.reduce<number | undefined>((min, r) => {
        if (min === undefined || r.rating < min) return r.rating;
        return min;
      }, undefined);

      storeSignals.push({
        storeId: store.id,
        storeName: store.name,
        city: store.city,
        phone: store.phone,
        addressLine1: store.addressLine1,
        googlePlaceId: store.googlePlaceId,
        gbpSyncStatus: store.gbpSyncStatus,
        unansweredReviewsCount: unansweredReviews.length,
        lowestUnansweredRating: lowestRating,
        totalReviewsCount: store.gbpAggregate?.totalReviewCount ?? store.gbpReviews.length,
        averageRating: store.gbpAggregate?.averageRating ?? undefined,
      });

      // GBP Search Terms
      for (const st of store.gbpSearchTerms) {
        gbpSignals.push({
          source: SignalSource.GBP,
          term: st.term,
          normalizedTerm: KeywordService.normalizeKeyword(st.term),
          impressions: Number(st.impressions),
          locationId: store.id,
          periodStart: st.periodStart,
          periodEnd: st.periodEnd,
        });
      }
    }

    // 3. Fetch Local Rank Geo-Grid Signals
    const rankRuns = await db.rankRun.findMany({
      where: {
        tenantId,
        brandId,
        status: 'COMPLETED',
        createdAt: { gte: sinceDate },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        keyword: true,
        summary: true,
      },
      take: 50,
    });

    // Deduplicate by keyword + store to get most recent run
    const rankSignalsMap = new Map<string, NormalizedRankSignal>();
    for (const run of rankRuns) {
      const key = `${run.keywordId}:${run.storeId}`;
      if (!rankSignalsMap.has(key) && run.summary) {
        rankSignalsMap.set(key, {
          source: SignalSource.LOCAL_RANK,
          keywordId: run.keywordId,
          term: run.keyword.term,
          normalizedTerm: run.keyword.normalizedTerm,
          storeId: run.storeId,
          averageFoundRank: run.summary.averageFoundRank ?? 10.0,
          top3Coverage: run.summary.top3Coverage,
          top10Coverage: run.summary.top10Coverage,
          foundCoverage: run.summary.foundPoints / (run.summary.totalPoints || 1),
          gridRunDate: run.createdAt,
        });
      }
    }
    const rankSignals = Array.from(rankSignalsMap.values());

    // 4. Fetch First-Party Conversions (Leads, Calls, Attribution Events)
    const leads = await db.lead.findMany({
      where: {
        tenantId,
        brandId,
        createdAt: { gte: sinceDate },
      },
      select: {
        storeId: true,
        pageId: true,
      },
    });

    const calls = await db.call.findMany({
      where: {
        tenantId,
        brandId,
        startedAt: { gte: sinceDate },
      },
      select: {
        storeId: true,
        pageId: true,
      },
    });

    const callClickEvents = await db.attributionEvent.findMany({
      where: {
        tenantId,
        brandId,
        eventType: 'CALL_CLICK',
        occurredAt: { gte: sinceDate },
      },
      select: {
        storeId: true,
        pageId: true,
      },
    });

    // Aggregate conversions by storeId
    const storeConversionMap = new Map<string, { leads: number; calls: number; clicks: number }>();
    for (const l of leads) {
      if (!l.storeId) continue;
      const cur = storeConversionMap.get(l.storeId) ?? { leads: 0, calls: 0, clicks: 0 };
      cur.leads++;
      storeConversionMap.set(l.storeId, cur);
    }
    for (const c of calls) {
      if (!c.storeId) continue;
      const cur = storeConversionMap.get(c.storeId) ?? { leads: 0, calls: 0, clicks: 0 };
      cur.calls++;
      storeConversionMap.set(c.storeId, cur);
    }
    for (const ev of callClickEvents) {
      if (!ev.storeId) continue;
      const cur = storeConversionMap.get(ev.storeId) ?? { leads: 0, calls: 0, clicks: 0 };
      cur.clicks++;
      storeConversionMap.set(ev.storeId, cur);
    }

    const conversionSignals: NormalizedConversionSignal[] = Array.from(
      storeConversionMap.entries()
    ).map(([storeId, counts]) => ({
      source: SignalSource.LOCALBI,
      storeId,
      leadsCount: counts.leads,
      callsCount: counts.calls,
      callClicksCount: counts.clicks,
      totalConversions: counts.leads + counts.calls + counts.clicks,
      periodDays: lookbackDays,
    }));

    // 5. Fetch Google Merchant Center Issues
    const merchantIssues = await db.merchantProductIssue.findMany({
      where: {
        tenantId,
        brandId,
        isResolved: false,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
      },
    });

    const merchantSignals: MerchantProductIssueSignal[] = merchantIssues.map((issue) => ({
      source: SignalSource.MERCHANT,
      productId: issue.product.id,
      productName: issue.product.name,
      sku: issue.product.sku,
      severity: issue.severity,
      issueCode: issue.code,
      description: issue.message,
      storeId: issue.storeId,
    }));

    return {
      gscSignals,
      gbpSignals,
      rankSignals,
      conversionSignals,
      storeSignals,
      merchantSignals,
    };
  }
}
