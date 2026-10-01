import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { SlugService } from './slug-service';
import {
  createValidationError,
  createResourceNotFoundError,
  createConflictError,
} from '@/shared/errors';

export interface ProductMediaDto {
  id: string;
  url: string;
  altText: string | null;
  sortOrder: number;
  type: string;
}

export interface ProductDto {
  id: string;
  tenantId: string;
  brandId: string;
  categoryId: string | null;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string | null;
  description: string | null;
  basePrice: number | null;
  currency: string;
  status: string;
  publishStatus: string;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
  category?: { id: string; name: string; slug: string } | null;
  media?: ProductMediaDto[];
  storesAvailableCount?: number;
}

export interface ListProductsFilter {
  brandId?: string | undefined;
  categoryId?: string | undefined;
  status?: string | undefined;
  publishStatus?: string | undefined;
  search?: string | undefined;
  featured?: boolean | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export interface CreateProductInput {
  brandId: string;
  name: string;
  sku: string;
  slug?: string | undefined;
  categoryId?: string | null | undefined;
  shortDescription?: string | undefined;
  description?: string | undefined;
  basePrice?: number | null | undefined;
  currency?: string | undefined;
  status?: 'ACTIVE' | 'INACTIVE' | undefined;
  publishStatus?: 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | undefined;
  featured?: boolean | undefined;
  media?: Array<{ url: string; altText?: string | undefined; sortOrder?: number | undefined; type?: string | undefined }> | undefined;
}

export interface UpdateProductInput {
  name?: string | undefined;
  sku?: string | undefined;
  slug?: string | undefined;
  categoryId?: string | null | undefined;
  shortDescription?: string | undefined;
  description?: string | undefined;
  basePrice?: number | null | undefined;
  currency?: string | undefined;
  status?: 'ACTIVE' | 'INACTIVE' | undefined;
  publishStatus?: 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | undefined;
  featured?: boolean | undefined;
}

export class ProductService {
  /**
   * Lists products for a tenant with optional filtering by brand, category, search, and status.
   */
  public static async listProducts(
    tenantId: string,
    filters: ListProductsFilter = {}
  ): Promise<{ products: ProductDto[]; total: number }> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const page = Math.max(1, filters.page || 1);
      const limit = Math.min(100, Math.max(1, filters.limit || 50));
      const skip = (page - 1) * limit;

