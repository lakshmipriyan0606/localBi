import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';

export class SlugService {
  /**
   * Normalizes arbitrary text into a URL-safe lowercase slug.
   * Rules:
   * - lowercase
   * - trim
   * - strip non-alphanumeric chars except hyphens
   * - collapse consecutive hyphens
   * - trim leading/trailing hyphens
   */
  public static normalizeSlug(input: string): string {
    if (!input || typeof input !== 'string') return '';
    return input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Alias for normalizeSlug to support standard slugify calls.
   */
  public static slugify(input: string): string {
    return this.normalizeSlug(input);
  }

  /**
   * Generates a deterministic, unique slug within a Brand for products or categories.
   * If slug is already taken by another record in the same brand, appends -2, -3, etc.
   */
  public static async generateUniqueBrandSlug(
    tx: Prisma.TransactionClient,
    tenantId: string,
    brandId: string,
    rawNameOrSlug: string,
    model: 'product' | 'category',
    existingRecordId?: string
  ): Promise<string> {
    const baseSlug = this.normalizeSlug(rawNameOrSlug) || 'item';
    let candidate = baseSlug;
    let counter = 1;

    while (true) {
      if (model === 'product') {
        const found = await tx.product.findFirst({
          where: {
            tenantId,
            brandId,
            slug: candidate,
            ...(existingRecordId ? { id: { not: existingRecordId } } : {}),
          },
          select: { id: true },
        });
        if (!found) return candidate;
      } else {
        const found = await tx.category.findFirst({
          where: {
            tenantId,
            brandId,
            slug: candidate,
            ...(existingRecordId ? { id: { not: existingRecordId } } : {}),
          },
          select: { id: true },
        });
        if (!found) return candidate;
      }

      counter++;
      candidate = `${baseSlug}-${counter}`;
    }
  }

  /**
   * High-level helper to generate a unique product slug inside a tenant context.
   */
  public static async generateUniqueProductSlug(
    tenantId: string,
    brandId: string,
    rawNameOrSlug: string,
    existingRecordId?: string
  ): Promise<string> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      return this.generateUniqueBrandSlug(
        tx,
        tenantId,
        brandId,
        rawNameOrSlug,
        'product',
        existingRecordId
      );
    });
  }

  /**
   * High-level helper to generate a unique category slug inside a tenant context.
   */
  public static async generateUniqueCategorySlug(
    tenantId: string,
    brandId: string,
    rawNameOrSlug: string,
    existingRecordId?: string
  ): Promise<string> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      return this.generateUniqueBrandSlug(
        tx,
        tenantId,
        brandId,
        rawNameOrSlug,
        'category',
        existingRecordId
      );
    });
  }
}
