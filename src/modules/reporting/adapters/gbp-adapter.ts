import { Prisma } from '@prisma/client';
import { GbpReportDto, ModuleReportState } from '../reporting-types';
import { ComparisonEngine } from '../comparison-engine';
import { ClientReportContext } from '../client-report-context-service';

export class GbpReportingAdapter {
  public static async getReport(
    tx: Prisma.TransactionClient,
    context: ClientReportContext
  ): Promise<GbpReportDto> {
    const { tenant, brand, selectedStoreIds, comparisonRange } = context;

    try {
      // Find locations belonging to this brand
      const storeFilter = selectedStoreIds.length > 0 ? { id: { in: selectedStoreIds } } : {};

      const locations = await tx.location.findMany({
        where: {
          tenantId: tenant.id,
          brandId: brand.id,
          isArchived: false,
          ...storeFilter,
        },
        select: { id: true },
      });

      const locationIds = locations.map((l) => l.id);
      if (locationIds.length === 0) {
        return this.emptyReport('NO_DATA');
      }

      // 1. Fetch aggregates
      const aggregates = await tx.gbpLocationAggregate.findMany({
        where: {
          tenantId: tenant.id,
          locationId: { in: locationIds },
        },
      });

      const totalReviews = aggregates.reduce((sum, a) => sum + a.totalReviewCount, 0);
      const validRatings = aggregates.filter((a) => a.averageRating !== null && a.averageRating !== undefined);
      const averageRating = validRatings.length > 0
        ? Number((validRatings.reduce((sum, a) => sum + (a.averageRating || 0), 0) / validRatings.length).toFixed(1))
        : 0;

      // 2. Fetch unanswered reviews (replyComment is null or empty)
      const reviews = await tx.gbpReview.findMany({
        where: {
          tenantId: tenant.id,
          locationId: { in: locationIds },
        },
        select: {
          rating: true,
          replyComment: true,
        },
      });

      const unansweredCount = reviews.filter((r) => !r.replyComment || r.replyComment.trim() === '').length;

      // Rating breakdown (1 to 5 stars)
      const starCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      for (const r of reviews) {
        if (r.rating >= 1 && r.rating <= 5) {
          starCounts[r.rating] = (starCounts[r.rating] || 0) + 1;
        }
      }

      const ratingBreakdown = [5, 4, 3, 2, 1].map((stars) => ({
        stars,
        count: starCounts[stars] || 0,
      }));

      // Calculate transparent LocalBi profile completeness score (0-100)
      const profileCompleteness = Math.min(
        100,
        Math.round((aggregates.length / locationIds.length) * 80 + (totalReviews > 0 ? 20 : 0))
      );

      const baseline = comparisonRange?.label;
      const hasData = aggregates.length > 0 || reviews.length > 0;
      const state: ModuleReportState = hasData ? 'DATA' : 'NO_DATA';

      return {
        state,
        metrics: {
          mappedLocations: aggregates.length,
          averageRating: ComparisonEngine.calculate(averageRating, null, { baselineLabel: baseline }),
          totalReviews: ComparisonEngine.calculate(totalReviews, null, { baselineLabel: baseline }),
          unansweredReviews: ComparisonEngine.calculate(unansweredCount, null, { baselineLabel: baseline, higherIsBetter: false }),
          profileCompleteness,
        },
        ratingBreakdown,
      };
    } catch (err) {
      return this.emptyReport('UPSTREAM_ERROR');
    }
  }

  private static emptyReport(state: ModuleReportState): GbpReportDto {
    return {
      state,
      metrics: {
        mappedLocations: 0,
        averageRating: ComparisonEngine.calculate(0, null),
        totalReviews: ComparisonEngine.calculate(0, null),
        unansweredReviews: ComparisonEngine.calculate(0, null),
        profileCompleteness: 0,
      },
      ratingBreakdown: [5, 4, 3, 2, 1].map((stars) => ({ stars, count: 0 })),
    };
  }
}
