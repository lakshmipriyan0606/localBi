import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import {
  createValidationError,
  createResourceNotFoundError,
} from '@/shared/errors';
import { PriceResolver } from './price-resolver';

export interface StoreProductMappingDto {
  id: string;
  tenantId: string;
  brandId: string;
  storeId: string;
  productId: string;
  isAvailable: boolean;
  priceOverride: number | null;
  effectivePrice: number;
  quantity: number | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  product?: {
    id: string;
    name: string;
    sku: string;
    slug: string;
    basePrice: number | null;
    currency: string;
    status: string;
    publishStatus: string;
    category?: { id: string; name: string; slug: string } | null;
  };
  store?: {
    id: string;
    name: string;
    city?: string | null;
  };
}

export interface BulkStoreProductItem {
  productId: string;
  isAvailable?: boolean;
  priceOverride?: number | null;
  quantity?: number;
  status?: 'ACTIVE' | 'INACTIVE';
}

export class StoreProductService {
  /**
   * Lists products mapped to a store, resolving effective price and availability.
   */
  public static async listProductsForStore(
    tenantId: string,
    storeId: string,
    options: {
      categoryId?: string | undefined;
      search?: string | undefined;
      isAvailable?: boolean | undefined;
      status?: string | undefined;
    } = {}
  ): Promise<StoreProductMappingDto[]> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // 1. Verify store exists and belongs to this tenant
      const store = await tx.location.findFirst({
        where: { id: storeId, tenantId },
        select: { id: true, brandId: true, name: true, city: true },
      });

      if (!store) {
        throw createResourceNotFoundError('Store', storeId);
      }

      const where: Prisma.StoreProductWhereInput = {
        tenantId,
        storeId,
        ...(options.isAvailable !== undefined ? { isAvailable: options.isAvailable } : {}),
        ...(options.status ? { status: options.status } : {}),
        product: {
          tenantId,
          ...(options.categoryId ? { categoryId: options.categoryId } : {}),
          ...(options.search
            ? {
                OR: [
                  { name: { contains: options.search, mode: 'insensitive' } },
                  { sku: { contains: options.search, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
      };

      const rows = await tx.storeProduct.findMany({
        where,
        include: {
          product: {
            include: {
              categoryRel: { select: { id: true, name: true, slug: true } },
            },
          },
        },
        orderBy: [{ isAvailable: 'desc' }, { product: { name: 'asc' } }],
      });

      return rows.map((r) => {
        const prod = r.product;
        const effectivePrice = PriceResolver.resolvePrice(
          { basePrice: prod.basePrice },
          { priceOverride: r.priceOverride }
        );

        return {
          id: r.id,
          tenantId: r.tenantId,
          brandId: r.brandId,
          storeId: r.storeId,
          productId: r.productId,
          isAvailable: r.isAvailable,
          priceOverride: r.priceOverride ? Number(r.priceOverride) : null,
          effectivePrice,
          quantity: r.quantity,
          status: r.status,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          product: {
            id: prod.id,
            name: prod.name,
            sku: prod.sku,
            slug: prod.slug,
            basePrice: prod.basePrice ? Number(prod.basePrice) : null,
            currency: prod.currency,
            status: prod.status,
            publishStatus: prod.publishStatus,
            category: prod.categoryRel,
          },
          store: {
            id: store.id,
            name: store.name,
            city: store.city,
          },
        };
      });
    });
  }

  /**
   * Lists all stores where a given product is mapped.
   */
  public static async listStoresForProduct(
    tenantId: string,
    productId: string
  ): Promise<StoreProductMappingDto[]> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: productId, tenantId },
        include: {
          categoryRel: { select: { id: true, name: true, slug: true } },
        },
      });

      if (!product) {
        throw createResourceNotFoundError('Product', productId);
      }

      const rows = await tx.storeProduct.findMany({
        where: { tenantId, productId },
        include: {
          store: {
            select: { id: true, name: true, city: true },
          },
        },
        orderBy: [{ isAvailable: 'desc' }, { store: { name: 'asc' } }],
      });

