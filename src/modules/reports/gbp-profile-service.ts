import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { AuthorizedContext, AuthorizationService, Action } from '@/shared/authorization/policy';
import { GbpWriteClient } from '@/modules/integrations/google/gbp-write-client';
import { GoogleOAuthService } from '@/modules/integrations/google/google-oauth-service';
import { GoogleConnectionResolver } from '@/modules/integrations/google/google-connection-resolver';

export class GbpProfileService {
  /**
   * Fetches the GBP profile data for a specific location directly from Google APIs.
   * Deterministically resolves the authorized Google connection through the location's mapping.
   */
  public static async getProfile(context: AuthorizedContext, tenantId: string, locationId: string) {
    AuthorizationService.assertCan(context, Action.DASHBOARD_VIEW);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const resolved = await GoogleConnectionResolver.resolveForLocation(tx, tenantId, locationId);

      const accessToken = await GoogleOAuthService.refreshAccessToken(
        resolved.encryptedRefreshToken,
        tenantId,
        resolved.connectionId
      );

      const profileData = await GbpWriteClient.getProfile(accessToken, resolved.externalResourceId);
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
      const resolved = await GoogleConnectionResolver.resolveForLocation(tx, tenantId, locationId);

      const accessToken = await GoogleOAuthService.refreshAccessToken(
        resolved.encryptedRefreshToken,
        tenantId,
        resolved.connectionId
      );

      const updatedData = await GbpWriteClient.updateProfile(
        accessToken,
        resolved.externalResourceId,
        updateMask,
        data
      );

      // Audit Logging
      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: context.userId,
          actorRole: context.role,
          action: 'GBP_PROFILE_UPDATE',
          resourceType: 'GBP_LOCATION',
          resourceId: resolved.externalResourceId,
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
      const resolved = await GoogleConnectionResolver.resolveForLocation(tx, tenantId, locationId);

      const accessToken = await GoogleOAuthService.refreshAccessToken(
        resolved.encryptedRefreshToken,
        tenantId,
        resolved.connectionId
      );

      return GbpWriteClient.getVerificationState(accessToken, resolved.externalResourceId);
    });
  }
}
