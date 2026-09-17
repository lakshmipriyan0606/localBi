import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import {
  Action,
  AuthorizationService,
  AuthorizedContext,
} from '@/shared/authorization/policy';
import {
  createResourceNotFoundError,
  createTenantAccessDeniedError,
  createValidationError,
} from '@/shared/errors';
import { logger } from '@/shared/observability/logger';

export interface LocationMatchSuggestion {
  internalLocationId: string;
  internalLocationName: string;
  internalAddress: string;
  externalResourceId: string;
  externalResourceName: string;
  externalGoogleId: string;
  confidenceScore: number; // 0 - 100
  matchReasons: string[];
}

export class ResourceMappingService {
  /**
   * Calculates similarity match score between an internal location and an external GBP resource.
   */
  public static calculateAddressMatch(
    internal: {
      name: string;
      storeCode?: string | null;
      addressLine1: string;
      city: string;
      postalCode: string;
      country: string;
    },
    external: {
      resourceName: string;
      externalResourceId: string;
    }
  ): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    const norm = (s?: string | null) => (s || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');

    // 1. Store code exact match (strongest signal)
    if (internal.storeCode && external.resourceName.toLowerCase().includes(internal.storeCode.toLowerCase())) {
      score += 50;
      reasons.push(`Store code "${internal.storeCode}" matches`);
    }

    // 2. City match in external name or resource title
    const cityNorm = norm(internal.city);
    if (cityNorm && norm(external.resourceName).includes(cityNorm)) {
      score += 25;
      reasons.push(`City "${internal.city}" matches`);
    }

    // 3. Name similarity
    const internalWords = internal.name.toLowerCase().split(/\s+/);
    const matchedWords = internalWords.filter(
      (w) => w.length > 2 && external.resourceName.toLowerCase().includes(w)
    );
    if (matchedWords.length > 0) {
      score += Math.min(25, matchedWords.length * 10);
      reasons.push(`Name keywords match: ${matchedWords.join(', ')}`);
    }

    return { score: Math.min(100, score), reasons };
  }

