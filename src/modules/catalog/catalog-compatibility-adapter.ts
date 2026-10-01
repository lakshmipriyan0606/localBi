import { prisma } from '@/shared/database/client';
import { MenuItem } from '@/modules/microsites/microsite-service';
import { PriceResolver } from './price-resolver';
import { AvailabilityResolver } from './availability-resolver';

export class CatalogCompatibilityAdapter {
  /**
   * Resolves menu items for a microsite, prioritizing canonical relational products
   * (StoreProduct + Product + Category) while falling back to legacy menuItems JSON.
   */
  public static async resolveMenuItemsForMicrosite(
    tenantId: string,
    brandId?: string | null,
    locationId?: string | null,
    fallbackMenuItems: MenuItem[] = []
  ): Promise<MenuItem[]> {
    if (!brandId) {
      return fallbackMenuItems;
    }

    try {
      // If locationId is present, fetch store-mapped products
      if (locationId) {
        const storeProducts = await prisma.storeProduct.findMany({
          where: {
            tenantId,
            brandId,
            storeId: locationId,
            isAvailable: true,
            status: 'ACTIVE',
            product: {
              status: 'ACTIVE',
              publishStatus: 'PUBLISHED',
            },
          },
          include: {
            product: {
              include: {
                categoryRel: { select: { name: true } },
                media: {
                  where: { type: 'IMAGE' },
                  orderBy: { sortOrder: 'asc' },
                  take: 1,
                  select: { url: true },
                },
              },
            },
          },
          orderBy: { product: { name: 'asc' } },
        });

        if (storeProducts.length > 0) {
          return storeProducts
            .filter((sp) =>
              AvailabilityResolver.isAvailableAtStore(
                { status: sp.product.status, publishStatus: sp.product.publishStatus },
                { isAvailable: sp.isAvailable, status: sp.status }
              )
            )
            .map((sp) => {
              const effectivePrice = PriceResolver.resolvePrice(
                { basePrice: sp.product.basePrice },
                { priceOverride: sp.priceOverride }
              );

              return {
                id: sp.product.id,
                name: sp.product.name,
                category: sp.product.categoryRel?.name || sp.product.category || 'General',
                price: effectivePrice,
                description: sp.product.shortDescription || sp.product.description || '',
                isPopular: sp.product.featured,
                ...(sp.product.media[0]?.url ? { image: sp.product.media[0].url } : {}),
              };
            });
        }
      }

      // If no location or no storeProducts mapped yet, check if brand has published products
      const brandProducts = await prisma.product.findMany({
        where: {
          tenantId,
          brandId,
          status: 'ACTIVE',
          publishStatus: 'PUBLISHED',
        },
        include: {
          categoryRel: { select: { name: true } },
          media: {
            where: { type: 'IMAGE' },
            orderBy: { sortOrder: 'asc' },
            take: 1,
            select: { url: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      if (brandProducts.length > 0) {
        return brandProducts.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.categoryRel?.name || p.category || 'General',
          price: PriceResolver.resolvePrice({ basePrice: p.basePrice }, null),
          description: p.shortDescription || p.description || '',
          isPopular: p.featured,
          ...(p.media[0]?.url ? { image: p.media[0].url } : {}),
        }));
      }
    } catch (err) {
      console.warn('[CatalogCompatibilityAdapter] Failed to resolve relational catalog, falling back to legacy JSON:', err);
    }

    // Fall back to legacy JSON array
    return fallbackMenuItems;
  }
}
