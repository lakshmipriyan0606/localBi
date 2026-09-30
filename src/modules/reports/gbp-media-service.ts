import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { AuthorizedContext, AuthorizationService, Action } from '@/shared/authorization/policy';
import { GbpWriteClient } from '@/modules/integrations/google/gbp-write-client';
import { GoogleOAuthService } from '@/modules/integrations/google/google-oauth-service';
import { GoogleConnectionResolver } from '@/modules/integrations/google/google-connection-resolver';
import { AppError } from '@/shared/errors';

export class GbpMediaService {
  /**
   * List media items for a location from the local database.
   */
  public static async listMedia(
    context: AuthorizedContext,
    tenantId: string,
    locationId: string,
    category?: string
  ) {
    AuthorizationService.assertCan(context, Action.DASHBOARD_VIEW);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const where: any = { tenantId, locationId };
      if (category && category !== 'ALL') {
        where.category = category;
      }

      const media = await tx.gbpMedia.findMany({
        where,
        orderBy: { createTime: 'desc' },
      });

      return media;
    });
  }

  /**
   * Sync media items directly from Google for a given location.
   */
  public static async syncMediaFromGoogle(context: AuthorizedContext, tenantId: string, locationId: string) {
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
      
      const response = await GbpWriteClient.listMedia(accessToken, mapping.resource.account.externalAccountId, resolved.externalResourceId);
      const mediaItems = response.mediaItems || [];

      // Upsert into local DB
      for (const m of mediaItems) {
        await tx.gbpMedia.upsert({
          where: { uq_gbp_media: { tenantId, mediaKey: m.name } },
          create: {
            tenantId,
            locationId,
            mediaKey: m.name,
            mediaFormat: m.mediaFormat || 'PHOTO',
            sourceUrl: m.sourceUrl || m.googleUrl || '',
            thumbnailUrl: m.thumbnailUrl || null,
            category: m.locationAssociation?.category || 'CATEGORY_UNSPECIFIED',
            createTime: new Date(m.createTime || Date.now()),
          },
          update: {
            sourceUrl: m.sourceUrl || m.googleUrl || '',
            thumbnailUrl: m.thumbnailUrl || null,
            category: m.locationAssociation?.category || 'CATEGORY_UNSPECIFIED',
          }
        });
      }

      return { count: mediaItems.length };
    });
  }

  public static async uploadMedia(
    context: AuthorizedContext,
    tenantId: string,
    locationId: string,
    data: {
      mediaFormat: 'PHOTO' | 'VIDEO';
      locationAssociation: { category: string };
      sourceUrl: string;
    }
  ) {
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
      
      const m = await GbpWriteClient.createMedia(accessToken, mapping.resource.account.externalAccountId, resolved.externalResourceId, data);
      
      // Save locally
      const savedMedia = await tx.gbpMedia.create({
        data: {
          tenantId,
          locationId,
          mediaKey: m.name,
          mediaFormat: m.mediaFormat || 'PHOTO',
          sourceUrl: m.sourceUrl || m.googleUrl || '',
          thumbnailUrl: m.thumbnailUrl || null,
          category: m.locationAssociation?.category || 'CATEGORY_UNSPECIFIED',
          createTime: new Date(m.createTime || Date.now()),
        }
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: context.userId,
          actorRole: context.role,
          action: 'GBP_MEDIA_CREATE',
          resourceType: 'GBP_LOCATION',
          resourceId: resolved.externalResourceId,
          newValues: { mediaKey: m.name, category: savedMedia.category },
          ipAddress: 'INTERNAL',
          userAgent: 'INTERNAL',
        },
      });

      return savedMedia;
    });
  }

  public static async deleteMedia(context: AuthorizedContext, tenantId: string, locationId: string, mediaKey: string) {
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
      
      await GbpWriteClient.deleteMedia(accessToken, mapping.resource.account.externalAccountId, resolved.externalResourceId, mediaKey);
      
      await tx.gbpMedia.deleteMany({
        where: { tenantId, mediaKey }
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: context.userId,
          actorRole: context.role,
          action: 'GBP_MEDIA_DELETE',
          resourceType: 'GBP_LOCATION',
          resourceId: resolved.externalResourceId,
          oldValues: { mediaKey },
          ipAddress: 'INTERNAL',
          userAgent: 'INTERNAL',
        },
      });

      return { success: true };
    });
  }
}