      const where: Prisma.ProductWhereInput = {
        tenantId,
        ...(filters.brandId ? { brandId: filters.brandId } : {}),
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.publishStatus ? { publishStatus: filters.publishStatus } : {}),
        ...(filters.featured !== undefined ? { featured: filters.featured } : {}),
        ...(filters.search
          ? {
              OR: [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { sku: { contains: filters.search, mode: 'insensitive' } },
                { description: { contains: filters.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      };

      const [total, rows] = await Promise.all([
        tx.product.count({ where }),
        tx.product.findMany({
          where,
          include: {
            categoryRel: { select: { id: true, name: true, slug: true } },
            media: {
              select: { id: true, url: true, altText: true, sortOrder: true, type: true },
              orderBy: { sortOrder: 'asc' },
            },
            _count: {
              select: {
                storeProducts: {
                  where: { isAvailable: true, status: 'ACTIVE' },
                },
              },
            },
          },
          orderBy: [{ updatedAt: 'desc' }, { name: 'asc' }],
          skip,
          take: limit,
        }),
      ]);

      const products: ProductDto[] = rows.map((r) => ({
        id: r.id,
        tenantId: r.tenantId,
        brandId: r.brandId,
        categoryId: r.categoryId,
        name: r.name,
        slug: r.slug,
        sku: r.sku,
        shortDescription: r.shortDescription,
        description: r.description,
        basePrice: r.basePrice ? Number(r.basePrice) : null,
        currency: r.currency,
        status: r.status,
        publishStatus: r.publishStatus,
        featured: r.featured,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        category: r.categoryRel,
        media: r.media,
        storesAvailableCount: r._count.storeProducts,
      }));

      return { products, total };
    });
  }

  /**
   * Retrieves an individual product by ID.
   */
  public static async getProductById(
    tenantId: string,
    productId: string
  ): Promise<ProductDto | null> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const r = await tx.product.findFirst({
        where: { id: productId, tenantId },
        include: {
          categoryRel: { select: { id: true, name: true, slug: true } },
          media: {
            select: { id: true, url: true, altText: true, sortOrder: true, type: true },
            orderBy: { sortOrder: 'asc' },
          },
          _count: {
            select: {
              storeProducts: {
                where: { isAvailable: true, status: 'ACTIVE' },
              },
            },
          },
        },
      });

      if (!r) return null;

      return {
        id: r.id,
        tenantId: r.tenantId,
        brandId: r.brandId,
        categoryId: r.categoryId,
        name: r.name,
        slug: r.slug,
        sku: r.sku,
        shortDescription: r.shortDescription,
        description: r.description,
        basePrice: r.basePrice ? Number(r.basePrice) : null,
        currency: r.currency,
        status: r.status,
        publishStatus: r.publishStatus,
        featured: r.featured,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        category: r.categoryRel,
        media: r.media,
        storesAvailableCount: r._count.storeProducts,
      };
    });
  }

  /**
   * Retrieves an individual product by ID, throwing ResourceNotFoundError if missing.
   */
  public static async getProduct(
    tenantId: string,
    productId: string
  ): Promise<ProductDto> {
    const prod = await this.getProductById(tenantId, productId);
    if (!prod) {
      throw createResourceNotFoundError('Product', productId);
    }
    return prod;
  }

  /**
   * Creates a new Product under a Brand with SKU uniqueness and Category validation.
   */
  public static async createProduct(
    tenantId: string,
    input: CreateProductInput
  ): Promise<ProductDto> {
    const cleanName = input.name?.trim();
    if (!cleanName) throw createValidationError('Product name is required');

    const cleanSku = input.sku?.trim().toUpperCase();
    if (!cleanSku) throw createValidationError('Product SKU is required');

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // 1. Verify Brand exists and belongs to Tenant
      const brand = await tx.brand.findFirst({
        where: { id: input.brandId, tenantId, isArchived: false },
        select: { id: true },
      });
      if (!brand) throw createResourceNotFoundError('Brand', input.brandId);

      // 2. Check SKU uniqueness within Brand
      const existingSku = await tx.product.findFirst({
        where: { tenantId, brandId: input.brandId, sku: cleanSku },
        select: { id: true },
      });
      if (existingSku) {
        throw createConflictError(`SKU "${cleanSku}" already exists for brand ${input.brandId}`);
      }

      // 3. Verify Category belongs to the same Brand (if assigned)
      if (input.categoryId) {
        const category = await tx.category.findFirst({
          where: { id: input.categoryId, tenantId, brandId: input.brandId },
          select: { id: true },
        });
        if (!category) {
          throw createValidationError(
            'The selected category does not belong to the product brand'
          );
        }
      }

      // 4. Generate deterministic unique slug
      const slug = await SlugService.generateUniqueBrandSlug(
        tx,
        tenantId,
        input.brandId,
        input.slug || cleanName,
        'product'
      );

      const created = await tx.product.create({
        data: {
          tenantId,
          brandId: input.brandId,
          categoryId: input.categoryId || null,
          name: cleanName,
          slug,
          sku: cleanSku,
          shortDescription: input.shortDescription?.trim() || null,
          description: input.description?.trim() || null,
          basePrice: input.basePrice !== undefined && input.basePrice !== null ? input.basePrice : null,
          currency: input.currency?.toUpperCase() || 'INR',
          status: input.status || 'ACTIVE',
          publishStatus: input.publishStatus || 'DRAFT',
          featured: input.featured ?? false,
          ...(input.media && input.media.length > 0
            ? {
                media: {
                  create: input.media.map((m, idx) => ({
                    tenantId,
                    url: m.url,
                    altText: m.altText || null,
                    sortOrder: m.sortOrder ?? idx,
                    type: m.type || 'IMAGE',
                  })),
                },
              }
            : {}),
        },
        include: {
          categoryRel: { select: { id: true, name: true, slug: true } },
          media: {
            select: { id: true, url: true, altText: true, sortOrder: true, type: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });

      return {
        id: created.id,
        tenantId: created.tenantId,
        brandId: created.brandId,
        categoryId: created.categoryId,
        name: created.name,
        slug: created.slug,
        sku: created.sku,
        shortDescription: created.shortDescription,
        description: created.description,
        basePrice: created.basePrice ? Number(created.basePrice) : null,
        currency: created.currency,
        status: created.status,
        publishStatus: created.publishStatus,
        featured: created.featured,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
        category: created.categoryRel,
        media: created.media,
        storesAvailableCount: 0,
      };
    });
  }

  /**
   * Updates an existing Product.
   */
  public static async updateProduct(
    tenantId: string,
    productId: string,
    input: UpdateProductInput
  ): Promise<ProductDto> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const existing = await tx.product.findFirst({
        where: { id: productId, tenantId },
      });
      if (!existing) throw createResourceNotFoundError('Product', productId);

      // 1. SKU uniqueness check if changing SKU
      let sku = existing.sku;
      if (input.sku) {
        const cleanSku = input.sku.trim().toUpperCase();
        if (cleanSku !== existing.sku) {
          const duplicate = await tx.product.findFirst({
            where: {
              tenantId,
              brandId: existing.brandId,
              sku: cleanSku,
              id: { not: productId },
            },
            select: { id: true },
          });
          if (duplicate) {
            throw createConflictError(`SKU "${cleanSku}" already exists for brand ${existing.brandId}`);
          }
          sku = cleanSku;
        }
      }

      // 2. Validate category brand consistency
      if (input.categoryId !== undefined) {
        if (input.categoryId !== null) {
          const category = await tx.category.findFirst({
            where: { id: input.categoryId, tenantId, brandId: existing.brandId },
            select: { id: true },
          });
          if (!category) {
            throw createValidationError(
              'The selected category does not belong to the product brand'
            );
          }
        }
      }

      // 3. Slug update if explicitly supplied
      let slug = existing.slug;
      if (input.slug && input.slug !== existing.slug) {
        slug = await SlugService.generateUniqueBrandSlug(
          tx,
          tenantId,
          existing.brandId,
          input.slug,
          'product',
          productId
        );
      }

      const data: Prisma.ProductUncheckedUpdateInput = {
        sku,
        slug,
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
        ...(input.shortDescription !== undefined && { shortDescription: input.shortDescription?.trim() || null }),
        ...(input.description !== undefined && { description: input.description?.trim() || null }),
        ...(input.basePrice !== undefined && {
          basePrice: input.basePrice !== null ? new Prisma.Decimal(input.basePrice) : null,
        }),
        ...(input.currency !== undefined && { currency: input.currency.toUpperCase() }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.publishStatus !== undefined && { publishStatus: input.publishStatus }),
        ...(input.featured !== undefined && { featured: input.featured }),
      };

      const updated = await tx.product.update({
        where: { id: productId },
        data,
        include: {
          categoryRel: { select: { id: true, name: true, slug: true } },
          media: {
            select: { id: true, url: true, altText: true, sortOrder: true, type: true },
            orderBy: { sortOrder: 'asc' },
          },
          _count: {
            select: {
              storeProducts: {
                where: { isAvailable: true, status: 'ACTIVE' },
              },
            },
          },
        },
      });

      return {
        id: updated.id,
        tenantId: updated.tenantId,
        brandId: updated.brandId,
        categoryId: updated.categoryId,
        name: updated.name,
        slug: updated.slug,
        sku: updated.sku,
        shortDescription: updated.shortDescription,
        description: updated.description,
        basePrice: updated.basePrice ? Number(updated.basePrice) : null,
        currency: updated.currency,
        status: updated.status,
        publishStatus: updated.publishStatus,
        featured: updated.featured,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        category: updated.categoryRel,
        media: updated.media,
        storesAvailableCount: updated._count.storeProducts,
      };
    });
  }

  /**
   * Publishes a product live.
   */
  public static async publishProduct(tenantId: string, productId: string): Promise<ProductDto> {
    return this.updateProduct(tenantId, productId, { publishStatus: 'PUBLISHED' });
  }

  /**
   * Unpublishes a product back to DRAFT or UNPUBLISHED.
   */
  public static async unpublishProduct(tenantId: string, productId: string): Promise<ProductDto> {
    return this.updateProduct(tenantId, productId, { publishStatus: 'UNPUBLISHED' });
  }

  /**
   * Archives a product (soft-delete).
   */
  public static async archiveProduct(tenantId: string, productId: string): Promise<ProductDto> {
    return this.updateProduct(tenantId, productId, { status: 'INACTIVE' });
  }

  /**
   * Attaches a media asset to a product.
   */
  public static async addProductMedia(
    tenantId: string,
    productId: string,
    media: { url: string; altText?: string; sortOrder?: number; type?: string }
  ): Promise<ProductMediaDto> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: productId, tenantId },
        select: { id: true },
      });
      if (!product) throw createResourceNotFoundError('Product', productId);

      const created = await tx.productMedia.create({
        data: {
          tenantId,
          productId,
          url: media.url,
          altText: media.altText || null,
          sortOrder: media.sortOrder ?? 0,
          type: media.type || 'IMAGE',
        },
      });

      return {
        id: created.id,
        url: created.url,
        altText: created.altText,
        sortOrder: created.sortOrder,
        type: created.type,
      };
    });
  }

  /**
   * Removes a media asset from a product.
   */
  public static async removeProductMedia(tenantId: string, mediaId: string): Promise<boolean> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const existing = await tx.productMedia.findFirst({
        where: { id: mediaId, tenantId },
        select: { id: true },
      });
      if (!existing) return false;

      await tx.productMedia.delete({ where: { id: mediaId } });
      return true;
    });
  }
}
