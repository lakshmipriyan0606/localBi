import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { createConflictError, createResourceNotFoundError } from '@/shared/errors';
import type { Data } from '@measured/puck';

export interface PageTemplateVersionDto {
  id: string;
  tenantId: string;
  pageTemplateId: string;
  version: number;
  puckData: Data;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  createdBy: string | null;
  publishedAt: Date | null;
  createdAt: Date;
}

export class TemplateVersionService {
  /**
   * Retrieves the current working DRAFT version for a template.
   * If no draft exists (e.g. all are published), branches a new draft from the latest published version.
   */
  public static async getOrCreateDraft(
    tenantId: string,
    pageTemplateId: string,
    userId?: string
  ): Promise<PageTemplateVersionDto> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // 1. Verify template exists
      const template = await tx.pageTemplate.findFirst({
        where: { id: pageTemplateId, tenantId },
      });
      if (!template) {
        throw createResourceNotFoundError('PageTemplate', pageTemplateId);
      }

      // 2. Find existing DRAFT
      const draft = await tx.pageTemplateVersion.findFirst({
        where: { tenantId, pageTemplateId, status: 'DRAFT' },
        orderBy: { version: 'desc' },
      });

      if (draft) {
        return {
          id: draft.id,
          tenantId: draft.tenantId,
          pageTemplateId: draft.pageTemplateId,
          version: draft.version,
          puckData: draft.puckData as unknown as Data,
          status: draft.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
          createdBy: draft.createdBy,
          publishedAt: draft.publishedAt,
          createdAt: draft.createdAt,
        };
      }

      // 3. No draft exists: find latest version number and active published data to branch
      const latestVersion = await tx.pageTemplateVersion.findFirst({
        where: { tenantId, pageTemplateId },
        orderBy: { version: 'desc' },
      });

      const nextVersionNum = latestVersion ? latestVersion.version + 1 : 1;
      const basePuckData = latestVersion
        ? (latestVersion.puckData as unknown as Data)
        : { content: [], root: { props: { title: template.name } } };

      const newDraft = await tx.pageTemplateVersion.create({
        data: {
          tenantId,
          pageTemplateId,
          version: nextVersionNum,
          puckData: basePuckData as any,
          status: 'DRAFT',
          createdBy: userId ?? null,
        },
      });

