/**
 * Phase 11: Content Engine Core Service
 * Handles CMS entities, immutable versioning, editorial workflows,
 * slug redirect preservation, and multi-tenant RLS isolation.
 */

import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import {
  AuthorizedContext,
  AuthorizationService,
  Action,
} from '@/shared/authorization/policy';
import {
  createContentNotFoundError,
  createContentVersionNotFoundError,
  createContentWorkflowError,
  createVersionConflictError,
  createRedirectConflictError,
  createTenantAccessDeniedError,
  ErrorCode,
  AppError,
} from '@/shared/errors';
import { logger } from '@/shared/observability/logger';
import {
  ContentItemRecord,
  ContentVersionRecord,
  ContentAuthorRecord,
  ContentCategoryRecord,
  RedirectRecord,
  CreateContentItemInput,
  UpdateContentItemInput,
  WorkflowTransitionInput,
  ContentFilterParams,
  ContentStatus,
  ContentOrigin,
} from './content-types';

export class ContentService {
  /**
   * Calculates word count and reading time estimate.
   */
  public static calculateReadingStats(text?: string | null): { wordCount: number; readingTimeMinutes: number } {
    if (!text || !text.trim()) {
      return { wordCount: 0, readingTimeMinutes: 1 };
    }
    const words = text.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));
    return { wordCount, readingTimeMinutes };
  }

  /**
   * Lists content items with multi-tenant RLS and rich filtering.
   */
  public static async listContentItems(
    params: ContentFilterParams,
    context: AuthorizedContext
  ): Promise<{ items: ContentItemRecord[]; total: number; page: number; limit: number }> {
    AuthorizationService.assertCan(context, Action.CONTENT_VIEW);

    if (context.tenantId !== params.tenantId) {
      throw createTenantAccessDeniedError(params.tenantId);
    }

    const {
      tenantId,
      brandId,
      webSurfaceId,
      type,
      status,
      categoryId,
      authorId,
      search,
      page = 1,
      limit = 20,
    } = params;

    if (brandId) {
      AuthorizationService.assertBrandAccess(context, brandId);
    }

    return await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const where: any = {
        tenantId,
      };

      if (brandId) where.brandId = brandId;
      if (webSurfaceId) where.webSurfaceId = webSurfaceId;
      if (type) where.type = type;
      if (status) where.status = status;
      if (categoryId) where.categoryId = categoryId;
      if (authorId) where.authorId = authorId;

      if (search && search.trim()) {
        const query = search.trim();
        where.OR = [
          { title: { contains: query, mode: 'insensitive' } },
          { slug: { contains: query, mode: 'insensitive' } },
          { excerpt: { contains: query, mode: 'insensitive' } },
        ];
      }

      const skip = (page - 1) * limit;

      const [rawItems, total] = await Promise.all([
        tx.contentItem.findMany({
          where,
          skip,
          take: limit,
          orderBy: { updatedAt: 'desc' },
          include: {
            author: true,
            category: true,
            brief: true,
            versions: {
              orderBy: { version: 'desc' },
              take: 5,
            },
          },
        }),
        tx.contentItem.count({ where }),
      ]);

      const items = rawItems.map((item: any) => this.mapContentItem(item));
      return { items, total, page, limit };
    });
  }

  /**
   * Retrieves a single content item by ID with full version and author context.
   */
  public static async getContentItemById(
    tenantId: string,
    id: string,
    context: AuthorizedContext
  ): Promise<ContentItemRecord> {
    AuthorizationService.assertCan(context, Action.CONTENT_VIEW);

    return await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const item = await tx.contentItem.findFirst({
        where: { id, tenantId },
        include: {
          author: true,
          category: true,
          brief: true,
          versions: {
            orderBy: { version: 'desc' },
            take: 20,
          },
          relations: true,
        },
      });

      if (!item) {
        throw createContentNotFoundError(id);
      }

      if (item.brandId) {
        AuthorizationService.assertBrandAccess(context, item.brandId);
      }

      return this.mapContentItem(item);
    });
  }

  /**
   * Public or canonical resolution by slug.
   * Checks redirects if the slug is not directly found.
   */
  public static async getContentItemBySlug(
    tenantId: string,
    slug: string,
    options?: { onlyPublished?: boolean; webSurfaceId?: string }
  ): Promise<{ item?: ContentItemRecord | null; redirect?: RedirectRecord | null }> {
    return await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const where: any = {
        tenantId,
        slug,
      };

      if (options?.onlyPublished) {
        where.status = ContentStatus.PUBLISHED;
      }
      if (options?.webSurfaceId) {
        where.webSurfaceId = options.webSurfaceId;
      }

      const item = await tx.contentItem.findFirst({
        where,
        include: {
          author: true,
          category: true,
          brief: true,
          versions: {
            orderBy: { version: 'desc' },
            take: 5,
          },
        },
      });

      if (item) {
        return { item: this.mapContentItem(item) };
      }

      // Check if there is an active redirect for this path/slug
      const normalPath = slug.startsWith('/') ? slug : `/blog/${slug}`;
      const altPath = slug.startsWith('/') ? slug.replace(/^\//, '') : slug;

      const redirect = await tx.redirect.findFirst({
        where: {
          tenantId,
          isActive: true,
          OR: [
            { fromPath: normalPath },
            { fromPath: altPath },
            { fromPath: `/blog/${altPath}` },
            { fromPath: `/${altPath}` },
          ],
        },
      });

      if (redirect) {
        return {
          item: null,
          redirect: {
            id: redirect.id,
            tenantId: redirect.tenantId,
            webSurfaceId: redirect.webSurfaceId,
            fromPath: redirect.fromPath,
            toPath: redirect.toPath,
            statusCode: redirect.statusCode,
            reason: redirect.reason,
            isActive: redirect.isActive,
            createdAt: redirect.createdAt,
            updatedAt: redirect.updatedAt,
          },
        };
      }

      return { item: null, redirect: null };
    });
  }

  /**
   * Creates a new content item with an immutable initial version (v1).
   */
  public static async createContentItem(
    input: CreateContentItemInput,
    context: AuthorizedContext
  ): Promise<ContentItemRecord> {
    AuthorizationService.assertCan(context, Action.CONTENT_CREATE);

    const {
      tenantId,
      brandId,
      webSurfaceId,
      briefId,
      authorId,
      categoryId,
      type = 'ARTICLE',
      title,
      slug,
      excerpt,
      contentMarkdown,
      contentBlocks,
      seoTitle,
      seoDescription,
      canonicalUrl,
      ogImageUrl,
      featuredImageUrl,
      featuredImageAlt,
      origin = ContentOrigin.HUMAN,
      userId,
      changeSummary = 'Initial draft creation',
      scheduledAt,
      aiAudit,
    } = input;

    AuthorizationService.assertBrandAccess(context, brandId);

    return await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // Check slug collision within the same tenant and brand
      const existing = await tx.contentItem.findFirst({
        where: {
          tenantId,
          brandId,
          slug,
        },
      });

      if (existing) {
        throw new AppError({
          code: ErrorCode.CONFLICT,
          message: `A content item with slug '${slug}' already exists for this brand.`,
          statusCode: 409,
        });
      }

      // 1. Create content item shell
      const item = await tx.contentItem.create({
        data: {
          tenantId,
          brandId,
          webSurfaceId: webSurfaceId ?? null,
          briefId: briefId ?? null,
          authorId: authorId ?? null,
          categoryId: categoryId ?? null,
          type,
          status: ContentStatus.DRAFT,
          title,
          slug,
          excerpt: excerpt ?? null,
          featuredImageUrl: featuredImageUrl ?? null,
          featuredImageAlt: featuredImageAlt ?? null,
          currentVersionNumber: 1,
          scheduledAt: scheduledAt ?? null,
        },
      });

      // 2. Create immutable initial version (v1)
      await tx.contentVersion.create({
        data: {
          tenantId,
          contentItemId: item.id,
          version: 1,
          title,
          slug,
          excerpt: excerpt ?? null,
          content: {
            markdown: contentMarkdown ?? '',
            blocks: contentBlocks ?? [],
          } as any,
          seoTitle: seoTitle ?? title,
          seoDescription: seoDescription ?? excerpt ?? null,
          canonicalUrl: canonicalUrl ?? null,
          ogImageUrl: ogImageUrl ?? featuredImageUrl ?? null,
          status: ContentStatus.DRAFT,
          origin,
          aiAudit: aiAudit ? (aiAudit as any) : undefined,
          changeSummary,
          createdBy: userId,
        },
      });

      const fullItem = await tx.contentItem.findUnique({
        where: { id: item.id },
        include: {
          author: true,
          category: true,
          brief: true,
          versions: { where: { version: 1 } },
        },
      });

      logger.info(
        { tenantId, contentId: item.id, slug, versionNumber: 1 },
        'Created new content item and initial version'
      );

      return this.mapContentItem(fullItem);
    });
  }

  /**
   * Updates a content item by creating a new immutable version.
   * If the slug is changed, an automatic 301 Redirect is created.
   */
  public static async updateContentItem(
    tenantId: string,
    id: string,
    input: UpdateContentItemInput,
    context: AuthorizedContext
  ): Promise<ContentItemRecord> {
    AuthorizationService.assertCan(context, Action.CONTENT_EDIT);

    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }

    return await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const existing = await tx.contentItem.findFirst({
        where: { id, tenantId },
        include: {
          versions: {
            orderBy: { version: 'desc' },
            take: 1,
          },
        },
      });

      if (!existing) {
        throw createContentNotFoundError(id);
      }

      AuthorizationService.assertBrandAccess(context, existing.brandId);

      const latestVersion = existing.versions[0];

      // Optimistic concurrency check
      if (
        input.expectedVersionNumber !== undefined &&
        latestVersion &&
        latestVersion.version !== input.expectedVersionNumber
      ) {
        throw createVersionConflictError(
          `Conflict: Item is on version ${latestVersion.version}, but update expected version ${input.expectedVersionNumber}.`
        );
      }

      const nextVersionNumber = (latestVersion?.version ?? existing.currentVersionNumber ?? 0) + 1;
      const newTitle = input.title ?? existing.title;
      const newSlug = input.slug ?? existing.slug;
      const newExcerpt = input.excerpt !== undefined ? input.excerpt : existing.excerpt;

      // Handle Slug change & automatic 301 Redirect
      if (input.slug && input.slug !== existing.slug) {
        const slugClash = await tx.contentItem.findFirst({
          where: {
            tenantId,
            brandId: existing.brandId,
            slug: input.slug,
            id: { not: existing.id },
          },
        });
        if (slugClash) {
          throw new AppError({
            code: ErrorCode.CONFLICT,
            message: `Slug '${input.slug}' is already in use by another article.`,
            statusCode: 409,
          });
        }

        const oldPath = `/blog/${existing.slug}`;
        const newPath = `/blog/${input.slug}`;

        const existingRedirect = await tx.redirect.findFirst({
          where: {
            tenantId,
            fromPath: oldPath,
          },
        });

        if (existingRedirect) {
          if (existingRedirect.toPath === oldPath) {
            throw createRedirectConflictError(oldPath);
          }
          await tx.redirect.update({
            where: { id: existingRedirect.id },
            data: {
              toPath: newPath,
              statusCode: 301,
              reason: 'SLUG_CHANGE',
              isActive: true,
            },
          });
        } else {
          await tx.redirect.create({
            data: {
              tenantId,
              webSurfaceId: existing.webSurfaceId,
              fromPath: oldPath,
              toPath: newPath,
              statusCode: 301,
              reason: 'SLUG_CHANGE',
              isActive: true,
            },
          });
        }
        logger.info(
          { tenantId, oldPath, newPath },
          'Created automatic 301 redirect for modified content slug'
        );
      }

      const existingContent = (latestVersion?.content as any) || {};
      const effectiveContentMarkdown =
        input.contentMarkdown !== undefined
          ? input.contentMarkdown
          : existingContent.markdown;

      const effectiveBlocks =
        input.contentBlocks !== undefined
          ? input.contentBlocks
          : existingContent.blocks;

      // Create new immutable version
      await tx.contentVersion.create({
        data: {
          tenantId,
          contentItemId: existing.id,
          version: nextVersionNumber,
          title: newTitle,
          slug: newSlug,
          excerpt: newExcerpt ?? null,
          content: {
            markdown: effectiveContentMarkdown ?? '',
            blocks: effectiveBlocks ?? [],
          } as any,
          seoTitle: input.seoTitle ?? latestVersion?.seoTitle ?? newTitle,
          seoDescription: input.seoDescription ?? latestVersion?.seoDescription ?? newExcerpt ?? null,
          canonicalUrl: input.canonicalUrl ?? latestVersion?.canonicalUrl ?? null,
          ogImageUrl: input.ogImageUrl ?? latestVersion?.ogImageUrl ?? null,
          status: existing.status,
          origin: input.origin ?? latestVersion?.origin ?? ContentOrigin.HUMAN,
          aiAudit: input.aiAudit ? (input.aiAudit as any) : undefined,
          changeSummary: input.changeSummary ?? `Updated version ${nextVersionNumber}`,
          createdBy: input.userId,
        },
      });

      // Update content item shell pointing to currentVersionNumber
      const updated = await tx.contentItem.update({
        where: { id: existing.id },
        data: {
          title: newTitle,
          slug: newSlug,
          excerpt: newExcerpt ?? null,
          currentVersionNumber: nextVersionNumber,
          featuredImageUrl: input.featuredImageUrl !== undefined ? input.featuredImageUrl : existing.featuredImageUrl,
          featuredImageAlt: input.featuredImageAlt !== undefined ? input.featuredImageAlt : existing.featuredImageAlt,
          authorId: input.authorId !== undefined ? input.authorId : existing.authorId,
          categoryId: input.categoryId !== undefined ? input.categoryId : existing.categoryId,
          webSurfaceId: input.webSurfaceId !== undefined ? input.webSurfaceId : existing.webSurfaceId,
          briefId: input.briefId !== undefined ? input.briefId : existing.briefId,
          type: input.type !== undefined ? input.type : existing.type,
          scheduledAt: input.scheduledAt !== undefined ? input.scheduledAt : existing.scheduledAt,
        },
        include: {
          author: true,
          category: true,
          brief: true,
          versions: {
            orderBy: { version: 'desc' },
            take: 5,
          },
        },
      });

      logger.info(
        { tenantId, contentId: existing.id, versionNumber: nextVersionNumber },
        'Saved new immutable content version'
      );

      return this.mapContentItem(updated);
    });
  }

  /**
   * Editorial Workflow State Transitions
   * Guarded by specific role permissions to enforce human approval.
   */
  public static async transitionWorkflow(
    input: WorkflowTransitionInput,
    context: AuthorizedContext
  ): Promise<ContentItemRecord> {
    const { tenantId, contentId, newStatus, userId, rejectionReason } = input;

    return await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const item = await tx.contentItem.findFirst({
        where: { id: contentId, tenantId },
        include: {
          versions: {
            orderBy: { version: 'desc' },
            take: 1,
          },
        },
      });

      if (!item) {
        throw createContentNotFoundError(contentId);
      }

      AuthorizationService.assertBrandAccess(context, item.brandId);

      const currentStatus = item.status;
      const latestVersion = item.versions[0];

      // Validate transitions and enforce permissions
      switch (newStatus) {
        case ContentStatus.IN_REVIEW:
          AuthorizationService.assertCan(context, Action.CONTENT_EDIT);
          if (currentStatus !== ContentStatus.DRAFT && currentStatus !== ContentStatus.REJECTED) {
            throw createContentWorkflowError(
              `Cannot submit for review from status '${currentStatus}'. Must be DRAFT or REJECTED.`
            );
          }
          break;

        case ContentStatus.APPROVED:
          AuthorizationService.assertCan(context, Action.CONTENT_REVIEW);
          if (currentStatus !== ContentStatus.IN_REVIEW) {
            throw createContentWorkflowError(
              `Cannot approve content from status '${currentStatus}'. Must be IN_REVIEW.`
            );
          }
          break;

        case ContentStatus.REJECTED:
          AuthorizationService.assertCan(context, Action.CONTENT_REVIEW);
          if (currentStatus !== ContentStatus.IN_REVIEW) {
            throw createContentWorkflowError(
              `Cannot reject content from status '${currentStatus}'. Must be IN_REVIEW.`
            );
          }
          break;

        case ContentStatus.PUBLISHED:
          AuthorizationService.assertCan(context, Action.CONTENT_PUBLISH);
          if (currentStatus !== ContentStatus.APPROVED && currentStatus !== ContentStatus.ARCHIVED) {
            throw createContentWorkflowError(
              `Cannot publish content from status '${currentStatus}'. Must be APPROVED or un-archived.`
            );
          }
          if (!latestVersion) {
            throw createContentWorkflowError('Cannot publish content item without an active version.');
          }
          break;

        case ContentStatus.ARCHIVED:
          AuthorizationService.assertCan(context, Action.CONTENT_ARCHIVE);
          break;

        case ContentStatus.DRAFT:
          AuthorizationService.assertCan(context, Action.CONTENT_EDIT);
          break;

        default:
          throw createContentWorkflowError(`Unsupported target status '${newStatus}'.`);
      }

      const updateData: any = {
        status: newStatus,
      };

      if (newStatus === ContentStatus.PUBLISHED) {
        updateData.publishedAt = item.publishedAt ?? new Date();
        updateData.publishedVersionId = latestVersion?.id;

        // Also mark latest version as published
        if (latestVersion) {
          await tx.contentVersion.update({
            where: { id: latestVersion.id },
            data: {
              status: ContentStatus.PUBLISHED,
              publishedAt: new Date(),
            },
          });
        }
      }

      const updated = await tx.contentItem.update({
        where: { id: contentId },
        data: updateData,
        include: {
          author: true,
          category: true,
          brief: true,
          versions: {
            orderBy: { version: 'desc' },
            take: 5,
          },
        },
      });

      logger.info(
        { tenantId, contentId, from: currentStatus, to: newStatus, userId, rejectionReason },
        'Content workflow state transitioned successfully'
      );

      return this.mapContentItem(updated);
    });
  }

  /**
   * Rolls back a content item to an earlier version by creating a new version
   * with the historical content.
   */
  public static async rollbackToVersion(
    tenantId: string,
    contentId: string,
    targetVersionId: string,
    userId: string,
    context: AuthorizedContext
  ): Promise<ContentItemRecord> {
    AuthorizationService.assertCan(context, Action.CONTENT_EDIT);

    return await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const [item, targetVersion] = await Promise.all([
        tx.contentItem.findFirst({
          where: { id: contentId, tenantId },
          include: {
            versions: {
              orderBy: { version: 'desc' },
              take: 1,
            },
          },
        }),
        tx.contentVersion.findFirst({
          where: { id: targetVersionId, contentItemId: contentId, tenantId },
        }),
      ]);

      if (!item) throw createContentNotFoundError(contentId);
      if (!targetVersion) throw createContentVersionNotFoundError(targetVersionId);

      AuthorizationService.assertBrandAccess(context, item.brandId);

      const latestVersion = item.versions[0];
      const nextVersionNumber = (latestVersion?.version ?? item.currentVersionNumber ?? 0) + 1;

      // Create new version restoring historical snapshot
      await tx.contentVersion.create({
        data: {
          tenantId,
          contentItemId: item.id,
          version: nextVersionNumber,
          title: targetVersion.title,
          slug: targetVersion.slug,
          excerpt: targetVersion.excerpt,
          content: targetVersion.content as any,
          seoTitle: targetVersion.seoTitle,
          seoDescription: targetVersion.seoDescription,
          canonicalUrl: targetVersion.canonicalUrl,
          ogImageUrl: targetVersion.ogImageUrl,
          status: item.status,
          origin: targetVersion.origin,
          changeSummary: `Rollback to version ${targetVersion.version}`,
          createdBy: userId,
        },
      });

      const updated = await tx.contentItem.update({
        where: { id: contentId },
        data: {
          title: targetVersion.title,
          slug: targetVersion.slug,
          excerpt: targetVersion.excerpt,
          currentVersionNumber: nextVersionNumber,
        },
        include: {
          author: true,
          category: true,
          brief: true,
          versions: {
            orderBy: { version: 'desc' },
            take: 5,
          },
        },
      });

      logger.info(
        { tenantId, contentId, restoredVersionNumber: targetVersion.version, newVersionNumber: nextVersionNumber },
        'Restored historical content version via rollback'
      );

      return this.mapContentItem(updated);
    });
  }

  /**
   * Lists all versions of a content item.
   */
  public static async listVersions(
    tenantId: string,
    contentId: string,
    context: AuthorizedContext
  ): Promise<ContentVersionRecord[]> {
    AuthorizationService.assertCan(context, Action.CONTENT_VIEW);

    return await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const item = await tx.contentItem.findFirst({
        where: { id: contentId, tenantId },
      });
      if (!item) throw createContentNotFoundError(contentId);

      AuthorizationService.assertBrandAccess(context, item.brandId);

      const versions = await tx.contentVersion.findMany({
        where: { contentItemId: contentId, tenantId },
        orderBy: { version: 'desc' },
      });

      return versions.map((v: any) => this.mapContentVersion(v));
    });
  }

  /**
   * Author Management
   */
  public static async listAuthors(
    tenantId: string,
    brandId: string,
    context?: AuthorizedContext
  ): Promise<ContentAuthorRecord[]> {
    if (context) {
      AuthorizationService.assertCan(context, Action.CONTENT_VIEW);
      AuthorizationService.assertBrandAccess(context, brandId);
    }

    return await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const authors = await tx.contentAuthor.findMany({
        where: { tenantId, brandId },
        orderBy: { name: 'asc' },
      });

      return authors.map((a: any) => this.mapAuthor(a));
    });
  }

  public static async createAuthor(
    input: {
      tenantId: string;
      brandId: string;
      name: string;
      slug: string;
      role?: string | null;
      bio?: string | null;
      avatarUrl?: string | null;
      socialLinks?: Record<string, string> | null;
    },
    context: AuthorizedContext
  ): Promise<ContentAuthorRecord> {
    AuthorizationService.assertCan(context, Action.CONTENT_CREATE);
    AuthorizationService.assertBrandAccess(context, input.brandId);

    return await TenantContextService.withTenantContext(prisma, input.tenantId, async (tx) => {
      const author = await tx.contentAuthor.create({
        data: {
          tenantId: input.tenantId,
          brandId: input.brandId,
          name: input.name,
          slug: input.slug,
          role: input.role ?? null,
          bio: input.bio ?? null,
          avatarUrl: input.avatarUrl ?? null,
          socialLinks: input.socialLinks ? (input.socialLinks as any) : undefined,
        },
      });

      return this.mapAuthor(author);
    });
  }

  /**
   * Category Management
   */
  public static async listCategories(
    tenantId: string,
    brandId: string,
    context?: AuthorizedContext
  ): Promise<ContentCategoryRecord[]> {
    if (context) {
      AuthorizationService.assertCan(context, Action.CONTENT_VIEW);
      AuthorizationService.assertBrandAccess(context, brandId);
    }

    return await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const categories = await tx.contentCategory.findMany({
        where: { tenantId, brandId },
        orderBy: { name: 'asc' },
      });

      return categories.map((c: any) => this.mapCategory(c));
    });
  }

  public static async createCategory(
    input: {
      tenantId: string;
      brandId: string;
      name: string;
      slug: string;
      description?: string | null;
    },
    context: AuthorizedContext
  ): Promise<ContentCategoryRecord> {
    AuthorizationService.assertCan(context, Action.CONTENT_CREATE);
    AuthorizationService.assertBrandAccess(context, input.brandId);

    return await TenantContextService.withTenantContext(prisma, input.tenantId, async (tx) => {
      const category = await tx.contentCategory.create({
        data: {
          tenantId: input.tenantId,
          brandId: input.brandId,
          name: input.name,
          slug: input.slug,
          description: input.description ?? null,
        },
      });

      return this.mapCategory(category);
    });
  }

  // DTO Mappers
  private static mapContentItem(item: any): ContentItemRecord {
    const rawVersions = item.versions || [];
    const currentVer = rawVersions.find((v: any) => v.version === item.currentVersionNumber) || rawVersions[0];
    const pubVer = rawVersions.find((v: any) => v.id === item.publishedVersionId);

    return {
      id: item.id,
      tenantId: item.tenantId,
      brandId: item.brandId,
      webSurfaceId: item.webSurfaceId,
      briefId: item.briefId,
      authorId: item.authorId,
      categoryId: item.categoryId,
      type: item.type,
      title: item.title,
      slug: item.slug,
      excerpt: item.excerpt,
      status: item.status,
      featuredImageUrl: item.featuredImageUrl,
      featuredImageAlt: item.featuredImageAlt,
      currentVersionNumber: item.currentVersionNumber,
      publishedVersionId: item.publishedVersionId,
      publishedAt: item.publishedAt,
      scheduledAt: item.scheduledAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      currentVersion: currentVer ? this.mapContentVersion(currentVer) : undefined,
      publishedVersion: pubVer ? this.mapContentVersion(pubVer) : undefined,
      author: item.author ? this.mapAuthor(item.author) : undefined,
      category: item.category ? this.mapCategory(item.category) : undefined,
      versions: rawVersions.map((v: any) => this.mapContentVersion(v)),
      relations: item.relations ? item.relations.map((r: any) => ({
        id: r.id,
        tenantId: r.tenantId,
        contentItemId: r.contentItemId,
        targetType: r.targetType,
        targetId: r.targetId,
        sortOrder: r.sortOrder,
        notes: r.notes,
        createdAt: r.createdAt,
      })) : undefined,
    };
  }

  private static mapContentVersion(version: any): ContentVersionRecord {
    return {
      id: version.id,
      tenantId: version.tenantId,
      contentItemId: version.contentItemId,
      version: version.version,
      title: version.title,
      slug: version.slug,
      excerpt: version.excerpt,
      content: (version.content as any) || {},
      seoTitle: version.seoTitle,
      seoDescription: version.seoDescription,
      canonicalUrl: version.canonicalUrl,
      ogImageUrl: version.ogImageUrl,
      status: version.status,
      origin: version.origin,
      aiAudit: version.aiAudit,
      changeSummary: version.changeSummary,
      createdBy: version.createdBy,
      publishedAt: version.publishedAt,
      createdAt: version.createdAt,
    };
  }

  private static mapAuthor(author: any): ContentAuthorRecord {
    return {
      id: author.id,
      tenantId: author.tenantId,
      brandId: author.brandId,
      name: author.name,
      slug: author.slug,
      bio: author.bio,
      role: author.role,
      avatarUrl: author.avatarUrl,
      socialLinks: author.socialLinks,
      createdAt: author.createdAt,
      updatedAt: author.updatedAt,
    };
  }

  private static mapCategory(category: any): ContentCategoryRecord {
    return {
      id: category.id,
      tenantId: category.tenantId,
      brandId: category.brandId,
      name: category.name,
      slug: category.slug,
      description: category.description,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }
}
