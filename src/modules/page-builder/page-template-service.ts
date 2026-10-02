import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { createValidationError, createConflictError, createResourceNotFoundError } from '@/shared/errors';
import type { Data } from '@measured/puck';

export type PageTemplateType =
  | 'HOME'
  | 'CITY'
  | 'STORE'
  | 'CATEGORY'
  | 'PRODUCT'
  | 'STORE_PRODUCT'
  | 'ARTICLE'
  | 'BLOG_INDEX'
  | 'CUSTOM';

export interface PageTemplateDto {
  id: string;
  tenantId: string;
  brandId: string;
  webSurfaceId: string;
  name: string;
  type: PageTemplateType;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  activeVersionId: string | null;
  activeVersionNumber?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTemplateInput {
  name: string;
  type?: PageTemplateType | undefined;
  initialPuckData?: Data | undefined;
  userId?: string | undefined;
}

export interface UpdateTemplateInput {
  name?: string | undefined;
  status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | undefined;
}

export class PageTemplateService {
  /**
   * Creates a new PageTemplate under a brand's WebSurface, initializing Version 1 (DRAFT).
   */
  public static async createTemplate(
    tenantId: string,
    brandId: string,
    webSurfaceId: string,
    input: CreateTemplateInput
  ): Promise<PageTemplateDto> {
    if (!input.name || !input.name.trim()) {
      throw createValidationError('Template name is required');
    }

    const type = input.type || 'STORE';

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // 1. Verify surface belongs to brand and tenant
      const surface = await tx.webSurface.findFirst({
        where: { id: webSurfaceId, tenantId, brandId },
      });
      if (!surface) {
        throw createResourceNotFoundError('WebSurface', webSurfaceId);
      }

      // 2. Check for duplicate template name under same surface & type
      const existing = await tx.pageTemplate.findFirst({
        where: {
          tenantId,
          brandId,
          webSurfaceId,
          type,
          name: input.name.trim(),
        },
      });
      if (existing) {
        throw createConflictError(`Template with name "${input.name.trim()}" already exists for type ${type}.`);
      }

      // 3. Create PageTemplate
      const template = await tx.pageTemplate.create({
        data: {
          tenantId,
          brandId,
          webSurfaceId,
          name: input.name.trim(),
          type,
          status: 'ACTIVE',
        },
      });

      // 4. Create initial Draft Version 1
      const initialPuckData = input.initialPuckData || {
        content: [],
        root: { props: { title: input.name.trim() } },
      };

      await tx.pageTemplateVersion.create({
        data: {
          tenantId,
          pageTemplateId: template.id,
          version: 1,
          puckData: initialPuckData as any,
          status: 'DRAFT',
          createdBy: input.userId ?? null,
        },
      });

      return {
        id: template.id,
        tenantId: template.tenantId,
        brandId: template.brandId,
        webSurfaceId: template.webSurfaceId,
        name: template.name,
        type: template.type as PageTemplateType,
        status: template.status as 'ACTIVE' | 'INACTIVE' | 'ARCHIVED',
        activeVersionId: template.activeVersionId,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      };
    });
  }

  /**
   * Retrieves a template by ID under tenant context.
   */
  public static async getTemplate(
    tenantId: string,
    templateId: string
  ): Promise<PageTemplateDto | null> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const template = await tx.pageTemplate.findFirst({
        where: { id: templateId, tenantId },
        include: {
          versions: {
            where: { status: 'PUBLISHED' },
            orderBy: { version: 'desc' },
            take: 1,
            select: { version: true },
          },
        },
      });

      if (!template) return null;

      return {
        id: template.id,
        tenantId: template.tenantId,
        brandId: template.brandId,
        webSurfaceId: template.webSurfaceId,
        name: template.name,
        type: template.type as PageTemplateType,
        status: template.status as 'ACTIVE' | 'INACTIVE' | 'ARCHIVED',
        activeVersionId: template.activeVersionId,
        activeVersionNumber: template.versions[0]?.version || null,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      };
    });
  }

  /**
   * Lists templates for a brand and web surface with optional type filtering.
   */
  public static async listTemplates(
    tenantId: string,
    brandId: string,
    webSurfaceId?: string | undefined,
    type?: PageTemplateType | undefined
  ): Promise<PageTemplateDto[]> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const rows = await tx.pageTemplate.findMany({
        where: {
          tenantId,
          brandId,
          ...(webSurfaceId ? { webSurfaceId } : {}),
          ...(type ? { type } : {}),
          status: { not: 'ARCHIVED' },
        },
        orderBy: [{ type: 'asc' }, { updatedAt: 'desc' }],
      });

      return rows.map((t) => ({
        id: t.id,
        tenantId: t.tenantId,
        brandId: t.brandId,
        webSurfaceId: t.webSurfaceId,
        name: t.name,
        type: t.type as PageTemplateType,
        status: t.status as 'ACTIVE' | 'INACTIVE' | 'ARCHIVED',
        activeVersionId: t.activeVersionId,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      }));
    });
  }

  /**
   * Updates template metadata.
   */
  public static async updateTemplate(
    tenantId: string,
    templateId: string,
    input: UpdateTemplateInput
  ): Promise<PageTemplateDto> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const existing = await tx.pageTemplate.findFirst({
        where: { id: templateId, tenantId },
      });
      if (!existing) {
        throw createResourceNotFoundError('PageTemplate', templateId);
      }

      const updated = await tx.pageTemplate.update({
        where: { id: templateId },
        data: {
          ...(input.name !== undefined && { name: input.name.trim() }),
          ...(input.status !== undefined && { status: input.status }),
        },
      });

      return {
        id: updated.id,
        tenantId: updated.tenantId,
        brandId: updated.brandId,
        webSurfaceId: updated.webSurfaceId,
        name: updated.name,
        type: updated.type as PageTemplateType,
        status: updated.status as 'ACTIVE' | 'INACTIVE' | 'ARCHIVED',
        activeVersionId: updated.activeVersionId,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };
    });
  }

  /**
   * Archives a template.
   */
  public static async archiveTemplate(
    tenantId: string,
    templateId: string
  ): Promise<void> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const existing = await tx.pageTemplate.findFirst({
        where: { id: templateId, tenantId },
      });
      if (!existing) {
        throw createResourceNotFoundError('PageTemplate', templateId);
      }

      await tx.pageTemplate.update({
        where: { id: templateId },
        data: { status: 'ARCHIVED' },
      });
    });
  }
}
