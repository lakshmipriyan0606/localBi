import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { SlugService } from './slug-service';

export interface MigrationSkippedRecord {
  source: 'ProductLocation' | 'MicrositeMenuItem';
  recordId: string;
  reason: string;
  details?: Record<string, unknown>;
}

export interface CatalogMigrationReport {
  timestamp: string;
  tenantId?: string | undefined;
  productLocationsMigrated: number;
  micrositeProductsMigrated: number;
  categoriesCreated: number;
  storeProductsCreated: number;
  skippedRecords: MigrationSkippedRecord[];
}

export class CatalogMigrationService {
  /**
   * Deterministically migrates legacy ProductLocation rows into canonical StoreProduct rows.
   */
  public static async migrateProductLocations(
    targetTenantId?: string
  ): Promise<{ migratedCount: number; skipped: MigrationSkippedRecord[] }> {
    const tenantIds = targetTenantId
      ? [targetTenantId]
      : (await prisma.tenant.findMany({ select: { id: true } })).map((t) => t.id);

    let migratedCount = 0;
    const skipped: MigrationSkippedRecord[] = [];

    for (const tenantId of tenantIds) {
      await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
        const rows = await tx.productLocation.findMany({
          where: { tenantId },
          include: {
            product: { select: { id: true, tenantId: true, brandId: true } },
            location: { select: { id: true, tenantId: true, brandId: true } },
          },
        });

        for (const row of rows) {
          // Deterministic validation: must have valid product and store with matching tenant & brand
          if (!row.product || !row.location) {
            skipped.push({
              source: 'ProductLocation',
              recordId: row.id,
              reason: 'Missing product or location relation',
              details: { productId: row.productId, locationId: row.locationId },
            });
            continue;
          }

          if (
            row.product.tenantId !== row.location.tenantId ||
            row.product.brandId !== row.location.brandId
          ) {
            skipped.push({
              source: 'ProductLocation',
              recordId: row.id,
              reason: 'Cross-tenant or cross-brand mismatch between product and location',
              details: {
                productTenant: row.product.tenantId,
                productBrand: row.product.brandId,
                locationTenant: row.location.tenantId,
                locationBrand: row.location.brandId,
              },
            });
            continue;
          }

          // Upsert into canonical StoreProduct within tenant context
          await tx.storeProduct.upsert({
            where: {
              uq_store_product_store_product: {
                storeId: row.locationId,
                productId: row.productId,
              },
            },
            create: {
              tenantId: row.product.tenantId,
              brandId: row.product.brandId,
              storeId: row.locationId,
              productId: row.productId,
              isAvailable: row.isAvailable,
              priceOverride: row.price,
              status: 'ACTIVE',
            },
            update: {
              isAvailable: row.isAvailable,
              priceOverride: row.price,
            },
          });

          migratedCount++;
        }
      });
    }

    return { migratedCount, skipped };
  }

  /**
   * Deterministically backfills Category, Product, and StoreProduct rows from Microsite.menuItems JSON.
   */
  public static async migrateMicrositeMenuItems(
    targetTenantId?: string
  ): Promise<{
    productsCreated: number;
    categoriesCreated: number;
    storeProductsCreated: number;
    skipped: MigrationSkippedRecord[];
  }> {
    const tenantIds = targetTenantId
      ? [targetTenantId]
      : (await prisma.tenant.findMany({ select: { id: true } })).map((t) => t.id);

    let productsCreated = 0;
    let categoriesCreated = 0;
    let storeProductsCreated = 0;
    const skipped: MigrationSkippedRecord[] = [];

    for (const tenantId of tenantIds) {
      await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
        const microsites = await tx.microsite.findMany({
          where: { tenantId },
          select: {
            id: true,
            tenantId: true,
            brandId: true,
            locationId: true,
            subdomain: true,
            menuItems: true,
          },
        });

        for (const site of microsites) {
          if (!site.brandId) {
            skipped.push({
              source: 'MicrositeMenuItem',
              recordId: site.id,
              reason: 'Microsite lacks canonical brandId; skipping to prevent unowned catalog creation',
              details: { subdomain: site.subdomain, tenantId: site.tenantId },
            });
            continue;
          }

          const menuItems = Array.isArray(site.menuItems)
            ? (site.menuItems as Array<Record<string, unknown>>)
            : [];

          if (menuItems.length === 0) {
            continue;
          }

          // Verify brand exists
          const brand = await tx.brand.findFirst({
            where: { id: site.brandId, tenantId: site.tenantId },
          });

          if (!brand) {
            skipped.push({
              source: 'MicrositeMenuItem',
              recordId: site.id,
              reason: `Brand ${site.brandId} not found for tenant`,
              details: { brandId: site.brandId },
            });
            continue;
          }

          // Verify store if locationId is set
          let validStoreId: string | null = null;
          if (site.locationId) {
            const store = await tx.location.findFirst({
              where: { id: site.locationId, tenantId: site.tenantId, brandId: site.brandId },
            });
            if (store) {
              validStoreId = store.id;
            }
          }

          for (const rawItem of menuItems) {
            const item = rawItem as {
              id?: string;
              name?: string;
              category?: string;
              price?: number;
              description?: string;
              image?: string;
              isPopular?: boolean;
            };
            const name = typeof item.name === 'string' ? item.name.trim() : '';
            if (!name) {
              skipped.push({
                source: 'MicrositeMenuItem',
                recordId: String(item.id || 'unknown'),
                reason: 'Menu item missing name',
                details: { siteId: site.id, item: rawItem },
              });
              continue;
            }

            const categoryName = typeof item.category === 'string' ? item.category.trim() : '';
            let categoryId: string | null = null;

            // 1. Resolve or create category
            if (categoryName) {
              const catSlug = SlugService.slugify(categoryName);
              let category = await tx.category.findFirst({
                where: {
                  tenantId: site.tenantId,
                  brandId: site.brandId,
                  slug: catSlug,
                },
              });

              if (!category) {
                category = await tx.category.create({
                  data: {
                    tenantId: site.tenantId,
                    brandId: site.brandId,
                    name: categoryName,
                    slug: catSlug,
                    status: 'ACTIVE',
                  },
                });
                categoriesCreated++;
              }
              categoryId = category.id;
            }

            // 2. Resolve or create product
            const price = typeof item.price === 'number' && !isNaN(item.price) ? item.price : 0;
            const description = typeof item.description === 'string' ? item.description : null;
            const imageUrl = typeof item.image === 'string' && item.image.trim() ? item.image.trim() : null;

            let product = await tx.product.findFirst({
              where: {
                tenantId: site.tenantId,
                brandId: site.brandId,
                name: { equals: name, mode: 'insensitive' },
              },
            });

            if (!product) {
              const prodSlug = await SlugService.generateUniqueProductSlug(
                site.tenantId,
                site.brandId,
                name
              );
              const sku = `SKU-${prodSlug.toUpperCase()}`;

              // Ensure sku uniqueness
              let finalSku = sku;
              const existingSku = await tx.product.findFirst({
                where: { tenantId: site.tenantId, brandId: site.brandId, sku },
              });
              if (existingSku) {
                finalSku = `${sku}-${Date.now().toString().slice(-4)}`;
              }

              product = await tx.product.create({
                data: {
                  tenantId: site.tenantId,
                  brandId: site.brandId,
                  categoryId,
                  name,
                  slug: prodSlug,
                  sku: finalSku,
                  description,
                  shortDescription: description ? description.slice(0, 160) : null,
                  basePrice: new Prisma.Decimal(price),
                  currency: 'INR',
                  status: 'ACTIVE',
                  publishStatus: 'PUBLISHED',
                  featured: Boolean(item.isPopular),
                },
              });
              productsCreated++;

              if (imageUrl) {
                await tx.productMedia.create({
                  data: {
                    tenantId: site.tenantId,
                    productId: product.id,
                    url: imageUrl,
                    altText: name,
                    sortOrder: 0,
                    type: 'IMAGE',
                  },
                });
              }
            }

            // 3. Map StoreProduct if validStoreId exists
            if (validStoreId) {
              await tx.storeProduct.upsert({
                where: {
                  uq_store_product_store_product: {
                    storeId: validStoreId,
                    productId: product.id,
                  },
                },
                create: {
                  tenantId: site.tenantId,
                  brandId: site.brandId,
                  storeId: validStoreId,
                  productId: product.id,
                  isAvailable: true,
                  priceOverride: new Prisma.Decimal(price),
                  status: 'ACTIVE',
                },
                update: {
                  isAvailable: true,
                },
              });
              storeProductsCreated++;
            }
          }
        }
      });
    }

    return {
      productsCreated,
      categoriesCreated,
      storeProductsCreated,
      skipped,
    };
  }

  /**
   * Executes the full deterministic migration and returns an audit report.
   */
  public static async runFullMigration(
    targetTenantId?: string
  ): Promise<CatalogMigrationReport> {
    const plResult = await this.migrateProductLocations(targetTenantId);
    const msResult = await this.migrateMicrositeMenuItems(targetTenantId);

    return {
      timestamp: new Date().toISOString(),
      tenantId: targetTenantId,
      productLocationsMigrated: plResult.migratedCount,
      micrositeProductsMigrated: msResult.productsCreated,
      categoriesCreated: msResult.categoriesCreated,
      storeProductsCreated: plResult.migratedCount + msResult.storeProductsCreated,
      skippedRecords: [...plResult.skipped, ...msResult.skipped],
    };
  }
}
