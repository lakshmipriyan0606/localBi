import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { createResourceNotFoundError } from '@/shared/errors';
import { CanonicalStoreProfile, StoreDayHours } from './listing-types';
import { NapNormalizer } from './nap-normalizer';

export class ListingProfileService {
  /**
   * Retrieves the canonical store profile from Location and structured hours.
   * This represents the single source of truth for all NAP comparisons and sync operations.
   */
  public static async getCanonicalStoreProfile(
    tenantId: string,
    storeId: string
  ): Promise<CanonicalStoreProfile> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const store = await tx.location.findFirst({
        where: {
          id: storeId,
          tenantId,
        },
        include: {
          tenant: true,
        },
      });

      if (!store) {
        throw createResourceNotFoundError('Location', storeId);
      }

      // Fetch structured hours
      const rawHours = await tx.listingStoreHours.findMany({
        where: {
          tenantId,
          storeId,
        },
        orderBy: {
          dayOfWeek: 'asc',
        },
      });

      // Normalize hours into a complete 7-day structure (0..6)
      const hoursMap = new Map<number, StoreDayHours>();
      for (const h of rawHours) {
        hoursMap.set(h.dayOfWeek, {
          dayOfWeek: h.dayOfWeek,
          isClosed: h.isClosed,
          openTime: h.openTime ? NapNormalizer.normalizeTime(h.openTime) : null,
          closeTime: h.closeTime ? NapNormalizer.normalizeTime(h.closeTime) : null,
        });
      }

      const completeHours: StoreDayHours[] = [];
      for (let day = 0; day <= 6; day++) {
        if (hoursMap.has(day)) {
          completeHours.push(hoursMap.get(day)!);
        } else {
          // Default: open 09:00 - 18:00 if not specified
          completeHours.push({
            dayOfWeek: day,
            isClosed: false,
            openTime: '09:00',
            closeTime: '18:00',
          });
        }
      }

      // Canonical website URL resolution
      const websiteUrl: string | null = store.tenant.website ?? null;

      return {
        storeId: store.id,
        brandId: store.brandId,
        tenantId: store.tenantId,
        name: store.name,
        addressLine1: store.addressLine1,
        city: store.city,
        state: store.state ?? '',
        postalCode: store.postalCode,
        country: store.country ?? 'IN',
        phone: store.phone ?? null,
        website: websiteUrl,
        googlePlaceId: store.googlePlaceId ?? null,
        latitude: store.latitude ?? null,
        longitude: store.longitude ?? null,
        isClosed: store.isClosed ?? false,
        hours: completeHours,
        canonicalVersionAt: store.updatedAt,
      };
    });
  }

  /**
   * Updates or inserts structured 7-day store hours.
   */
  public static async updateStoreHours(
    tenantId: string,
    storeId: string,
    hours: StoreDayHours[]
  ): Promise<StoreDayHours[]> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // Validate store existence
      const store = await tx.location.findFirst({
        where: { id: storeId, tenantId },
        select: { id: true },
      });

      if (!store) {
        throw createResourceNotFoundError('Location', storeId);
      }

      // Upsert each day
      for (const h of hours) {
        const normalizedOpen = h.openTime ? NapNormalizer.normalizeTime(h.openTime) : null;
        const normalizedClose = h.closeTime ? NapNormalizer.normalizeTime(h.closeTime) : null;

        await tx.listingStoreHours.upsert({
          where: {
            uq_listing_hours_store_day: {
              tenantId,
              storeId,
              dayOfWeek: h.dayOfWeek,
            },
          },
          create: {
            tenantId,
            storeId,
            dayOfWeek: h.dayOfWeek,
            isClosed: h.isClosed,
            openTime: normalizedOpen,
            closeTime: normalizedClose,
          },
          update: {
            isClosed: h.isClosed,
            openTime: normalizedOpen,
            closeTime: normalizedClose,
          },
        });
      }

      const updated = await tx.listingStoreHours.findMany({
        where: { tenantId, storeId },
        orderBy: { dayOfWeek: 'asc' },
      });

      return updated.map(h => ({
        dayOfWeek: h.dayOfWeek,
        isClosed: h.isClosed,
        openTime: h.openTime,
        closeTime: h.closeTime,
      }));
    });
  }

  /**
   * Fetches structured store hours for a store.
   */
  public static async getStoreHours(
    tenantId: string,
    storeId: string
  ): Promise<StoreDayHours[]> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const records = await tx.listingStoreHours.findMany({
        where: { tenantId, storeId },
        orderBy: { dayOfWeek: 'asc' },
      });

      return records.map(h => ({
        dayOfWeek: h.dayOfWeek,
        isClosed: h.isClosed,
        openTime: h.openTime,
        closeTime: h.closeTime,
      }));
    });
  }
}