      return {
        id: newDraft.id,
        tenantId: newDraft.tenantId,
        pageTemplateId: newDraft.pageTemplateId,
        version: newDraft.version,
        puckData: newDraft.puckData as unknown as Data,
        status: newDraft.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
        createdBy: newDraft.createdBy,
        publishedAt: newDraft.publishedAt,
        createdAt: newDraft.createdAt,
      };
    });
  }

  /**
   * Saves updates to the draft version with optimistic concurrency check.
   */
  public static async saveDraft(
    tenantId: string,
    pageTemplateId: string,
    puckData: Data,
    userId?: string,
    expectedVersion?: number
  ): Promise<PageTemplateVersionDto> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const template = await tx.pageTemplate.findFirst({
        where: { id: pageTemplateId, tenantId },
      });
      if (!template) {
        throw createResourceNotFoundError('PageTemplate', pageTemplateId);
      }

      // Find current draft
      let draft = await tx.pageTemplateVersion.findFirst({
        where: { tenantId, pageTemplateId, status: 'DRAFT' },
        orderBy: { version: 'desc' },
      });

      if (!draft) {
        // Create draft if none existed
        const latest = await tx.pageTemplateVersion.findFirst({
          where: { tenantId, pageTemplateId },
          orderBy: { version: 'desc' },
        });
        const nextVersion = latest ? latest.version + 1 : 1;

        draft = await tx.pageTemplateVersion.create({
          data: {
            tenantId,
            pageTemplateId,
            version: nextVersion,
            puckData: puckData as any,
            status: 'DRAFT',
            createdBy: userId ?? null,
          },
        });
      } else {
        // Concurrency token verification
        if (expectedVersion !== undefined && draft.version !== expectedVersion) {
          throw createConflictError(
            `Draft conflict: expected version ${expectedVersion}, but current draft is version ${draft.version}. Reload and merge changes.`
          );
        }

        draft = await tx.pageTemplateVersion.update({
          where: { id: draft.id },
          data: {
            puckData: puckData as any,
            createdBy: userId || draft.createdBy,
          },
        });
      }

      // Touch parent template
      await tx.pageTemplate.update({
        where: { id: pageTemplateId },
        data: { updatedAt: new Date() },
      });

      return {
        id: draft.id,
        tenantId: draft.tenantId,
        pageTemplateId: draft.pageTemplateId,
        version: draft.version,
        puckData: draft.puckData as unknown as Data,
        status: draft.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
        createdBy: draft.createdBy,
        publishedAt: draft.publishedAt,
        createdAt: draft.createdAt,
      };
    });
  }

  /**
   * Publishes a version, switching the PageTemplate's activeVersionId atomically in a transaction.
   * Promotes DRAFT to PUBLISHED and updates publishedAt.
   */
  public static async publishVersion(
    tenantId: string,
    pageTemplateId: string,
    versionId: string,
    userId?: string
  ): Promise<PageTemplateVersionDto> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // 1. Verify template exists
      const template = await tx.pageTemplate.findFirst({
        where: { id: pageTemplateId, tenantId },
      });
      if (!template) {
        throw createResourceNotFoundError('PageTemplate', pageTemplateId);
      }

      // 2. Verify version exists and belongs to template
      const versionRecord = await tx.pageTemplateVersion.findFirst({
        where: { id: versionId, tenantId, pageTemplateId },
      });
      if (!versionRecord) {
        throw createResourceNotFoundError('PageTemplateVersion', versionId);
      }

      // 3. Mark version as PUBLISHED
      const published = await tx.pageTemplateVersion.update({
        where: { id: versionId },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
          createdBy: userId || versionRecord.createdBy,
        },
      });

      // 4. Update PageTemplate's activeVersionId and mark ACTIVE
      await tx.pageTemplate.update({
        where: { id: pageTemplateId },
        data: {
          activeVersionId: published.id,
          status: 'ACTIVE',
          updatedAt: new Date(),
        },
      });

      return {
        id: published.id,
        tenantId: published.tenantId,
        pageTemplateId: published.pageTemplateId,
        version: published.version,
        puckData: published.puckData as unknown as Data,
        status: published.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
        createdBy: published.createdBy,
        publishedAt: published.publishedAt,
        createdAt: published.createdAt,
      };
    });
  }

  /**
   * Rolls back template to an existing past version.
   */
  public static async rollbackToVersion(
    tenantId: string,
    pageTemplateId: string,
    targetVersionId: string,
    _userId?: string
  ): Promise<PageTemplateVersionDto> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const template = await tx.pageTemplate.findFirst({
        where: { id: pageTemplateId, tenantId },
      });
      if (!template) {
        throw createResourceNotFoundError('PageTemplate', pageTemplateId);
      }

      const targetVersion = await tx.pageTemplateVersion.findFirst({
        where: { id: targetVersionId, tenantId, pageTemplateId },
      });
      if (!targetVersion) {
        throw createResourceNotFoundError('PageTemplateVersion', targetVersionId);
      }

      // Set activeVersionId on PageTemplate to target version
      await tx.pageTemplate.update({
        where: { id: pageTemplateId },
        data: {
          activeVersionId: targetVersion.id,
          updatedAt: new Date(),
        },
      });

      return {
        id: targetVersion.id,
        tenantId: targetVersion.tenantId,
        pageTemplateId: targetVersion.pageTemplateId,
        version: targetVersion.version,
        puckData: targetVersion.puckData as unknown as Data,
        status: targetVersion.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
        createdBy: targetVersion.createdBy,
        publishedAt: targetVersion.publishedAt,
        createdAt: targetVersion.createdAt,
      };
    });
  }

  /**
   * Retrieves the currently active published version for public SSR page rendering.
   */
  public static async getPublishedVersion(
    tenantId: string,
    pageTemplateId: string
  ): Promise<PageTemplateVersionDto | null> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const template = await tx.pageTemplate.findFirst({
        where: { id: pageTemplateId, tenantId },
      });
      if (!template) return null;

      // 1. Check activeVersionId
      if (template.activeVersionId) {
        const active = await tx.pageTemplateVersion.findFirst({
          where: { id: template.activeVersionId, tenantId, pageTemplateId },
        });
        if (active) {
          return {
            id: active.id,
            tenantId: active.tenantId,
            pageTemplateId: active.pageTemplateId,
            version: active.version,
            puckData: active.puckData as unknown as Data,
            status: active.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
            createdBy: active.createdBy,
            publishedAt: active.publishedAt,
            createdAt: active.createdAt,
          };
        }
      }

      // 2. Fallback: get latest version marked PUBLISHED
      const latestPublished = await tx.pageTemplateVersion.findFirst({
        where: { tenantId, pageTemplateId, status: 'PUBLISHED' },
        orderBy: { version: 'desc' },
      });

      if (latestPublished) {
        return {
          id: latestPublished.id,
          tenantId: latestPublished.tenantId,
          pageTemplateId: latestPublished.pageTemplateId,
          version: latestPublished.version,
          puckData: latestPublished.puckData as unknown as Data,
          status: latestPublished.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
          createdBy: latestPublished.createdBy,
          publishedAt: latestPublished.publishedAt,
          createdAt: latestPublished.createdAt,
        };
      }

      return null;
    });
  }

  /**
   * Lists all historical versions of a template.
   */
  public static async listVersions(
    tenantId: string,
    pageTemplateId: string
  ): Promise<PageTemplateVersionDto[]> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const rows = await tx.pageTemplateVersion.findMany({
        where: { tenantId, pageTemplateId },
        orderBy: { version: 'desc' },
      });

      return rows.map((r) => ({
        id: r.id,
        tenantId: r.tenantId,
        pageTemplateId: r.pageTemplateId,
        version: r.version,
        puckData: r.puckData as unknown as Data,
        status: r.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
        createdBy: r.createdBy,
        publishedAt: r.publishedAt,
        createdAt: r.createdAt,
      }));
    });
  }
}
