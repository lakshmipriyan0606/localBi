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
import { getRedisClient } from '@/shared/database/redis-client';
import { AnalyticsUrlNormalizer } from '@/modules/analytics/url-normalizer';

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
      const extRes = await tx.externalResource.findFirst({
        where: {
          tenantId,
          resourceType: 'LOCATION',
          OR: [
            { id: externalResourceId },
            { externalResourceId: externalResourceId },
          ],
        },
      });

      if (!extRes || extRes.resourceType !== 'LOCATION') {
        throw createValidationError(
          `Resource ${externalResourceId} is not a valid Google Business Profile location for this organization`
        );
      }

      // 3. Enforce 1:1 mapping:
      // Check if this specific GBP resource is ALREADY mapped to a different location in this tenant
      const existingMappingForResource = await tx.internalResourceMapping.findFirst({
        where: {
          tenantId,
          internalType: 'LOCATION',
          resourceId: extRes.id,
          internalId: { not: internalLocationId },
        },
      });

      if (existingMappingForResource) {
        throw createValidationError(
          `This Google Business Profile location is already mapped to another store in your organization. Please unmap it first before reassigning.`
        );
      }

      // Remove any existing GBP mapping for this internal location
      await tx.internalResourceMapping.deleteMany({
        where: {
          tenantId,
          internalType: 'LOCATION',
          internalId: internalLocationId,
          resource: {
            provider: 'GOOGLE_BUSINESS_PROFILE',
          },
        },
      });

      // 4. Upsert internal resource mapping
      const mapping = await tx.internalResourceMapping.upsert({
        where: {
          uq_internal_resource_mapping: {
            tenantId,
            internalType: 'LOCATION',
            internalId: internalLocationId,
            resourceId: extRes.id,
          },
        },
        create: {
          tenantId,
          internalType: 'LOCATION',
          internalId: internalLocationId,
          resourceId: extRes.id,
        },
        update: {},
      });

      logger.info(
        { tenantId, internalLocationId, externalResourceId: extRes.externalResourceId, mappingId: mapping.id },
        'Mapped GBP Location to internal Location'
      );

      // Invalidate Redis profile/report cache for this location
      try {
        const redis = getRedisClient();
        await redis.del(`gbp:profile:${tenantId}:${internalLocationId}`);
      } catch {
        // Redis optional
      }

      return mapping;
    });
  }

  /**
   * Automatically matches and maps all unmapped GBP locations belonging to a specific Brand.
   * Leverages storeCode, city, and name similarity matching.
   */
  public static async autoMapBrandLocations(
    tenantId: string,
    brandId: string,
    context: AuthorizedContext
  ): Promise<{
    brandId: string;
    brandName: string;
    mappedCount: number;
    mappings: Array<{
      locationId: string;
      locationName: string;
      externalResourceId: string;
      resourceName: string;
      confidenceScore: number;
    }>;
  }> {
    AuthorizationService.assertCan(context, Action.INTEGRATION_MAP);
    AuthorizationService.assertBrandAccess(context, brandId);

    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // 1. Verify brand exists
      const brand = await tx.brand.findUnique({
        where: { uq_brand_tenant_id: { tenantId, id: brandId } },
      });
      if (!brand || brand.isArchived) {
        throw createResourceNotFoundError('Brand', brandId);
      }

      // 2. Fetch all locations for this brand that are not archived
      const locations = await tx.location.findMany({
        where: { tenantId, brandId, isArchived: false },
      });

      // 3. Fetch existing mappings for this tenant
      const existingMappings = await tx.internalResourceMapping.findMany({
        where: { tenantId, internalType: 'LOCATION' },
      });
      const mappedLocationIds = new Set(existingMappings.map((m) => m.internalId));
      const mappedResourceIds = new Set(existingMappings.map((m) => m.resourceId));

      // 4. Fetch all GBP external resources for this tenant
      const gbpResources = await tx.externalResource.findMany({
        where: { tenantId, resourceType: 'LOCATION' },
        include: { account: { select: { accountName: true } } },
      });

      const availableGbpResources = gbpResources.filter((r) => !mappedResourceIds.has(r.id));
      const unmappedLocations = locations.filter((loc) => !mappedLocationIds.has(loc.id));
      const newlyMapped: Array<{
        locationId: string;
        locationName: string;
        externalResourceId: string;
        resourceName: string;
        confidenceScore: number;
      }> = [];

      const usedResourceIds = new Set<string>();

      for (const loc of unmappedLocations) {
        let bestCandidate: { res: (typeof availableGbpResources)[0]; score: number } | null = null;

        for (const res of availableGbpResources) {
          if (usedResourceIds.has(res.id)) continue;

          const match = this.calculateAddressMatch(
            {
              name: loc.name,
              storeCode: loc.storeCode,
              addressLine1: loc.addressLine1,
              city: loc.city,
              postalCode: loc.postalCode,
              country: loc.country,
            },
            {
              resourceName: res.resourceName,
              externalResourceId: res.externalResourceId,
            }
          );

          let totalScore = match.score;

          // Bonus if the resource or account matches the brand name
          const brandKeywords = brand.name.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
          const resText = `${res.resourceName} ${res.account?.accountName || ''}`.toLowerCase();
          const hasBrandMatch = brandKeywords.some((k) => resText.includes(k));
          if (hasBrandMatch) {
            totalScore += 30;
          }

          if (totalScore >= 25 && (!bestCandidate || totalScore > bestCandidate.score)) {
            bestCandidate = { res, score: Math.min(100, totalScore) };
          }
        }

        if (bestCandidate) {
          usedResourceIds.add(bestCandidate.res.id);

          await tx.internalResourceMapping.upsert({
            where: {
              uq_internal_resource_mapping: {
                tenantId,
                internalType: 'LOCATION',
                internalId: loc.id,
                resourceId: bestCandidate.res.id,
              },
            },
            create: {
              tenantId,
              internalType: 'LOCATION',
              internalId: loc.id,
              resourceId: bestCandidate.res.id,
            },
            update: {},
          });

          newlyMapped.push({
            locationId: loc.id,
            locationName: loc.name,
            externalResourceId: bestCandidate.res.externalResourceId,
            resourceName: bestCandidate.res.resourceName,
            confidenceScore: bestCandidate.score,
          });
        }
      }

      logger.info(
        { tenantId, brandId, brandName: brand.name, mappedCount: newlyMapped.length },
        'Auto-mapped GBP locations for brand'
      );

      return {
        brandId: brand.id,
        brandName: brand.name,
        mappedCount: newlyMapped.length,
        mappings: newlyMapped,
      };
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
      // 1. Verify brand exists
      const brand = await tx.brand.findUnique({
        where: { uq_brand_tenant_id: { tenantId, id: internalBrandId } },
      });
      if (!brand || brand.isArchived) {
        throw createResourceNotFoundError('Brand', internalBrandId);
      }

      // 2. Fetch GSC external resource
      const extRes = await tx.externalResource.findFirst({
        where: {
          tenantId,
          provider: 'GOOGLE_SEARCH_CONSOLE',
          resourceType: 'PROPERTY',
          OR: [
            { id: externalResourceId },
            { externalResourceId: externalResourceId },
          ],
        },
      });

      if (!extRes || extRes.provider !== 'GOOGLE_SEARCH_CONSOLE' || extRes.resourceType !== 'PROPERTY') {
        throw createResourceNotFoundError('GSC Property', externalResourceId);
      }

      // 3. Enforce 1:1 mapping (Brand to GSC Property) by removing any existing GSC mappings for this Brand
      await tx.internalResourceMapping.deleteMany({
        where: {
          tenantId,
          internalType: 'BRAND',
          internalId: internalBrandId,
          resource: {
            provider: 'GOOGLE_SEARCH_CONSOLE',
          },
        },
      });

      // Also ensure this specific GSC property isn't mapped to another brand (1:1 constraint the other way)
      await tx.internalResourceMapping.deleteMany({
        where: {
          tenantId,
          resourceId: extRes.id,
          internalType: 'BRAND',
        },
      });

      // 4. Upsert internal resource mapping
      const mapping = await tx.internalResourceMapping.upsert({
        where: {
          uq_internal_resource_mapping: {
            tenantId,
            internalType: 'BRAND',
            internalId: internalBrandId,
            resourceId: extRes.id,
          },
        },
        create: {
          tenantId,
          internalType: 'BRAND',
          internalId: internalBrandId,
          resourceId: extRes.id,
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
   * Maps an external GA4 Property resource to an internal Brand or Location.
   */
  public static async mapGa4Property(
    tenantId: string,
    internalId: string,
    internalType: 'BRAND' | 'LOCATION',
    externalResourceId: string,
    context: AuthorizedContext
  ) {
    AuthorizationService.assertCan(context, Action.INTEGRATION_MAP);

    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // 1. Verify internal entity exists and check authorization
      if (internalType === 'BRAND') {
        AuthorizationService.assertBrandAccess(context, internalId);
        const brand = await tx.brand.findUnique({
          where: { uq_brand_tenant_id: { tenantId, id: internalId } },
        });
        if (!brand || brand.isArchived) {
          throw createResourceNotFoundError('Brand', internalId);
        }
      } else {
        const loc = await tx.location.findUnique({
          where: { uq_location_tenant_id: { tenantId, id: internalId } },
        });
        if (!loc || loc.isArchived) {
          throw createResourceNotFoundError('Location', internalId);
        }
        AuthorizationService.assertBrandAccess(context, loc.brandId);
      }

      // 2. Fetch GA4 external resource
      const extRes = await tx.externalResource.findFirst({
        where: {
          tenantId,
          provider: 'GOOGLE_ANALYTICS_4',
          OR: [
            { id: externalResourceId },
            { externalResourceId: externalResourceId },
          ],
        },
      });

      if (!extRes || extRes.provider !== 'GOOGLE_ANALYTICS_4') {
        throw createResourceNotFoundError('GA4 Property', externalResourceId);
      }

      // 3. Enforce 1:1 mapping by removing any existing GA4 mappings for this entity
      await tx.internalResourceMapping.deleteMany({
        where: {
          tenantId,
          internalType,
          internalId,
          resource: {
            provider: 'GOOGLE_ANALYTICS_4',
          },
        },
      });

      // Also ensure this specific GA4 property isn't mapped to another entity
      await tx.internalResourceMapping.deleteMany({
        where: {
          tenantId,
          resourceId: extRes.id,
          internalType,
        },
      });

      // 4. Upsert internal resource mapping
      const mapping = await tx.internalResourceMapping.upsert({
        where: {
          uq_internal_resource_mapping: {
            tenantId,
            internalType,
            internalId,
            resourceId: extRes.id,
          },
        },
        create: {
          tenantId,
          internalType,
          internalId,
          resourceId: extRes.id,
        },
        update: {},
      });

      logger.info(
        { tenantId, internalId, internalType, externalResourceId: extRes.externalResourceId, resourceName: extRes.resourceName },
        'Mapped GA4 Property to internal entity'
      );

      return mapping;
    });
  }

  /**
   * Maps an external Google Analytics 4 or Google Search Console resource to an internal WebSurface.
   * Enables surface-isolated telemetry while allowing the SAME external resource (e.g. GA4 property)
   * to be mapped to multiple WebSurfaces (e.g. ORIGINAL and LOCALBI) with distinct hostname/prefix scopes.
   */
  public static async mapResourceToWebSurface(params: {
    tenantId: string;
    brandId: string;
    webSurfaceId: string;
    externalResourceId: string;
    filterStrategy?: 'HOSTNAME' | 'URL_PREFIX' | 'NONE';
    customHostname?: string;
    customUrlPrefix?: string;
    context: AuthorizedContext;
  }) {
    const {
      tenantId,
      brandId,
      webSurfaceId,
      externalResourceId,
      filterStrategy,
      customHostname,
      customUrlPrefix,
      context,
    } = params;

    AuthorizationService.assertCan(context, Action.INTEGRATION_MAP);
    AuthorizationService.assertBrandAccess(context, brandId);

    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // 1. Verify Brand
      const brand = await tx.brand.findUnique({
        where: { uq_brand_tenant_id: { tenantId, id: brandId } },
      });
      if (!brand || brand.isArchived) {
        throw createResourceNotFoundError('Brand', brandId);
      }

      // 2. Verify WebSurface
      const webSurface = await tx.webSurface.findUnique({
        where: { uq_web_surface_tenant_brand_id: { tenantId, brandId, id: webSurfaceId } },
        include: { domains: true },
      });
      if (!webSurface) {
        throw createResourceNotFoundError('WebSurface', webSurfaceId);
      }

      // 3. Find ExternalResource
      const extRes = await tx.externalResource.findFirst({
        where: {
          tenantId,
          OR: [
            { id: externalResourceId },
            { externalResourceId: externalResourceId },
          ],
        },
      });

      if (!extRes) {
        throw createResourceNotFoundError('ExternalResource', externalResourceId);
      }

      if (
        extRes.provider !== 'GOOGLE_ANALYTICS_4' &&
        extRes.provider !== 'GOOGLE_SEARCH_CONSOLE'
      ) {
        throw createValidationError(
          `Resource provider ${extRes.provider} cannot be mapped to a WebSurface. Only GA4 and GSC map to WebSurfaces.`
        );
      }

      // 4. Resolve Domain and filtering strategy
      const primaryDomain =
        webSurface.domains.find((d) => d.isPrimary) || webSurface.domains[0];

      let strategy = filterStrategy;
      let hostnameFilter: string | null = null;
      let urlPrefixFilter: string | null = null;

      if (extRes.provider === 'GOOGLE_ANALYTICS_4') {
        strategy = strategy || 'HOSTNAME';
        if (customHostname) {
          hostnameFilter = AnalyticsUrlNormalizer.normalizeHostname(customHostname);
        } else if (primaryDomain) {
          hostnameFilter = primaryDomain.hostname;
        } else {
          hostnameFilter = webSurface.type === 'LOCALBI' ? `locate.${brand.slug}.com` : `${brand.slug}.com`;
        }
      } else if (extRes.provider === 'GOOGLE_SEARCH_CONSOLE') {
        strategy = strategy || 'URL_PREFIX';
        const isDomainProp = extRes.externalResourceId.startsWith('sc-domain:');

        if (customUrlPrefix) {
          urlPrefixFilter = customUrlPrefix;
        } else if (isDomainProp) {
          const host = primaryDomain?.hostname || (webSurface.type === 'LOCALBI' ? `locate.${brand.slug}.com` : `${brand.slug}.com`);
          urlPrefixFilter = AnalyticsUrlNormalizer.toCanonicalUrlPrefix(host);
        } else {
          urlPrefixFilter = extRes.externalResourceId;
        }

        // Ensure GscProperty record exists
        const propertyType = isDomainProp ? 'DOMAIN' : 'URL_PREFIX';
        await tx.gscProperty.upsert({
          where: {
            uq_gsc_property_url: {
              tenantId,
              propertyUrl: extRes.externalResourceId,
            },
          },
          create: {
            tenantId,
            resourceId: extRes.id,
            propertyUrl: extRes.externalResourceId,
            propertyType,
          },
          update: {
            resourceId: extRes.id,
            propertyType,
          },
        });
      }

      // 5. Enforce uniqueness: replace prior mapping of the SAME provider on THIS webSurface
      await tx.internalResourceMapping.deleteMany({
        where: {
          tenantId,
          internalType: 'WEBSURFACE',
          internalId: webSurfaceId,
          resource: {
            provider: extRes.provider,
          },
        },
      });

      // 6. Upsert the new mapping
      const mapping = await tx.internalResourceMapping.upsert({
        where: {
          uq_internal_resource_mapping: {
            tenantId,
            internalType: 'WEBSURFACE',
            internalId: webSurfaceId,
            resourceId: extRes.id,
          },
        },
        create: {
          tenantId,
          internalType: 'WEBSURFACE',
          internalId: webSurfaceId,
          brandId,
          webSurfaceId,
          resourceId: extRes.id,
          filterStrategy: strategy || 'NONE',
          hostnameFilter,
          urlPrefixFilter,
          status: 'ACTIVE',
        },
        update: {
          brandId,
          webSurfaceId,
          filterStrategy: strategy || 'NONE',
          hostnameFilter,
          urlPrefixFilter,
          status: 'ACTIVE',
          updatedAt: new Date(),
        },
      });

      logger.info(
        {
          tenantId,
          brandId,
          webSurfaceId,
          surfaceType: webSurface.type,
          provider: extRes.provider,
          resourceId: extRes.externalResourceId,
          strategy,
          hostnameFilter,
          urlPrefixFilter,
        },
        'Mapped Google resource to WebSurface with isolated scope'
      );

      // Invalidate relevant Redis caches
      try {
        const redis = getRedisClient();
        if (redis) {
          const ga4Pattern = `ga4:report:${tenantId}:*:${webSurfaceId}:*`;
          const keys = await redis.keys(ga4Pattern);
          if (keys.length > 0) {
            await redis.del(...keys);
          }
          const cleanPropId = extRes.externalResourceId.replace(/^properties\//, '');
          const legacyKeys = await redis.keys(`ga4:report:${tenantId}:*:${cleanPropId}:*`);
          if (legacyKeys.length > 0) {
            await redis.del(...legacyKeys);
          }
        }
      } catch (cacheErr) {
        logger.warn({ cacheErr }, 'Failed invalidating analytics Redis cache after surface mapping');
      }

      return mapping;
    });
  }

  /**
   * Invalidates cached analytics reports for a given web surface.
   */
  public static async invalidateSurfaceAnalyticsCache(tenantId: string, webSurfaceId: string): Promise<void> {
    try {
      const redis = getRedisClient();
      if (!redis) return;
      const keys = await redis.keys(`ga4:report:${tenantId}:*:${webSurfaceId}:*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch {
      // Redis optional
    }
  }

  /**
   * Lists all mappings and available resources for mapping in a tenant workspace.
   */
  public static async listTenantMappingState(tenantId: string, context: AuthorizedContext) {
    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const [connections, externalResources, internalMappings, brands, locations, webSurfaces] =
        await Promise.all([
          tx.integrationConnection.findMany({
            where: { tenantId, status: 'ACTIVE' },
            select: {
              id: true,
              provider: true,
              externalEmail: true,
              grantedScopes: true,
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
              connectionAccess: {
                where: { tenantId },
                select: { canAccess: true },
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
          tx.webSurface.findMany({
            where: { tenantId },
            include: {
              domains: true,
            },
            orderBy: { createdAt: 'asc' },
          }),
        ]);

      return {
        connections,
        externalResources,
        internalMappings,
        brands,
        locations,
        webSurfaces,
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

      logger.info(
        { tenantId, mappingId, internalType: mapping.internalType, internalId: mapping.internalId },
        'Unmapped resource'
      );

      // Invalidate relevant Redis caches
      try {
        const redis = getRedisClient();
        if (redis) {
          if (mapping.internalType === 'LOCATION') {
            await redis.del(`gbp:profile:${tenantId}:${mapping.internalId}`);
          } else if (mapping.internalType === 'WEBSURFACE') {
            const keys = await redis.keys(`ga4:report:${tenantId}:*:${mapping.internalId}:*`);
            if (keys.length > 0) {
              await redis.del(...keys);
            }
          }
        }
      } catch {
        // Redis optional
      }

      return { success: true };
    });
  }
}
// force recompile turbopack cache