      return rows.map((r) => {
        const effectivePrice = PriceResolver.resolvePrice(
          { basePrice: product.basePrice },
          { priceOverride: r.priceOverride }
        );

        return {
          id: r.id,
          tenantId: r.tenantId,
          brandId: r.brandId,
          storeId: r.storeId,
          productId: r.productId,
          isAvailable: r.isAvailable,
          priceOverride: r.priceOverride ? Number(r.priceOverride) : null,
          effectivePrice,
          quantity: r.quantity,
          status: r.status,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          product: {
            id: product.id,
            name: product.name,
            sku: product.sku,
            slug: product.slug,
            basePrice: product.basePrice ? Number(product.basePrice) : null,
            currency: product.currency,
            status: product.status,
            publishStatus: product.publishStatus,
            category: product.categoryRel,
          },
          store: {
            id: r.store.id,
            name: r.store.name,
            city: r.store.city,
          },
        };
      });
    });
  }

  /**
   * Assigns a single product to a store, strictly verifying tenant and brand boundaries.
   */
  public static async assignProductToStore(
    tenantId: string,
    brandId: string,
    storeId: string,
    productId: string,
    options: {
      isAvailable?: boolean;
      priceOverride?: number | null;
      quantity?: number;
      status?: 'ACTIVE' | 'INACTIVE';
    } = {}
  ): Promise<StoreProductMappingDto> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // 1. Verify store belongs to tenant and brand
      const store = await tx.location.findFirst({
        where: { id: storeId, tenantId, brandId },
      });
      if (!store) {
        throw createValidationError(
          `Store ${storeId} does not exist or does not belong to brand ${brandId} under this tenant`
        );
      }

      // 2. Verify product belongs to tenant and brand
      const product = await tx.product.findFirst({
        where: { id: productId, tenantId, brandId },
        include: {
          categoryRel: { select: { id: true, name: true, slug: true } },
        },
      });
      if (!product) {
        throw createValidationError(
          `Product ${productId} does not exist or does not belong to brand ${brandId} under this tenant`
        );
      }

      // 3. Upsert mapping
      const mapping = await tx.storeProduct.upsert({
        where: {
          uq_store_product_store_product: {
            storeId,
            productId,
          },
        },
        create: {
          tenantId,
          brandId,
          storeId,
          productId,
          isAvailable: options.isAvailable !== undefined ? options.isAvailable : true,
          priceOverride:
            options.priceOverride !== undefined && options.priceOverride !== null
              ? new Prisma.Decimal(options.priceOverride)
              : null,
          quantity: options.quantity !== undefined ? options.quantity : 0,
          status: options.status || 'ACTIVE',
        },
        update: {
          ...(options.isAvailable !== undefined ? { isAvailable: options.isAvailable } : {}),
          ...(options.priceOverride !== undefined
            ? {
                priceOverride:
                  options.priceOverride !== null
                    ? new Prisma.Decimal(options.priceOverride)
                    : null,
              }
            : {}),
          ...(options.quantity !== undefined ? { quantity: options.quantity } : {}),
          ...(options.status ? { status: options.status } : {}),
        },
      });

      const effectivePrice = PriceResolver.resolvePrice(
        { basePrice: product.basePrice },
        { priceOverride: mapping.priceOverride }
      );

      return {
        id: mapping.id,
        tenantId: mapping.tenantId,
        brandId: mapping.brandId,
        storeId: mapping.storeId,
        productId: mapping.productId,
        isAvailable: mapping.isAvailable,
        priceOverride: mapping.priceOverride ? Number(mapping.priceOverride) : null,
        effectivePrice,
        quantity: mapping.quantity,
        status: mapping.status,
        createdAt: mapping.createdAt,
        updatedAt: mapping.updatedAt,
        product: {
          id: product.id,
          name: product.name,
          sku: product.sku,
          slug: product.slug,
          basePrice: product.basePrice ? Number(product.basePrice) : null,
          currency: product.currency,
          status: product.status,
          publishStatus: product.publishStatus,
          category: product.categoryRel,
        },
        store: {
          id: store.id,
          name: store.name,
          city: store.city,
        },
      };
    });
  }

  /**
   * Assigns multiple products to a store in a single atomic transaction.
   */
  public static async assignProductsToStore(
    tenantId: string,
    brandId: string,
    storeId: string,
    productIds: string[]
  ): Promise<{ added: number }> {
    if (!productIds || productIds.length === 0) {
      return { added: 0 };
    }

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // 1. Verify store belongs to tenant and brand
      const store = await tx.location.findFirst({
        where: { id: storeId, tenantId, brandId },
      });
      if (!store) {
        throw createValidationError(
          `Store ${storeId} does not belong to brand ${brandId} under this tenant`
        );
      }

      // 2. Verify all products belong to the identical brand and tenant
      const verifiedProducts = await tx.product.findMany({
        where: {
          id: { in: productIds },
          tenantId,
          brandId,
        },
        select: { id: true },
      });

      if (verifiedProducts.length !== productIds.length) {
        const foundSet = new Set(verifiedProducts.map((p) => p.id));
        const missing = productIds.filter((id) => !foundSet.has(id));
        throw createValidationError(
          `Cross-brand or cross-tenant product assignment denied. Products not belonging to brand ${brandId}: ${missing.join(', ')}`
        );
      }

      // 3. Upsert mappings atomically
      let added = 0;
      for (const prodId of productIds) {
        await tx.storeProduct.upsert({
          where: {
            uq_store_product_store_product: {
              storeId,
              productId: prodId,
            },
          },
          create: {
            tenantId,
            brandId,
            storeId,
            productId: prodId,
            isAvailable: true,
            status: 'ACTIVE',
          },
          update: {
            isAvailable: true,
            status: 'ACTIVE',
          },
        });
        added++;
      }

      return { added };
    });
  }

  /**
   * Removes a product mapping from a store.
   */
  public static async removeProductFromStore(
    tenantId: string,
    storeId: string,
    productId: string
  ): Promise<boolean> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const existing = await tx.storeProduct.findFirst({
        where: { tenantId, storeId, productId },
      });

      if (!existing) {
        return false;
      }

      await tx.storeProduct.delete({
        where: { id: existing.id },
      });

      return true;
    });
  }

  /**
   * Sets store-specific availability for a product.
   */
  public static async setAvailability(
    tenantId: string,
    storeId: string,
    productId: string,
    isAvailable: boolean
  ): Promise<StoreProductMappingDto> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const existing = await tx.storeProduct.findFirst({
        where: { tenantId, storeId, productId },
        include: {
          product: {
            include: {
              categoryRel: { select: { id: true, name: true, slug: true } },
            },
          },
          store: {
            select: { id: true, name: true, city: true },
          },
        },
      });

      if (!existing) {
        throw createResourceNotFoundError('StoreProduct', `${storeId}:${productId}`);
      }

      const updated = await tx.storeProduct.update({
        where: { id: existing.id },
        data: { isAvailable },
      });

      const effectivePrice = PriceResolver.resolvePrice(
        { basePrice: existing.product.basePrice },
        { priceOverride: updated.priceOverride }
      );

      return {
        id: updated.id,
        tenantId: updated.tenantId,
        brandId: updated.brandId,
        storeId: updated.storeId,
        productId: updated.productId,
        isAvailable: updated.isAvailable,
        priceOverride: updated.priceOverride ? Number(updated.priceOverride) : null,
        effectivePrice,
        quantity: updated.quantity,
        status: updated.status,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        product: {
          id: existing.product.id,
          name: existing.product.name,
          sku: existing.product.sku,
          slug: existing.product.slug,
          basePrice: existing.product.basePrice ? Number(existing.product.basePrice) : null,
          currency: existing.product.currency,
          status: existing.product.status,
          publishStatus: existing.product.publishStatus,
          category: existing.product.categoryRel,
        },
        store: existing.store,
      };
    });
  }

  /**
   * Sets store-specific price override for a product.
   */
  public static async setPriceOverride(
    tenantId: string,
    storeId: string,
    productId: string,
    priceOverride: number | null
  ): Promise<StoreProductMappingDto> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const existing = await tx.storeProduct.findFirst({
        where: { tenantId, storeId, productId },
        include: {
          product: {
            include: {
              categoryRel: { select: { id: true, name: true, slug: true } },
            },
          },
          store: {
            select: { id: true, name: true, city: true },
          },
        },
      });

      if (!existing) {
        throw createResourceNotFoundError('StoreProduct', `${storeId}:${productId}`);
      }

      const updated = await tx.storeProduct.update({
        where: { id: existing.id },
        data: {
          priceOverride:
            priceOverride !== null ? new Prisma.Decimal(priceOverride) : null,
        },
      });

      const effectivePrice = PriceResolver.resolvePrice(
        { basePrice: existing.product.basePrice },
        { priceOverride: updated.priceOverride }
      );

      return {
        id: updated.id,
        tenantId: updated.tenantId,
        brandId: updated.brandId,
        storeId: updated.storeId,
        productId: updated.productId,
        isAvailable: updated.isAvailable,
        priceOverride: updated.priceOverride ? Number(updated.priceOverride) : null,
        effectivePrice,
        quantity: updated.quantity,
        status: updated.status,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        product: {
          id: existing.product.id,
          name: existing.product.name,
          sku: existing.product.sku,
          slug: existing.product.slug,
          basePrice: existing.product.basePrice ? Number(existing.product.basePrice) : null,
          currency: existing.product.currency,
          status: existing.product.status,
          publishStatus: existing.product.publishStatus,
          category: existing.product.categoryRel,
        },
        store: existing.store,
      };
    });
  }

  /**
   * Sets store-specific stock quantity for a product.
   */
  public static async setQuantity(
    tenantId: string,
    storeId: string,
    productId: string,
    quantity: number
  ): Promise<void> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const existing = await tx.storeProduct.findFirst({
        where: { tenantId, storeId, productId },
      });

      if (!existing) {
        throw createResourceNotFoundError('StoreProduct', `${storeId}:${productId}`);
      }

      await tx.storeProduct.update({
        where: { id: existing.id },
        data: { quantity },
      });
    });
  }

  /**
   * Bulk updates store-product mappings in a single atomic transaction.
   * Prevents issuing an API request per checkbox in the matrix UI.
   */
  public static async bulkUpdateMappings(
    tenantId: string,
    brandId: string,
    storeId: string,
    updates: BulkStoreProductItem[]
  ): Promise<{ updatedCount: number }> {
    if (!updates || updates.length === 0) {
      return { updatedCount: 0 };
    }

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // 1. Verify store belongs to tenant and brand
      const store = await tx.location.findFirst({
        where: { id: storeId, tenantId, brandId },
      });

      if (!store) {
        throw createValidationError(
          `Store ${storeId} does not belong to brand ${brandId} under this tenant`
        );
      }

      // 2. Verify all target products belong to the identical brand and tenant
      const productIds = updates.map((u) => u.productId);
      const verifiedProducts = await tx.product.findMany({
        where: {
          id: { in: productIds },
          tenantId,
          brandId,
        },
        select: { id: true },
      });

      if (verifiedProducts.length !== productIds.length) {
        const foundSet = new Set(verifiedProducts.map((p) => p.id));
        const missing = productIds.filter((id) => !foundSet.has(id));
        throw createValidationError(
          `Cross-brand product assignment denied. Products not belonging to brand ${brandId}: ${missing.join(', ')}`
        );
      }

      // 3. Perform atomic upserts inside transaction
      let updatedCount = 0;
      for (const item of updates) {
        await tx.storeProduct.upsert({
          where: {
            uq_store_product_store_product: {
              storeId,
              productId: item.productId,
            },
          },
          create: {
            tenantId,
            brandId,
            storeId,
            productId: item.productId,
            isAvailable: item.isAvailable !== undefined ? item.isAvailable : true,
            priceOverride:
              item.priceOverride !== undefined && item.priceOverride !== null
                ? new Prisma.Decimal(item.priceOverride)
                : null,
            quantity: item.quantity !== undefined ? item.quantity : 0,
            status: item.status || 'ACTIVE',
          },
          update: {
            ...(item.isAvailable !== undefined ? { isAvailable: item.isAvailable } : {}),
            ...(item.priceOverride !== undefined
              ? {
                  priceOverride:
                    item.priceOverride !== null
                      ? new Prisma.Decimal(item.priceOverride)
                      : null,
                }
            : {}),
            ...(item.quantity !== undefined ? { quantity: item.quantity } : {}),
            ...(item.status ? { status: item.status } : {}),
          },
        });
        updatedCount++;
      }

      return { updatedCount };
    });
  }

  /**
   * Retrieves summary catalog statistics for a store.
   * Used for the Store Management page integration.
   */
  public static async getStoreCatalogSummary(
    tenantId: string,
    storeId: string
  ): Promise<{
    totalMapped: number;
    availableCount: number;
    unavailableCount: number;
    categoriesRepresented: number;
  }> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const storeProducts = await tx.storeProduct.findMany({
        where: { tenantId, storeId },
        select: {
          isAvailable: true,
          product: {
            select: { categoryId: true },
          },
        },
      });

      const totalMapped = storeProducts.length;
      const availableCount = storeProducts.filter((sp) => sp.isAvailable).length;
      const unavailableCount = totalMapped - availableCount;

      const categorySet = new Set<string>();
      for (const sp of storeProducts) {
        if (sp.product.categoryId) {
          categorySet.add(sp.product.categoryId);
        }
      }

      return {
        totalMapped,
        availableCount,
        unavailableCount,
        categoriesRepresented: categorySet.size,
      };
    });
  }
}
