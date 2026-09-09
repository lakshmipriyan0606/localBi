import { prisma } from '../../shared/database/client';
import { TenantContextService } from '../../shared/database/tenant-context';
import {
  createValidationError,
  createConflictError,
  createResourceNotFoundError,
  createTenantAccessDeniedError,
} from '../../shared/errors';
import {
  AuthorizedContext,
  AuthorizationService,
  Action,
  ScopeMode,
} from '../../shared/authorization/policy';
import { logger } from '../../shared/observability/logger';

export interface LocationDto {
  id: string;
  tenantId: string;
  brandId: string;
  name: string;
  storeCode: string | null;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  timezone: string;
  version: number;
  isArchived: boolean;
  archivedAt: Date | null;
  isClosed: boolean;
  createdAt: Date;
  updatedAt: Date;
  brandName?: string;
}

export interface CreateLocationInput {
  brandId: string;
  name: string;
  storeCode?: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  timezone?: string;
}

export interface ListLocationsOptions {
  brandId?: string;
  search?: string;
  includeArchived?: boolean;
  page?: number;
  limit?: number;
}

export class LocationService {
  /**
   * Validates that a string is a recognized IANA time zone identifier.
   */
  public static validateTimezone(tz: string): string {
    const clean = tz.trim();
    try {
      // Modern V8 Intl API throws RangeError on invalid IANA timezones
      Intl.DateTimeFormat(undefined, { timeZone: clean });
      return clean;
    } catch {
      throw createValidationError(
        `Invalid IANA time zone "${clean}". Example valid zones: "America/New_York", "Europe/London", "UTC"`
      );
    }
  }

  /**
   * Validates that a country code is an ISO 3166-1 alpha-2 or alpha-3 code.
   */
  public static validateCountryCode(country: string): string {
    const clean = country.trim().toUpperCase();
    if (!/^[A-Z]{2,3}$/.test(clean)) {
      throw createValidationError(
        `Invalid ISO country code "${clean}". Must be an ISO 3166-1 alpha-2 (e.g. "US") or alpha-3 (e.g. "USA") code.`
      );
    }
    return clean;
  }

  /**
   * Creates a new location under a brand and tenant.
   * Enforces brand-tenant consistency, IANA timezone, ISO country, and store code uniqueness.
   */
  public static async createLocation(
    tenantId: string,
    input: CreateLocationInput,
    context: AuthorizedContext
  ): Promise<LocationDto> {
    AuthorizationService.assertCan(context, Action.LOCATION_CREATE);
    AuthorizationService.assertBrandAccess(context, input.brandId);

    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }

    const cleanName = input.name.trim();
    if (!cleanName || cleanName.length < 2) {
      throw createValidationError('Location name must be at least 2 characters');
    }

    const country = this.validateCountryCode(input.country);
    const timezone = this.validateTimezone(input.timezone || 'UTC');
    const storeCode = input.storeCode ? input.storeCode.trim() : null;

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // 1. Verify that the parent brand exists and belongs to this tenant
      const parentBrand = await tx.brand.findUnique({
        where: {
          uq_brand_tenant_id: {
            tenantId,
            id: input.brandId,
          },
        },
      });

      if (!parentBrand) {
        throw createResourceNotFoundError('Brand', input.brandId);
      }

      // 2. If storeCode is provided, ensure uniqueness within brand
      if (storeCode) {
        const existingStoreCode = await tx.location.findUnique({
          where: {
            uq_location_brand_code: {
              tenantId,
              brandId: input.brandId,
              storeCode,
            },
          },
        });

        if (existingStoreCode) {
          throw createConflictError(
            `Store code "${storeCode}" is already assigned to another location under brand "${parentBrand.name}"`
          );
        }
      }

      // 3. Create location
      const location = await tx.location.create({
        data: {
          tenantId,
          brandId: input.brandId,
          name: cleanName,
          storeCode,
          addressLine1: input.addressLine1.trim(),
          city: input.city.trim(),
          state: input.state.trim(),
          postalCode: input.postalCode.trim(),
          country,
          timezone,
          version: 1,
          isArchived: false,
        },
      });

      // 4. If restricted scope, grant location scope to creator
      if (context.scopeMode === ScopeMode.RESTRICTED) {
        const membership = await tx.tenantMembership.findUnique({
          where: {
            uq_membership_tenant_user: {
              tenantId,
              userId: context.userId,
            },
          },
        });

        if (membership) {
          await tx.locationAccessScope.create({
            data: {
              tenantId,
              membershipId: membership.id,
              locationId: location.id,
            },
          });
        }
      }

