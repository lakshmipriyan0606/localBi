import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { SlugService } from './slug-service';
import {
  createValidationError,
  createResourceNotFoundError,
} from '@/shared/errors';

export interface CategoryDto {
  id: string;
  tenantId: string;
  brandId: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  parent?: { id: string; name: string; slug: string } | null;
  productCount?: number;
}

export interface CreateCategoryInput {
  brandId: string;
  name: string;
  slug?: string | undefined;
  description?: string | undefined;
  parentId?: string | null | undefined;
  sortOrder?: number | undefined;
}

export interface UpdateCategoryInput {
  name?: string | undefined;
  slug?: string | undefined;
  description?: string | undefined;
  parentId?: string | null | undefined;
  sortOrder?: number | undefined;
  status?: 'ACTIVE' | 'INACTIVE' | undefined;
}

export class CategoryService {
  /**
   * Validates that proposing `proposedParentId` for `categoryId` does not introduce
   * a self-reference or an ancestor cycle (e.g. A -> B -> C -> A).
   */
  public static async validateHierarchy(
    tx: Parameters<Parameters<typeof TenantContextService.withTenantContext>[2]>[0],
    tenantId: string,
    brandId: string,
    categoryId: string | null,
    proposedParentId: string | null
  ): Promise<void> {
    if (!proposedParentId) return;

    if (categoryId && categoryId === proposedParentId) {
      throw createValidationError('A category cannot be its own parent');
    }

    // Verify parent exists and belongs to the same brand
    const parent = await tx.category.findFirst({
      where: { id: proposedParentId, tenantId, brandId },
      select: { id: true, parentId: true },
    });

    if (!parent) {
      throw createValidationError(
        `Parent category ${proposedParentId} not found or does not belong to brand ${brandId}`
      );
    }

    if (!categoryId) return;

    // Traverse upwards to detect cycles
    let currentAncestorId: string | null = parent.parentId;
    const visited = new Set<string>([proposedParentId]);

    while (currentAncestorId) {
      if (currentAncestorId === categoryId) {
        throw createValidationError(
          'Cyclic category hierarchy cycle detected: A category cannot be parented under its own descendant'
        );
      }
      if (visited.has(currentAncestorId)) {
        break; // Infinite loop protection
      }
      visited.add(currentAncestorId);

      const ancestor = await tx.category.findFirst({
        where: { id: currentAncestorId, tenantId, brandId },
        select: { parentId: true },
      });
      currentAncestorId = ancestor?.parentId || null;
    }
  }

