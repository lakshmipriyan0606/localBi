import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { AuthorizedContext, AuthorizationService, Action } from '@/shared/authorization/policy';
import { GbpWriteClient } from '@/modules/integrations/google/gbp-write-client';
import { GoogleOAuthService } from '@/modules/integrations/google/google-oauth-service';
import { SyncQueueService } from '@/modules/sync/sync-queue';
import { AppError } from '@/shared/errors';
import { Prisma } from '@prisma/client';

export interface GetReviewsFilters {
  tenantId: string;
  brandId: string;
  locationId?: string;
  filterBy?: 'all' | 'replied' | 'unreplied' | 'low';
  page?: number;
  pageSize?: number;
  context: AuthorizedContext;
}

export class GbpReviewsService {
  /**
   * List reviews from the local database.
   */
  public static async listReviews(filters: GetReviewsFilters) {
    AuthorizationService.assertCan(filters.context, Action.DASHBOARD_VIEW);

    const { tenantId, brandId, locationId, filterBy = 'all', page = 1, pageSize = 50 } = filters;
    const skip = (page - 1) * pageSize;

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const locationWhere: Prisma.LocationWhereInput = {
        tenantId,
        brandId,
        isArchived: false,
      };
      if (locationId) {
        locationWhere.id = locationId;
      }

      const locations = await tx.location.findMany({
        where: locationWhere,
        select: { id: true },
      });
      const locationIds = locations.map((loc) => loc.id);

      if (locationIds.length === 0) {
        return { items: [], totalCount: 0, page, pageSize };
      }

      const reviewWhere: Prisma.GbpReviewWhereInput = {
        tenantId,
        locationId: { in: locationIds },
      };

      if (filterBy === 'replied') {
        reviewWhere.replyComment = { not: null };
      } else if (filterBy === 'unreplied') {
        reviewWhere.replyComment = null;
      } else if (filterBy === 'low') {
        reviewWhere.rating = { in: [1, 2] };
      }

      const [items, totalCount] = await Promise.all([
        tx.gbpReview.findMany({
          where: reviewWhere,
          orderBy: { updateTime: 'desc' },
          skip,
          take: pageSize,
          include: { location: { select: { name: true, storeCode: true } } },
        }),
        tx.gbpReview.count({ where: reviewWhere }),
      ]);

      return { items, totalCount, page, pageSize };
    });
  }

  /**
   * Enqueue a manual synchronization job for reviews.
   */
  public static async enqueueManualSync(tenantId: string, brandId: string, locationId?: string, context?: AuthorizedContext) {
    if (context) {
      AuthorizationService.assertCan(context, Action.GBP_WRITE);
    }

    const scheduledJobs: any[] = [];
    await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const locationWhere: Prisma.LocationWhereInput = { tenantId, brandId, isArchived: false };
      if (locationId) {
        locationWhere.id = locationId;
      }

      const locMappings = await tx.internalResourceMapping.findMany({
        where: {
          tenantId,
          internalType: 'LOCATION',
          ...(locationId ? { internalId: locationId } : {}),
        },
        include: { resource: true },
      });

      const accounts = await tx.externalAccount.findMany({ where: { tenantId } });

      for (const mapping of locMappings) {
        const account = accounts.find((a) => a.id === mapping.resource.accountId);
        if (account) {
          const scheduled = await SyncQueueService.scheduleGbpReviewSync({
            tenantId,
            locationId: mapping.internalId,
            locationResourceName: mapping.resource.externalResourceId,
            accountId: account.externalAccountId.replace('accounts/', ''),
          });
          scheduledJobs.push(scheduled);
        }
      }
    });

    return { scheduledJobsCount: scheduledJobs.length, jobs: scheduledJobs };
  }

  /**
   * Reply to a review (Creates or updates).
   */
  public static async replyToReview(
    tenantId: string,
    reviewId: string,
    comment: string,
    context: AuthorizedContext
  ) {
    AuthorizationService.assertCan(context, Action.GBP_WRITE);

      if (!comment || comment.trim() === '') {
        throw new AppError({ code: 'VALIDATION_FAILED', message: 'Reply comment cannot be empty', statusCode: 400 });
      }

      const byteLength = Buffer.byteLength(comment, 'utf8');
      if (byteLength > 4096) {
        throw new AppError({ code: 'VALIDATION_FAILED', message: 'Reply comment exceeds maximum length of 4096 bytes', statusCode: 400 });
      }

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // 1. Get the review and its mapping
      const review = await tx.gbpReview.findUnique({
        where: { uq_gbp_review: { tenantId, reviewId } },
      });
      if (!review) throw new AppError({ code: 'RESOURCE_NOT_FOUND', message: 'Review not found', statusCode: 404 });

      const mapping = await tx.internalResourceMapping.findFirst({
        where: {
          tenantId,
          internalType: 'LOCATION',
          internalId: review.locationId,
        },
        include: { resource: { include: { account: true } } },
      });

      if (!mapping || !mapping.resource.account) {
        throw new AppError({ code: 'RESOURCE_NOT_FOUND', message: 'Location is not properly mapped to a Google account', statusCode: 404 });
      }

      const connection = await tx.integrationConnection.findFirst({
        where: { tenantId, status: 'ACTIVE' },
      });

      if (!connection) {
        throw new AppError({ code: 'TENANT_ACCESS_DENIED', message: 'Google integration is not connected', statusCode: 403 });
      }

      // 2. Refresh Token
      const accessToken = await GoogleOAuthService.refreshAccessToken(
        connection.encryptedRefreshToken,
        tenantId,
        connection.id
      );

      // 3. Call Google API
      const accountId = mapping.resource.account.externalAccountId.replace('accounts/', '');
      const locationId = mapping.resource.externalResourceId.replace('locations/', '');
      
      const oldValues = { replyComment: review.replyComment, replyUpdatedAt: review.replyUpdatedAt };

      const replyResponse = await GbpWriteClient.updateReply(
        accessToken,
        accountId,
        locationId,
        review.reviewId,
        comment.trim()
      );

      const replyUpdatedAt = replyResponse.updateTime ? new Date(replyResponse.updateTime) : new Date();

      // 4. Update Database
      const updated = await tx.gbpReview.update({
        where: { id: review.id },
        data: {
          replyComment: comment.trim(),
          replyUpdatedAt,
        },
      });

      // 5. Audit Log
      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: context.userId,
          actorRole: context.role,
          action: 'GBP_REVIEW_REPLY_CREATE',
          resourceType: 'GBP_REVIEW',
          resourceId: review.id,
          oldValues,
          newValues: { replyComment: comment.trim(), replyUpdatedAt },
          ipAddress: 'INTERNAL',
          userAgent: 'INTERNAL',
        },
      });

      return updated;
    });
  }

  /**
   * Delete a reply to a review.
   */
  public static async deleteReply(
    tenantId: string,
    reviewId: string,
    context: AuthorizedContext
  ) {
    AuthorizationService.assertCan(context, Action.GBP_WRITE);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const review = await tx.gbpReview.findUnique({
        where: { uq_gbp_review: { tenantId, reviewId } },
      });
      if (!review || !review.replyComment) {
        throw new AppError({ code: 'RESOURCE_NOT_FOUND', message: 'Review or reply not found', statusCode: 404 });
      }

      const mapping = await tx.internalResourceMapping.findFirst({
        where: {
          tenantId,
          internalType: 'LOCATION',
          internalId: review.locationId,
        },
        include: { resource: { include: { account: true } } },
      });

      if (!mapping || !mapping.resource.account) {
        throw new AppError({ code: 'RESOURCE_NOT_FOUND', message: 'Location is not properly mapped to a Google account', statusCode: 404 });
      }

      const connection = await tx.integrationConnection.findFirst({
        where: { tenantId, status: 'ACTIVE' },
      });

      if (!connection) {
        throw new AppError({ code: 'TENANT_ACCESS_DENIED', message: 'Google integration is not connected', statusCode: 403 });
      }

      const accessToken = await GoogleOAuthService.refreshAccessToken(
        connection.encryptedRefreshToken,
        tenantId,
        connection.id
      );

      const accountId = mapping.resource.account.externalAccountId.replace('accounts/', '');
      const locationId = mapping.resource.externalResourceId.replace('locations/', '');

      const oldValues = { replyComment: review.replyComment, replyUpdatedAt: review.replyUpdatedAt };

      await GbpWriteClient.deleteReply(accessToken, accountId, locationId, review.reviewId);

      const updated = await tx.gbpReview.update({
        where: { id: review.id },
        data: {
          replyComment: null,
          replyUpdatedAt: null,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: context.userId,
          actorRole: context.role,
          action: 'GBP_REVIEW_REPLY_DELETE',
          resourceType: 'GBP_REVIEW',
          resourceId: review.id,
          oldValues,
          newValues: { replyComment: null, replyUpdatedAt: null },
          ipAddress: 'INTERNAL',
          userAgent: 'INTERNAL',
        },
      });

      return updated;
    });
  }
}
