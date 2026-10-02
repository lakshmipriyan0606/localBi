import { Prisma, AttributionEventType } from '@prisma/client';
import { StorePerformanceRow } from '../reporting-types';
import { ClientReportContext } from '../client-report-context-service';

export class StoreReportingAdapter {
  public static async getStoreRows(
    tx: Prisma.TransactionClient,
    context: ClientReportContext
  ): Promise<StorePerformanceRow[]> {
    const { tenant, brand, selectedStoreIds, dateRange } = context;

    try {
      const curStart = new Date(dateRange.startDate + 'T00:00:00.000Z');
      const curEnd = new Date(dateRange.endDate + 'T23:59:59.999Z');

      const storeFilter = selectedStoreIds.length > 0 ? { id: { in: selectedStoreIds } } : {};

      // 1. Fetch authorized stores
      const stores = await tx.location.findMany({
        where: {
          tenantId: tenant.id,
          brandId: brand.id,
          isArchived: false,
          ...storeFilter,
        },
        select: {
          id: true,
          name: true,
          city: true,
        },
        orderBy: { name: 'asc' },
      });

      if (stores.length === 0) {
        return [];
      }

      const storeIds = stores.map((s) => s.id);

      // 2. Parallel server-side grouped aggregations
      const [
        actionGroups,
        callGroups,
        leadGroups,
        gbpAggregates,
        rankSummaries,
        listings,
      ] = await Promise.all([
        // Website Actions (Clicks)
        tx.attributionEvent.groupBy({
          by: ['storeId'],
          where: {
            tenantId: tenant.id,
            storeId: { in: storeIds },
            occurredAt: { gte: curStart, lte: curEnd },
            eventType: {
              in: [
                AttributionEventType.CALL_CLICK,
                AttributionEventType.WHATSAPP_CLICK,
                AttributionEventType.DIRECTIONS_CLICK,
                AttributionEventType.BOOKING_COMPLETE,
              ],
            },
          },
          _count: { id: true },
        }),

        // Real Telephony Calls
        tx.call.groupBy({
          by: ['storeId'],
          where: {
            tenantId: tenant.id,
            storeId: { in: storeIds },
            startedAt: { gte: curStart, lte: curEnd },
          },
          _count: { id: true },
        }),

        // Form Leads
        tx.lead.groupBy({
          by: ['storeId'],
          where: {
            tenantId: tenant.id,
            storeId: { in: storeIds },
            createdAt: { gte: curStart, lte: curEnd },
          },
          _count: { id: true },
        }),

        // GBP Location Ratings & Review Counts
        tx.gbpLocationAggregate.findMany({
          where: {
            tenantId: tenant.id,
            locationId: { in: storeIds },
          },
        }),

        // Latest Rank Summaries per store
        tx.rankRunSummary.findMany({
          where: {
            tenantId: tenant.id,
            storeId: { in: storeIds },
          },
          orderBy: { createdAt: 'desc' },
        }),

        // Directory Listings issues
        tx.directoryListing.findMany({
          where: {
            tenantId: tenant.id,
            storeId: { in: storeIds },
          },
          select: {
            storeId: true,
            napOverallStatus: true,
          },
        }),
      ]);

      // Build maps for O(1) lookup
      const actionsMap = new Map(actionGroups.map((g) => [g.storeId, g._count.id]));
      const callsMap = new Map(callGroups.map((g) => [g.storeId, g._count.id]));
      const leadsMap = new Map(leadGroups.map((g) => [g.storeId, g._count.id]));
      const gbpMap = new Map(gbpAggregates.map((g) => [g.locationId, g]));

      // Rank Top-3 Map (average top3Coverage across latest summaries for the store)
      const rankMap = new Map<string, { totalTop3: number; count: number }>();
      for (const r of rankSummaries) {
        const existing = rankMap.get(r.storeId) || { totalTop3: 0, count: 0 };
        existing.totalTop3 += r.top3Coverage;
        existing.count += 1;
        rankMap.set(r.storeId, existing);
      }

      // Listings issues map
      const listingsIssuesMap = new Map<string, number>();
      for (const l of listings) {
        if (l.napOverallStatus !== 'MATCH') {
          listingsIssuesMap.set(l.storeId, (listingsIssuesMap.get(l.storeId) || 0) + 1);
        }
      }

      return stores.map((s) => {
        const gbp = gbpMap.get(s.id);
        const rankInfo = rankMap.get(s.id);
        const top3Coverage = rankInfo && rankInfo.count > 0
          ? Number((rankInfo.totalTop3 / rankInfo.count).toFixed(1))
          : null;

        return {
          storeId: s.id,
          storeName: s.name,
          city: s.city,
          websiteActions: actionsMap.get(s.id) || 0,
          calls: callsMap.get(s.id) || 0,
          leads: leadsMap.get(s.id) || 0,
          rating: gbp?.averageRating ?? null,
          reviewsCount: gbp?.totalReviewCount ?? 0,
          top3Coverage,
          listingIssues: listingsIssuesMap.get(s.id) || 0,
        };
      });
    } catch (err) {
      return [];
    }
  }
}