  /**
   * Lists all categories for a brand under authenticated tenant context.
   */
  public static async listCategories(
    tenantId: string,
    brandIdOrOptions?: string | { brandId?: string | undefined; status?: string | undefined; includeInactive?: boolean | undefined } | undefined,
    includeInactiveLegacy = false
  ): Promise<CategoryDto[]> {
    const brandId = typeof brandIdOrOptions === 'string' ? brandIdOrOptions : brandIdOrOptions?.brandId;
    const status = typeof brandIdOrOptions === 'object' ? brandIdOrOptions?.status : undefined;
    const includeInactive = typeof brandIdOrOptions === 'object'
      ? (brandIdOrOptions?.includeInactive ?? false)
      : includeInactiveLegacy;

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const rows = await tx.category.findMany({
        where: {
          tenantId,
          ...(brandId ? { brandId } : {}),
          ...(status ? { status } : includeInactive ? {} : { status: 'ACTIVE' }),
        },
        include: {
          parent: { select: { id: true, name: true, slug: true } },
          _count: { select: { products: true } },
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });

      return rows.map((r) => ({
        id: r.id,
        tenantId: r.tenantId,
        brandId: r.brandId,
        parentId: r.parentId,
        name: r.name,
        slug: r.slug,
        description: r.description,
        sortOrder: r.sortOrder,
        status: r.status,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        parent: r.parent,
        productCount: r._count.products,
      }));
    });
  }

  /**
   * Alias for getCategoryById to satisfy getCategory interface requirement.
   */
  public static async getCategory(
    tenantId: string,
    categoryId: string
  ): Promise<CategoryDto | null> {
    return this.getCategoryById(tenantId, categoryId);
  }

  /**
   * Retrieves a category by ID under authenticated tenant context.
   */
  public static async getCategoryById(
    tenantId: string,
    categoryId: string
  ): Promise<CategoryDto | null> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const r = await tx.category.findFirst({
        where: { id: categoryId, tenantId },
        include: {
          parent: { select: { id: true, name: true, slug: true } },
          _count: { select: { products: true } },
        },
      });

      if (!r) return null;

      return {
        id: r.id,
        tenantId: r.tenantId,
        brandId: r.brandId,
        parentId: r.parentId,
        name: r.name,
        slug: r.slug,
        description: r.description,
        sortOrder: r.sortOrder,
        status: r.status,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        parent: r.parent,
        productCount: r._count.products,
      };
    });
  }

  /**
   * Creates a new Category scoped to tenant and brand.
   */
  public static async createCategory(
    tenantId: string,
    input: CreateCategoryInput
  ): Promise<CategoryDto> {
    const cleanName = input.name?.trim();
    if (!cleanName || cleanName.length < 1) {
      throw createValidationError('Category name is required');
    }

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // 1. Verify brand exists and belongs to tenant
      const brand = await tx.brand.findFirst({
        where: { id: input.brandId, tenantId, isArchived: false },
        select: { id: true },
      });
      if (!brand) {
        throw createResourceNotFoundError('Brand', input.brandId);
      }

      // 2. Validate hierarchy if parentId is provided
      await this.validateHierarchy(tx, tenantId, input.brandId, null, input.parentId || null);

      // 3. Generate deterministic unique slug within the brand
      const slug = await SlugService.generateUniqueBrandSlug(
        tx,
        tenantId,
        input.brandId,
        input.slug || cleanName,
        'category'
      );

      const created = await tx.category.create({
        data: {
          tenantId,
          brandId: input.brandId,
          name: cleanName,
          slug,
          description: input.description?.trim() || null,
          parentId: input.parentId || null,
          sortOrder: input.sortOrder ?? 0,
          status: 'ACTIVE',
        },
        include: {
          parent: { select: { id: true, name: true, slug: true } },
        },
      });

      return {
        ...created,
        productCount: 0,
      };
    });
  }

  /**
   * Updates an existing Category with hierarchy and slug uniqueness checks.
   */
  public static async updateCategory(
    tenantId: string,
    categoryId: string,
    input: UpdateCategoryInput
  ): Promise<CategoryDto> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const existing = await tx.category.findFirst({
        where: { id: categoryId, tenantId },
      });
      if (!existing) {
        throw createResourceNotFoundError('Category', categoryId);
      }

      // Validate hierarchy if parentId is changing
      if (input.parentId !== undefined && input.parentId !== existing.parentId) {
        await this.validateHierarchy(tx, tenantId, existing.brandId, categoryId, input.parentId);
      }

      let slug = existing.slug;
      if (input.slug && input.slug !== existing.slug) {
        slug = await SlugService.generateUniqueBrandSlug(
          tx,
          tenantId,
          existing.brandId,
          input.slug,
          'category',
          categoryId
        );
      }

      const data: import('@prisma/client').Prisma.CategoryUncheckedUpdateInput = {
        slug,
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.description !== undefined && { description: input.description?.trim() || null }),
        ...(input.parentId !== undefined && { parentId: input.parentId }),
        ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
        ...(input.status !== undefined && { status: input.status }),
      };

      const updated = await tx.category.update({
        where: { id: categoryId },
        data,
        include: {
          parent: { select: { id: true, name: true, slug: true } },
          _count: { select: { products: true } },
        },
      });

      return {
        id: updated.id,
        tenantId: updated.tenantId,
        brandId: updated.brandId,
        parentId: updated.parentId,
        name: updated.name,
        slug: updated.slug,
        description: updated.description,
        sortOrder: updated.sortOrder,
        status: updated.status,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        parent: updated.parent,
        productCount: updated._count.products,
      };
    });
  }

  /**
   * Archives a category (soft-delete).
   */
  public static async archiveCategory(tenantId: string, categoryId: string): Promise<CategoryDto> {
    return this.updateCategory(tenantId, categoryId, { status: 'INACTIVE' });
  }
}
