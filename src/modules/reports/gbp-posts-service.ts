import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { AuthorizedContext, AuthorizationService, Action } from '@/shared/authorization/policy';
import { GbpWriteClient } from '@/modules/integrations/google/gbp-write-client';
import { GoogleOAuthService } from '@/modules/integrations/google/google-oauth-service';
import { GoogleConnectionResolver } from '@/modules/integrations/google/google-connection-resolver';
import { AppError } from '@/shared/errors';

export class GbpPostsService {
  /**
   * List posts for a location from the local database.
   */
  public static async listPosts(
    context: AuthorizedContext,
    tenantId: string,
    locationId: string
  ) {
    AuthorizationService.assertCan(context, Action.DASHBOARD_VIEW);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const posts = await tx.gbpPost.findMany({
        where: { tenantId, locationId },
        orderBy: { createTime: 'desc' },
      });

      return posts;
    });
  }

  /**
   * Sync posts directly from Google for a given location.
   */
  public static async syncPostsFromGoogle(context: AuthorizedContext, tenantId: string, locationId: string) {
    AuthorizationService.assertCan(context, Action.DASHBOARD_VIEW);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const resolved = await GoogleConnectionResolver.resolveForLocation(tx, tenantId, locationId);

      const mapping = await tx.internalResourceMapping.findFirst({
        where: { tenantId, internalType: 'LOCATION', internalId: locationId },
        include: { resource: { include: { account: true } } },
      });

      if (!mapping || !mapping.resource.account) {
        throw new AppError({ code: 'RESOURCE_NOT_FOUND', message: 'Location is not properly mapped to a Google account', statusCode: 404 });
      }

      const accessToken = await GoogleOAuthService.refreshAccessToken(resolved.encryptedRefreshToken, tenantId, resolved.connectionId);
      
      const response = await GbpWriteClient.listPosts(accessToken, mapping.resource.account.externalAccountId, resolved.externalResourceId);
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
      const resolved = await GoogleConnectionResolver.resolveForLocation(tx, tenantId, locationId);

      const mapping = await tx.internalResourceMapping.findFirst({
        where: { tenantId, internalType: 'LOCATION', internalId: locationId },
        include: { resource: { include: { account: true } } },
      });

      if (!mapping || !mapping.resource.account) {
        throw new AppError({ code: 'RESOURCE_NOT_FOUND', message: 'Location is not properly mapped to a Google account', statusCode: 404 });
      }

      const accessToken = await GoogleOAuthService.refreshAccessToken(resolved.encryptedRefreshToken, tenantId, resolved.connectionId);
      
      const p = await GbpWriteClient.createPost(accessToken, mapping.resource.account.externalAccountId, resolved.externalResourceId, data);
      
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
          resourceId: resolved.externalResourceId,
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
      const resolved = await GoogleConnectionResolver.resolveForLocation(tx, tenantId, locationId);

      const mapping = await tx.internalResourceMapping.findFirst({
        where: { tenantId, internalType: 'LOCATION', internalId: locationId },
        include: { resource: { include: { account: true } } },
      });

      if (!mapping || !mapping.resource.account) {
        throw new AppError({ code: 'RESOURCE_NOT_FOUND', message: 'Location is not properly mapped to a Google account', statusCode: 404 });
      }

      const accessToken = await GoogleOAuthService.refreshAccessToken(resolved.encryptedRefreshToken, tenantId, resolved.connectionId);
      
      await GbpWriteClient.deletePost(accessToken, mapping.resource.account.externalAccountId, resolved.externalResourceId, postId);
      
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
          resourceId: resolved.externalResourceId,
          oldValues: { postId },
          ipAddress: 'INTERNAL',
          userAgent: 'INTERNAL',
        },
      });
    });
  }
}