  /**
   * Maps an external GBP location resource to an internal Location.
   */
  public static async mapGbpLocation(
    tenantId: string,
    internalLocationId: string,
    externalResourceId: string,
    context: AuthorizedContext
  ) {
    AuthorizationService.assertCan(context, Action.INTEGRATION_MAP);

    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // 1. Validate internal location
      const internalLoc = await tx.location.findUnique({
        where: {
          uq_location_tenant_id: {
            tenantId,
            id: internalLocationId,
          },
        },
      });

      if (!internalLoc || internalLoc.isArchived) {
        throw createResourceNotFoundError('Location', internalLocationId);
      }

      AuthorizationService.assertBrandAccess(context, internalLoc.brandId);

      // 2. Validate external resource belongs to this tenant and is GBP LOCATION
      const extRes = await tx.externalResource.findUnique({
        where: {
          uq_external_resource_tenant_id: {
            tenantId,
            id: externalResourceId,
          },
        },
      });

      if (!extRes || extRes.resourceType !== 'LOCATION') {
        throw createValidationError(
          `Resource ${externalResourceId} is not a valid Google Business Profile location for this organization`
        );
      }

      // 3. Upsert internal resource mapping
      const mapping = await tx.internalResourceMapping.upsert({
        where: {
          uq_internal_resource_mapping: {
            tenantId,
            internalType: 'LOCATION',
            internalId: internalLocationId,
            resourceId: externalResourceId,
          },
        },
        create: {
          tenantId,
          internalType: 'LOCATION',
          internalId: internalLocationId,
          resourceId: externalResourceId,
        },
        update: {},
      });

      logger.info(
        { tenantId, internalLocationId, externalResourceId, mappingId: mapping.id },
        'Mapped GBP Location to internal Location'
      );

      return mapping;
    });
  }

  /**
   * Maps an external GSC Property resource to an internal Brand.
   */
  public static async mapGscProperty(
    tenantId: string,
    internalBrandId: string,
    externalResourceId: string,
    context: AuthorizedContext
  ) {
    AuthorizationService.assertCan(context, Action.INTEGRATION_MAP);
    AuthorizationService.assertBrandAccess(context, internalBrandId);

    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // 1. Validate internal brand
      const brand = await tx.brand.findUnique({
        where: {
          uq_brand_tenant_id: {
            tenantId,
            id: internalBrandId,
          },
        },
      });

      if (!brand || brand.isArchived) {
        throw createResourceNotFoundError('Brand', internalBrandId);
      }

      // 2. Validate external resource belongs to this tenant and is GSC PROPERTY
      const extRes = await tx.externalResource.findUnique({
        where: {
          uq_external_resource_tenant_id: {
            tenantId,
            id: externalResourceId,
          },
        },
      });

      if (!extRes || extRes.resourceType !== 'PROPERTY') {
        throw createValidationError(
          `Resource ${externalResourceId} is not a valid Google Search Console property for this organization`
        );
      }

      // 3. Upsert internal resource mapping
      const mapping = await tx.internalResourceMapping.upsert({
        where: {
          uq_internal_resource_mapping: {
            tenantId,
            internalType: 'BRAND',
            internalId: internalBrandId,
            resourceId: externalResourceId,
          },
        },
        create: {
          tenantId,
          internalType: 'BRAND',
          internalId: internalBrandId,
          resourceId: externalResourceId,
        },
        update: {},
      });

      // 4. Upsert GscProperty record for reporting
      const propertyUrl = extRes.externalResourceId;
      const propertyType = propertyUrl.startsWith('sc-domain:') ? 'DOMAIN' : 'URL_PREFIX';

      await tx.gscProperty.upsert({
        where: {
          uq_gsc_property_url: {
            tenantId,
            propertyUrl,
          },
        },
        create: {
          tenantId,
          resourceId: extRes.id,
          propertyUrl,
          propertyType,
        },
        update: {
          resourceId: extRes.id,
          propertyType,
        },
      });

      logger.info(
        { tenantId, internalBrandId, externalResourceId, propertyUrl },
        'Mapped GSC Property to internal Brand'
      );

      return mapping;
    });
  }

  /**
   * Lists all mappings and available resources for mapping in a tenant workspace.
   */
  public static async listTenantMappingState(tenantId: string, context: AuthorizedContext) {
    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const [connections, externalResources, internalMappings, brands, locations] =
        await Promise.all([
          tx.integrationConnection.findMany({
            where: { tenantId, status: 'ACTIVE' },
            select: {
              id: true,
              provider: true,
              externalEmail: true,
              createdAt: true,
              lastUsedAt: true,
            },
          }),
          tx.externalResource.findMany({
            where: { tenantId },
            include: {
              account: {
                select: { accountName: true, provider: true },
              },
            },
          }),
          tx.internalResourceMapping.findMany({
            where: { tenantId },
            include: {
              resource: true,
            },
          }),
          tx.brand.findMany({
            where: { tenantId, isArchived: false },
            select: { id: true, name: true, slug: true },
          }),
          tx.location.findMany({
            where: { tenantId, isArchived: false },
            select: {
              id: true,
              brandId: true,
              name: true,
              storeCode: true,
              addressLine1: true,
              city: true,
              state: true,
              postalCode: true,
              country: true,
              timezone: true,
            },
          }),
        ]);

      return {
        connections,
        externalResources,
        internalMappings,
        brands,
        locations,
      };
    });
  }

  /**
   * Removes an existing resource mapping.
   */
  public static async unmapResource(tenantId: string, mappingId: string, context: AuthorizedContext) {
    AuthorizationService.assertCan(context, Action.INTEGRATION_MAP);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const mapping = await tx.internalResourceMapping.findUnique({
        where: { id: mappingId },
      });

      if (!mapping || mapping.tenantId !== tenantId) {
        throw createResourceNotFoundError('InternalResourceMapping', mappingId);
      }

      await tx.internalResourceMapping.delete({
        where: { id: mappingId },
      });

      return { success: true };
    });
  }
}
