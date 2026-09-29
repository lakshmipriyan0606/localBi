import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { AuthorizedContext, AuthorizationService, Action } from '@/shared/authorization/policy';
import { GbpWriteClient } from '@/modules/integrations/google/gbp-write-client';
import { GoogleOAuthService } from '@/modules/integrations/google/google-oauth-service';
import { AppError } from '@/shared/errors';

export interface GetMediaFilters {
  tenantId: string;
  brandId?: string;
  locationId?: string;
  page?: number;
  pageSize?: number;
  context: AuthorizedContext;
}

export class GbpMediaService {
  /**
   * Lists media for a given location, using the DB cache when possible.
   */
  public static async listMedia(filters: GetMediaFilters) {
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

      const totalCount = await tx.gbpMedia.count({ where: whereInput });
      const items = await tx.gbpMedia.findMany({
        where: whereInput,
        include: { location: { select: { name: true, storeCode: true } } },
        orderBy: { createTime: 'desc' },
        skip,
        take: pageSize,
      });

      return { items, totalCount, page, pageSize };
    });
  }

  /**
   * Syncs media from Google API to local database.
   */
  public static async syncMediaFromGoogle(context: AuthorizedContext, tenantId: string, locationId: string) {
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
      
      const response = await GbpWriteClient.listMedia(accessToken, mapping.resource.account.externalAccountId, mapping.resource.externalResourceId);
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
            mediaFormat: m.mediaFormat || 'PHOTO',
            sourceUrl: m.sourceUrl || m.googleUrl || '',
            thumbnailUrl: m.thumbnailUrl || null,
            category: m.locationAssociation?.category || 'CATEGORY_UNSPECIFIED',
          },
        });
      }

      return mediaItems.length;
    });
  }

  /**
   * Creates a media item via Google API and persists locally.
   */
  public static async createMedia(context: AuthorizedContext, tenantId: string, locationId: string, data: any) {
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
      
      const m = await GbpWriteClient.createMedia(accessToken, mapping.resource.account.externalAccountId, mapping.resource.externalResourceId, data);
      
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
          resourceId: mapping.resource.externalResourceId,
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
      
      await GbpWriteClient.deleteMedia(accessToken, mapping.resource.account.externalAccountId, mapping.resource.externalResourceId, mediaKey);
      
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
          resourceId: mapping.resource.externalResourceId,
          oldValues: { mediaKey },
          ipAddress: 'INTERNAL',
          userAgent: 'INTERNAL',
        },
      });
    });
  }
}
