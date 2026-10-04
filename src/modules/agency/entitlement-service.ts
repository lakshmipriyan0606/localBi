import { prisma } from '../../shared/database/client';
import { TenantContextService } from '../../shared/database/tenant-context';
import {
  AuthorizedContext,
  AuthorizationService,
  Action,
} from '../../shared/authorization/policy';
import {
  createFeatureNotEntitledError,
  createEntitlementLimitExceededError,
  createTenantAccessDeniedError,
} from '../../shared/errors';
import { logger } from '../../shared/observability/logger';
import { FeatureKey, FeatureKeyType, EntitlementDto } from './agency-types';

export class EntitlementService {
  /**
   * Checks whether a feature is entitled and enabled for a tenant or specific client account.
   */
  public static async hasFeature(
    tenantId: string,
    featureKey: string,
    clientAccountId?: string | null
  ): Promise<boolean> {
    // 1. Check workspace/tenant entitlement
    const tenantEntitlement = await prisma.tenantEntitlement.findUnique({
      where: {
        tenantId_featureKey: {
          tenantId,
          featureKey,
        },
      },
    });

    if (tenantEntitlement && !tenantEntitlement.enabled) {
      return false;
    }

    // 2. If client account specified, check client-level override
    if (clientAccountId) {
      const clientEntitlement = await prisma.clientFeatureEntitlement.findUnique({
        where: {
          uq_client_feature_entitlement: {
            tenantId,
            clientAccountId,
            featureKey,
          },
        },
      });

      if (clientEntitlement !== null) {
        return clientEntitlement.enabled;
      }
    }

    // Default to true if not explicitly restricted
    return true;
  }

  /**
   * Asserts that a feature is enabled; throws FEATURE_NOT_ENTITLED (403) if not.
   */
  public static async assertFeature(
    tenantId: string,
    featureKey: string,
    clientAccountId?: string | null,
    requestId?: string
  ): Promise<void> {
    const isEntitled = await this.hasFeature(tenantId, featureKey, clientAccountId);
    if (!isEntitled) {
      throw createFeatureNotEntitledError(featureKey, clientAccountId || undefined, requestId);
    }
  }

  /**
   * Configures a tenant-wide feature entitlement and limits.
   */
  public static async setTenantEntitlement(
    tenantId: string,
    featureKey: string,
    enabled: boolean,
    limits: Record<string, unknown> = {},
    context?: AuthorizedContext
  ): Promise<void> {
    if (context) {
      if (context.tenantId !== tenantId) {
        throw createTenantAccessDeniedError(tenantId);
      }
      AuthorizationService.assertCan(context, Action.ENTITLEMENT_MANAGE);
    }

    await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      await tx.tenantEntitlement.upsert({
        where: {
          tenantId_featureKey: {
            tenantId,
            featureKey,
          },
        },
        create: {
          tenantId,
          featureKey,
          enabled,
          limits: limits as object,
          source: 'MANUAL_OVERRIDE',
        },
        update: {
          enabled,
          limits: limits as object,
          source: 'MANUAL_OVERRIDE',
        },
      });

      if (context) {
        await tx.auditLog.create({
          data: {
            tenantId,
            actorId: context.userId,
            actorRole: context.role,
            action: 'entitlement:set_tenant',
            resourceType: 'TenantEntitlement',
            resourceId: featureKey,
            payload: { featureKey, enabled, limits },
          },
        });
      }

      logger.info({ tenantId, featureKey, enabled }, 'Tenant entitlement set');
    });
  }

  /**
   * Configures a client-specific feature override and limits under an agency tenant.
   */
  public static async setClientEntitlement(
    tenantId: string,
    clientAccountId: string,
    featureKey: string,
    enabled: boolean,
    limits: Record<string, unknown> = {},
    context?: AuthorizedContext
  ): Promise<void> {
    if (context) {
      if (context.tenantId !== tenantId) {
        throw createTenantAccessDeniedError(tenantId);
      }
      AuthorizationService.assertCan(context, Action.ENTITLEMENT_MANAGE);
      AuthorizationService.assertClientAccess(context, clientAccountId);
    }

    await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      await tx.clientFeatureEntitlement.upsert({
        where: {
          uq_client_feature_entitlement: {
            tenantId,
            clientAccountId,
            featureKey,
          },
        },
        create: {
          tenantId,
          clientAccountId,
          featureKey,
          enabled,
          limits: limits as object,
        },
        update: {
          enabled,
          limits: limits as object,
        },
      });

      if (context) {
        await tx.auditLog.create({
          data: {
            tenantId,
            actorId: context.userId,
            actorRole: context.role,
            action: 'entitlement:set_client',
            resourceType: 'ClientFeatureEntitlement',
            resourceId: `${clientAccountId}:${featureKey}`,
            payload: { clientAccountId, featureKey, enabled, limits },
          },
        });
      }

      logger.info({ tenantId, clientAccountId, featureKey, enabled }, 'Client entitlement override set');
    });
  }

  /**
   * Retrieves all feature entitlements for a workspace or client account.
   */
  public static async getEntitlements(
    tenantId: string,
    clientAccountId?: string | null
  ): Promise<EntitlementDto[]> {
    const tenantRecords = await prisma.tenantEntitlement.findMany({
      where: { tenantId },
    });

    const tenantMap = new Map(tenantRecords.map((r) => [r.featureKey, r]));

    let clientMap = new Map<string, { enabled: boolean; limits: unknown }>();
    if (clientAccountId) {
      const clientRecords = await prisma.clientFeatureEntitlement.findMany({
        where: { tenantId, clientAccountId },
      });
      clientMap = new Map(clientRecords.map((r) => [r.featureKey, r]));
    }

    const allKeys = Object.values(FeatureKey);

    return allKeys.map((key) => {
      const clientOverride = clientMap.get(key);
      if (clientOverride) {
        return {
          featureKey: key,
          enabled: clientOverride.enabled,
          limits: (clientOverride.limits as Record<string, unknown>) || {},
          source: 'CLIENT_OVERRIDE',
        };
      }

      const tenantRecord = tenantMap.get(key);
      if (tenantRecord) {
        return {
          featureKey: key,
          enabled: tenantRecord.enabled,
          limits: (tenantRecord.limits as Record<string, unknown>) || {},
          source: tenantRecord.source as 'PLAN_DEFAULT' | 'MANUAL_OVERRIDE',
        };
      }

      return {
        featureKey: key,
        enabled: true,
        limits: {},
        source: 'PLAN_DEFAULT',
      };
    });
  }

  /**
   * Asserts numeric quota limit enforcement.
   */
  public static async assertLimit(
    tenantId: string,
    featureKey: string,
    metric: string,
    currentCount: number,
    clientAccountId?: string | null,
    requestId?: string
  ): Promise<void> {
    const entitlements = await this.getEntitlements(tenantId, clientAccountId);
    const ent = entitlements.find((e) => e.featureKey === featureKey);

    if (!ent || !ent.enabled) {
      throw createFeatureNotEntitledError(featureKey, clientAccountId || undefined, requestId);
    }

    const limitVal = ent.limits[metric];
    if (typeof limitVal === 'number' && limitVal > 0) {
      if (currentCount >= limitVal) {
        throw createEntitlementLimitExceededError(featureKey, metric, limitVal, currentCount, requestId);
      }
    }
  }
}
