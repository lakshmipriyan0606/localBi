import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { GbpWriteClient } from '@/modules/integrations/google/gbp-write-client';
import { GbpReviewSyncJobData } from '../sync-queue';
import { logger } from '@/shared/observability/logger';

export class GbpReviewSyncJob {
  public static async execute(
    accessToken: string,
    jobData: GbpReviewSyncJobData
  ): Promise<{ processed: number; aborted: boolean; reason?: string }> {
    const { tenantId, locationId, accountId, locationResourceName } = jobData;
    const cleanLocationId = locationResourceName.replace('locations/', '');

    // 1. Retrieve the last sync cursor
    let lastSyncTime = new Date(0);
    await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const cursor = await tx.syncCursor.findUnique({
        where: {
          uq_sync_cursor: {
            tenantId,
            provider: 'GBP_REVIEWS',
            resourceId: locationId,
            cursorKey: 'last_update_time',
          },
        },
      });
      if (cursor) {
        lastSyncTime = new Date(cursor.cursorValue);
      }
    });

    // We use a 7-day overlap window to catch any late-arriving updates or tie-breaker issues.
    const overlapWindowMs = 7 * 24 * 60 * 60 * 1000;
    const cutoffTime = new Date(Math.max(0, lastSyncTime.getTime() - overlapWindowMs));

    let pageToken: string | undefined = undefined;
    let totalProcessed = 0;
    let shouldTerminate = false;
    let maxUpdateTimeSeen = lastSyncTime;
    let avgRating = 0;
    let totalCount = 0;

    // 2. Fetch and paginate reviews
    do {
      const response = await GbpWriteClient.listReviews(
        accessToken,
        accountId,
        cleanLocationId,
        pageToken
      );

      const reviews = response.reviews || [];
      if (response.averageRating !== undefined) avgRating = response.averageRating;
      if (response.totalReviewCount !== undefined) totalCount = response.totalReviewCount;

      let allOlderThanCutoff = reviews.length > 0;

      for (const review of reviews) {
        const updateTime = new Date(review.updateTime);
        if (updateTime > maxUpdateTimeSeen) {
          maxUpdateTimeSeen = updateTime;
        }

        if (updateTime >= cutoffTime) {
          allOlderThanCutoff = false;
        }

        // Upsert Review
        await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
          await tx.gbpReview.upsert({
            where: {
              uq_gbp_review: {
                tenantId,
                reviewId: review.reviewId,
              },
            },
            create: {
              tenantId,
              locationId,
              reviewId: review.reviewId,
              reviewerName: review.reviewer?.displayName || 'Anonymous',
              rating: this.parseStarRating(review.starRating),
              comment: review.comment || null,
              replyComment: review.reviewReply?.comment || null,
              replyUpdatedAt: review.reviewReply?.updateTime
                ? new Date(review.reviewReply.updateTime)
                : null,
              createTime: new Date(review.createTime),
              updateTime: new Date(review.updateTime),
            },
            update: {
              reviewerName: review.reviewer?.displayName || 'Anonymous',
              rating: this.parseStarRating(review.starRating),
              comment: review.comment || null,
              replyComment: review.reviewReply?.comment || null,
              replyUpdatedAt: review.reviewReply?.updateTime
                ? new Date(review.reviewReply.updateTime)
                : null,
              updateTime: new Date(review.updateTime),
            },
          });
        });
        totalProcessed++;
      }

      // If every review in this page is older than our cutoff, we can safely stop paginating.
      // (Google returns them roughly in descending order of updateTime)
      if (reviews.length > 0 && allOlderThanCutoff) {
        logger.info(
          { tenantId, locationId, pageProcessed: reviews.length },
          'All reviews on page are older than cutoff. Terminating sync early.'
        );
        shouldTerminate = true;
      }

      pageToken = response.nextPageToken;
    } while (pageToken && !shouldTerminate);

    // 3. Upsert Location Aggregate
    await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      await tx.gbpLocationAggregate.upsert({
        where: {
          uq_gbp_location_aggregate: {
            tenantId,
            locationId,
          },
        },
        create: {
          tenantId,
          locationId,
          averageRating: avgRating,
          totalReviewCount: totalCount,
        },
        update: {
          averageRating: avgRating,
          totalReviewCount: totalCount,
        },
      });

      // Update cursor
      if (maxUpdateTimeSeen > lastSyncTime) {
        await tx.syncCursor.upsert({
          where: {
            uq_sync_cursor: {
              tenantId,
              provider: 'GBP_REVIEWS',
              resourceId: locationId,
              cursorKey: 'last_update_time',
            },
          },
          create: {
            tenantId,
            provider: 'GBP_REVIEWS',
            resourceId: locationId,
            cursorKey: 'last_update_time',
            cursorValue: maxUpdateTimeSeen.toISOString(),
          },
          update: {
            cursorValue: maxUpdateTimeSeen.toISOString(),
          },
        });
      }
    });

    return { processed: totalProcessed, aborted: false };
  }

  private static parseStarRating(starRating: string): number {
    switch (starRating) {
      case 'ONE':
        return 1;
      case 'TWO':
        return 2;
      case 'THREE':
        return 3;
      case 'FOUR':
        return 4;
      case 'FIVE':
        return 5;
      default:
        return 0;
    }
  }
}