      // 5. Audit log
      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: context.userId,
          actorRole: context.role,
          action: Action.LOCATION_CREATE,
          resourceType: 'Location',
          resourceId: location.id,
          newValues: { name: location.name, brandId: location.brandId, storeCode },
          ipAddress: 'INTERNAL',
          userAgent: 'INTERNAL',
        },
      });

      logger.info({ tenantId, locationId: location.id, brandId: input.brandId }, 'Location created');

      return location;
    });
  }

  /**
   * Retrieves a single location by ID with scope validation.
   */
  public static async getLocationById(
    tenantId: string,
    locationId: string,
    context: AuthorizedContext
  ): Promise<LocationDto> {
    AuthorizationService.assertCan(context, Action.LOCATION_VIEW);

    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const location = await tx.location.findUnique({
        where: {
          uq_location_tenant_id: {
            tenantId,
            id: locationId,
          },
        },
        include: {
          brand: {
            select: { name: true },
          },
        },
      });

      if (!location) {
        throw createResourceNotFoundError('Location', locationId);
      }

      AuthorizationService.assertLocationAccess(context, location.id, location.brandId);

      return {
        ...location,
        brandName: location.brand.name,
      };
    });
  }

  /**
   * Lists locations for a tenant with pagination, search, brand filter, and scope enforcement.
   */
  public static async listLocations(
    tenantId: string,
    options: ListLocationsOptions = {},
    context: AuthorizedContext
  ): Promise<{ items: LocationDto[]; totalCount: number; page: number; totalPages: number }> {
    AuthorizationService.assertCan(context, Action.LOCATION_VIEW);

    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }

    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // Scope filtering
      let scopeFilter = {};
      if (context.scopeMode === ScopeMode.RESTRICTED) {
        scopeFilter = {
          OR: [
            { id: { in: Array.from(context.grantedLocationIds) } },
            { brandId: { in: Array.from(context.grantedBrandIds) } },
          ],
        };
      }

      const whereClause = {
        tenantId,
        ...scopeFilter,
        ...(options.brandId ? { brandId: options.brandId } : {}),
        ...(options.includeArchived ? {} : { isArchived: false }),
        ...(options.search
          ? {
              OR: [
                { name: { contains: options.search, mode: 'insensitive' as const } },
                { storeCode: { contains: options.search, mode: 'insensitive' as const } },
                { city: { contains: options.search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      };

      const [totalCount, items] = await Promise.all([
        tx.location.count({ where: whereClause }),
        tx.location.findMany({
          where: whereClause,
          include: { brand: { select: { name: true } } },
          orderBy: [{ isArchived: 'asc' }, { name: 'asc' }, { id: 'asc' }],
          skip,
          take: limit,
        }),
      ]);

      return {
        items: items.map((loc) => ({
          ...loc,
          brandName: loc.brand.name,
        })),
        totalCount,
        page,
        totalPages: Math.ceil(totalCount / limit) || 1,
      };
    });
  }

  /**
   * Updates location details using optimistic concurrency control.
   */
  public static async updateLocation(
    tenantId: string,
    locationId: string,
    currentVersion: number,
    data: Partial<CreateLocationInput>,
    context: AuthorizedContext
  ): Promise<LocationDto> {
    AuthorizationService.assertCan(context, Action.LOCATION_UPDATE);

    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const existing = await tx.location.findUnique({
        where: { uq_location_tenant_id: { tenantId, id: locationId } },
      });

      if (!existing) {
        throw createResourceNotFoundError('Location', locationId);
      }

      AuthorizationService.assertLocationAccess(context, existing.id, existing.brandId);

      const country = data.country ? this.validateCountryCode(data.country) : undefined;
      const timezone = data.timezone ? this.validateTimezone(data.timezone) : undefined;
      const cleanName = data.name ? data.name.trim() : undefined;
      const storeCode = data.storeCode !== undefined ? data.storeCode.trim() || null : undefined;

      // Optimistic concurrency check
      const result = await tx.location.updateMany({
        where: {
          id: locationId,
          tenantId,
          version: currentVersion,
        },
        data: {
          ...(cleanName ? { name: cleanName } : {}),
          ...(country ? { country } : {}),
          ...(timezone ? { timezone } : {}),
          ...(storeCode !== undefined ? { storeCode } : {}),
          ...(data.addressLine1 ? { addressLine1: data.addressLine1.trim() } : {}),
          ...(data.city ? { city: data.city.trim() } : {}),
          ...(data.state ? { state: data.state.trim() } : {}),
          ...(data.postalCode ? { postalCode: data.postalCode.trim() } : {}),
          version: currentVersion + 1,
        },
      });

      if (result.count === 0) {
        throw createConflictError(
          'Stale update conflict: Location was modified by another user. Please refresh and retry.'
        );
      }

      const updated = await tx.location.findUniqueOrThrow({
        where: { uq_location_tenant_id: { tenantId, id: locationId } },
        include: { brand: { select: { name: true } } },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: context.userId,
          actorRole: context.role,
          action: Action.LOCATION_UPDATE,
          resourceType: 'Location',
          resourceId: locationId,
          oldValues: { name: existing.name, version: existing.version },
          newValues: { name: updated.name, version: updated.version },
          ipAddress: 'INTERNAL',
          userAgent: 'INTERNAL',
        },
      });

      return {
        ...updated,
        brandName: updated.brand.name,
      };
    });
  }

  /**
   * Soft archives a location.
   */
  public static async archiveLocation(
    tenantId: string,
    locationId: string,
    currentVersion: number,
    context: AuthorizedContext
  ): Promise<LocationDto> {
    AuthorizationService.assertCan(context, Action.LOCATION_UPDATE);

    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const existing = await tx.location.findUnique({
        where: { uq_location_tenant_id: { tenantId, id: locationId } },
      });

      if (!existing) {
        throw createResourceNotFoundError('Location', locationId);
      }

      AuthorizationService.assertLocationAccess(context, existing.id, existing.brandId);

      const result = await tx.location.updateMany({
        where: {
          id: locationId,
          tenantId,
          version: currentVersion,
          isArchived: false,
        },
        data: {
          isArchived: true,
          archivedAt: new Date(),
          version: currentVersion + 1,
        },
      });

      if (result.count === 0) {
        throw createConflictError('Stale update conflict or location is already archived.');
      }

      const updated = await tx.location.findUniqueOrThrow({
        where: { uq_location_tenant_id: { tenantId, id: locationId } },
        include: { brand: { select: { name: true } } },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: context.userId,
          actorRole: context.role,
          action: 'location:archive',
          resourceType: 'Location',
          resourceId: locationId,
          ipAddress: 'INTERNAL',
          userAgent: 'INTERNAL',
        },
      });

      return {
        ...updated,
        brandName: updated.brand.name,
      };
    });
  }
}
