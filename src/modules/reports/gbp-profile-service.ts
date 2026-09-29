import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { AuthorizedContext, AuthorizationService, Action } from '@/shared/authorization/policy';
import { GbpWriteClient } from '@/modules/integrations/google/gbp-write-client';
import { GoogleOAuthService } from '@/modules/integrations/google/google-oauth-service';
import { AppError } from '@/shared/errors';

export class GbpProfileService {
  /**
   * Fetches the GBP profile data for a specific location directly from Google APIs.
   */
  public static async getProfile(context: AuthorizedContext, tenantId: string, locationId: string) {
    AuthorizationService.assertCan(context, Action.DASHBOARD_VIEW);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // 1. Validate mapping
      const mapping = await tx.internalResourceMapping.findFirst({
        where: {
          tenantId,
          internalType: 'LOCATION',
          internalId: locationId,
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

      // 2. Auth & Fetch
      const accessToken = await GoogleOAuthService.refreshAccessToken(
        connection.encryptedRefreshToken,
        tenantId,
        connection.id
      );

      const profileData = await GbpWriteClient.getProfile(accessToken, mapping.resource.externalResourceId);
      return profileData;
    });
  }

  /**
   * Updates the GBP profile via the Google Business Information API.
   * `updateMask` should precisely list the fields being updated (e.g. `title,phoneNumbers`).
   */
  public static async updateProfile(context: AuthorizedContext, tenantId: string, locationId: string, updateMask: string, data: any) {
    AuthorizationService.assertCan(context, Action.GBP_WRITE);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // 1. Validate mapping
      const mapping = await tx.internalResourceMapping.findFirst({
        where: {
          tenantId,
          internalType: 'LOCATION',
          internalId: locationId,
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

      // 2. Auth & Update
      const accessToken = await GoogleOAuthService.refreshAccessToken(
        connection.encryptedRefreshToken,
        tenantId,
        connection.id
      );

      const updatedData = await GbpWriteClient.updateProfile(
        accessToken,
        mapping.resource.externalResourceId,
        updateMask,
        data
      );

      // 3. Audit Logging
      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: context.userId,
          actorRole: context.role,
          action: 'GBP_PROFILE_UPDATE',
          resourceType: 'GBP_LOCATION',
          resourceId: mapping.resource.externalResourceId,
          newValues: { updateMask, data },
          ipAddress: 'INTERNAL',
          userAgent: 'INTERNAL',
        },
      });

      return updatedData;
    });
  }

  public static async getVerificationState(context: AuthorizedContext, tenantId: string, locationId: string) {
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

      const accessToken = await GoogleOAuthService.refreshAccessToken(
        connection.encryptedRefreshToken,
        tenantId,
        connection.id
      );

      return GbpWriteClient.getVerificationState(accessToken, mapping.resource.externalResourceId);
    });
  }
}
