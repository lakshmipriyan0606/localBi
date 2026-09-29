import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { AuthorizedContext, AuthorizationService, Action } from '@/shared/authorization/policy';
import { GbpWriteClient } from '@/modules/integrations/google/gbp-write-client';
import { GoogleOAuthService } from '@/modules/integrations/google/google-oauth-service';
import { AppError } from '@/shared/errors';

export interface GetPostsFilters {
  tenantId: string;
  brandId?: string;
  locationId?: string;
  page?: number;
  pageSize?: number;
  context: AuthorizedContext;
}

export class GbpPostsService {
  /**
   * Syncs and lists posts for a given location, using the DB cache when possible.
   */
  public static async listPosts(filters: GetPostsFilters) {
    AuthorizationService.assertCan(filters.context, Action.DASHBOARD_VIEW);

    const { tenantId, brandId, locationId, page = 1, pageSize = 50 } = filters;
    const skip = (page - 1) * pageSize;

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const whereInput: any = { tenantId };
      if (locationId) {
        whereInput.locationId = locationId;
      } else if (brandId) {
        whereInput.location = { brandId };
      }

      const totalCount = await tx.gbpPost.count({ where: whereInput });
      const items = await tx.gbpPost.findMany({
        where: whereInput,
        include: { location: { select: { name: true, storeCode: true } } },
        orderBy: { updateTime: 'desc' },
        skip,
        take: pageSize,
      });

      return { items, totalCount, page, pageSize };
    });
  }

  /**
   * Syncs posts from Google API to local database.
   */
  public static async syncPostsFromGoogle(context: AuthorizedContext, tenantId: string, locationId: string) {
    AuthorizationService.assertCan(context, Action.DASHBOARD_VIEW);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const mapping = await tx.internalResourceMapping.findFirst({
        where: { tenantId, internalType: 'LOCATION', internalId: locationId },
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

      const accessToken = await GoogleOAuthService.refreshAccessToken(connection.encryptedRefreshToken, tenantId, connection.id);
      
      const response = await GbpWriteClient.listPosts(accessToken, mapping.resource.account.externalAccountId, mapping.resource.externalResourceId);
      const posts = response.localPosts || [];

      // Upsert into local DB
      for (const p of posts) {
        await tx.gbpPost.upsert({
          where: { uq_gbp_post: { tenantId, postId: p.name } },
          create: {
            tenantId,
            locationId,
            postId: p.name,
            topicType: p.topicType,
            languageCode: p.languageCode,
            summary: p.summary || '',
            callToAction: p.callToAction || null,
            event: p.event || null,
            offer: p.offer || null,
            state: p.state || 'LIVE',
            createTime: new Date(p.createTime || Date.now()),
            updateTime: new Date(p.updateTime || Date.now()),
          },
          update: {
            topicType: p.topicType,
            languageCode: p.languageCode,
            summary: p.summary || '',
            callToAction: p.callToAction || null,
            event: p.event || null,
            offer: p.offer || null,
            state: p.state || 'LIVE',
            updateTime: new Date(p.updateTime || Date.now()),
          },
        });
      }

      return posts.length;
    });
  }

  /**
   * Creates a post via Google API and persists locally.
   */
  public static async createPost(context: AuthorizedContext, tenantId: string, locationId: string, data: any) {
    AuthorizationService.assertCan(context, Action.GBP_WRITE);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const mapping = await tx.internalResourceMapping.findFirst({
        where: { tenantId, internalType: 'LOCATION', internalId: locationId },
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

      const accessToken = await GoogleOAuthService.refreshAccessToken(connection.encryptedRefreshToken, tenantId, connection.id);
      
      const p = await GbpWriteClient.createPost(accessToken, mapping.resource.account.externalAccountId, mapping.resource.externalResourceId, data);
      
      // Save locally
      const savedPost = await tx.gbpPost.create({
        data: {
          tenantId,
          locationId,
          postId: p.name,
          topicType: p.topicType,
          languageCode: p.languageCode,
          summary: p.summary || '',
          callToAction: p.callToAction || null,
          event: p.event || null,
          offer: p.offer || null,
          state: p.state || 'LIVE',
          createTime: new Date(p.createTime || Date.now()),
          updateTime: new Date(p.updateTime || Date.now()),
        }
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: context.userId,
          actorRole: context.role,
          action: 'GBP_POST_CREATE',
          resourceType: 'GBP_LOCATION',
          resourceId: mapping.resource.externalResourceId,
          newValues: { postId: p.name, summary: p.summary },
          ipAddress: 'INTERNAL',
          userAgent: 'INTERNAL',
        },
      });

      return savedPost;
    });
  }

  public static async deletePost(context: AuthorizedContext, tenantId: string, locationId: string, postId: string) {
    AuthorizationService.assertCan(context, Action.GBP_WRITE);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const mapping = await tx.internalResourceMapping.findFirst({
        where: { tenantId, internalType: 'LOCATION', internalId: locationId },
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

      const accessToken = await GoogleOAuthService.refreshAccessToken(connection.encryptedRefreshToken, tenantId, connection.id);
      
      await GbpWriteClient.deletePost(accessToken, mapping.resource.account.externalAccountId, mapping.resource.externalResourceId, postId);
      
      await tx.gbpPost.deleteMany({
        where: { tenantId, postId }
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: context.userId,
          actorRole: context.role,
          action: 'GBP_POST_DELETE',
          resourceType: 'GBP_LOCATION',
          resourceId: mapping.resource.externalResourceId,
          oldValues: { postId },
          ipAddress: 'INTERNAL',
          userAgent: 'INTERNAL',
        },
      });
    });
  }
}
