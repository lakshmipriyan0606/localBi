/**
 * Phase 11: Internal Linking Engine
 * Automates factual entity mention detection, internal link suggestions,
 * broken link validation, and orphan article detection across the multi-tenant CMS.
 */

import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import {
  AuthorizedContext,
  AuthorizationService,
  Action,
} from '@/shared/authorization/policy';
import {
  DetectedMention,
  InternalLinkSuggestion,
  BrokenLinkReportItem,
  OrphanContentReportItem,
  ContentRelationRecord,
  ContentRelationTargetType,
  ContentRelationTargetTypeValue,
  ContentStatus,
} from './content-types';

export class InternalLinkService {
  /**
   * Scans markdown/text and detects mentions of verified products, store locations,
   * content categories, and published articles within the tenant.
   */
  public static async detectEntityMentions(
    tenantId: string,
    brandId: string | undefined,
    contentMarkdown: string
  ): Promise<DetectedMention[]> {
    if (!contentMarkdown || !contentMarkdown.trim()) {
      return [];
    }

    return await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // Load factual entities for this tenant/brand
      const [products, locations, categories, articles] = await Promise.all([
        tx.product.findMany({
          where: { tenantId, ...(brandId ? { brandId } : {}), status: 'ACTIVE' },
          select: { id: true, name: true, slug: true },
          take: 100,
        }),
        tx.location.findMany({
          where: { tenantId, ...(brandId ? { brandId } : {}), isClosed: false },
          select: { id: true, name: true, storeCode: true, city: true },
          take: 100,
        }),
        tx.category.findMany({
          where: { tenantId, ...(brandId ? { brandId } : {}) },
          select: { id: true, name: true, slug: true },
          take: 50,
        }),
        tx.contentItem.findMany({
          where: {
            tenantId,
            ...(brandId ? { brandId } : {}),
            status: ContentStatus.PUBLISHED,
          },
          select: { id: true, title: true, slug: true },
          take: 100,
        }),
      ]);

      const mentions: DetectedMention[] = [];
      const lowerText = contentMarkdown.toLowerCase();

      // 1. Detect Products (minimum 3 chars to avoid false positives)
      for (const p of products) {
        if (p.name && p.name.length >= 3) {
          const idx = lowerText.indexOf(p.name.toLowerCase());
          if (idx !== -1) {
            mentions.push({
              entityType: 'PRODUCT',
              entityId: p.id,
              entityName: p.name,
              matchedText: contentMarkdown.substring(idx, idx + p.name.length),
              targetUrl: `/products/${p.slug}`,
              occurrenceIndex: idx,
            });
          }
        }
      }

      // 2. Detect Locations
      for (const loc of locations) {
        if (loc.name && loc.name.length >= 4) {
          const idx = lowerText.indexOf(loc.name.toLowerCase());
          if (idx !== -1) {
            mentions.push({
              entityType: 'STORE',
              entityId: loc.id,
              entityName: loc.name,
              matchedText: contentMarkdown.substring(idx, idx + loc.name.length),
              targetUrl: `/stores/${loc.storeCode || loc.id}`,
              occurrenceIndex: idx,
            });
          }
        }
      }

      // 3. Detect Categories
      for (const cat of categories) {
        if (cat.name && cat.name.length >= 4) {
          const idx = lowerText.indexOf(cat.name.toLowerCase());
          if (idx !== -1) {
            mentions.push({
              entityType: 'CATEGORY',
              entityId: cat.id,
              entityName: cat.name,
              matchedText: contentMarkdown.substring(idx, idx + cat.name.length),
              targetUrl: `/category/${cat.slug}`,
              occurrenceIndex: idx,
            });
          }
        }
      }

      // 4. Detect Published Articles (cross-linking)
      for (const art of articles) {
        if (art.title && art.title.length >= 5) {
          const idx = lowerText.indexOf(art.title.toLowerCase());
          if (idx !== -1) {
            mentions.push({
              entityType: 'ARTICLE',
              entityId: art.id,
              entityName: art.title,
              matchedText: contentMarkdown.substring(idx, idx + art.title.length),
              targetUrl: `/blog/${art.slug}`,
              occurrenceIndex: idx,
            });
          }
        }
      }

      return mentions.sort((a, b) => a.occurrenceIndex - b.occurrenceIndex);
    });
  }

  /**
   * Generates actionable internal link suggestions for a content item.
   */
  public static async generateLinkSuggestions(
    tenantId: string,
    contentItemId: string,
    context: AuthorizedContext
  ): Promise<InternalLinkSuggestion[]> {
    AuthorizationService.assertCan(context, Action.CONTENT_VIEW);

    return await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const item = await tx.contentItem.findFirst({
        where: { id: contentItemId, tenantId },
        include: {
          versions: {
            orderBy: { version: 'desc' },
            take: 1,
          },
        },
      });

      const latestVersion = item?.versions[0];
      const markdown = (latestVersion?.content as any)?.markdown || '';

      if (!item || !markdown) {
        return [];
      }

      const mentions = await this.detectEntityMentions(tenantId, item.brandId, markdown);

      // Filter out self-mentions
      const filtered = mentions.filter((m) => m.entityId !== contentItemId);

      return filtered.map((m) => {
        const start = Math.max(0, m.occurrenceIndex - 40);
        const end = Math.min(markdown.length, m.occurrenceIndex + m.matchedText.length + 40);
        const snippet = markdown.substring(start, end).replace(/\n/g, ' ');

        return {
          sourceContentId: item.id,
          sourceTitle: item.title,
          targetUrl: m.targetUrl,
          anchorText: m.matchedText,
          targetEntityType: m.entityType,
          targetEntityId: m.entityId,
          contextSnippet: `...${snippet}...`,
          relevanceScore: m.entityType === 'ARTICLE' ? 0.95 : 0.85,
        };
      });
    });
  }

  /**
   * Scans content items for broken internal links and redirect loops.
   */
  public static async auditBrokenLinks(
    tenantId: string,
    context: AuthorizedContext
  ): Promise<BrokenLinkReportItem[]> {
    AuthorizationService.assertCan(context, Action.CONTENT_VIEW);

    return await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const publishedItems = await tx.contentItem.findMany({
        where: { tenantId, status: ContentStatus.PUBLISHED },
        include: {
          versions: {
            orderBy: { version: 'desc' },
            take: 1,
          },
        },
      });

      const redirects = await tx.redirect.findMany({
        where: { tenantId, isActive: true },
      });

      const allSlugs = new Set(publishedItems.map((p: any) => p.slug));
      const redirectMap = new Map<string, string>();
      for (const r of redirects) {
        redirectMap.set(r.fromPath, r.toPath);
      }

      const brokenItems: BrokenLinkReportItem[] = [];

      // Link regex: [anchor](url)
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

      for (const item of publishedItems) {
        const latestVersion = item.versions[0];
        const markdown = (latestVersion?.content as any)?.markdown || '';
        let match: RegExpExecArray | null;
        while ((match = linkRegex.exec(markdown)) !== null) {
          const url = match[2];
          if (!url) continue;

          // We only audit relative or internal links
          if (url.startsWith('/blog/')) {
            const slug = url.replace('/blog/', '').split(/[?#]/)[0];

            if (slug && !allSlugs.has(slug)) {
              // Check if redirect exists
              if (redirectMap.has(url)) {
                const target = redirectMap.get(url)!;
                // Check circular
                if (redirectMap.get(target) === url) {
                  brokenItems.push({
                    contentItemId: item.id,
                    contentTitle: item.title,
                    contentSlug: item.slug,
                    brokenUrl: url,
                    reason: 'CIRCULAR_REDIRECT',
                  });
                  continue;
                }
              } else {
                brokenItems.push({
                  contentItemId: item.id,
                  contentTitle: item.title,
                  contentSlug: item.slug,
                  brokenUrl: url,
                  reason: 'NOT_FOUND',
                });
              }
            }
          }
        }
      }

      return brokenItems;
    });
  }

  /**
   * Finds published articles that have zero inbound internal links or relations.
   */
  public static async findOrphanContent(
    tenantId: string,
    context: AuthorizedContext
  ): Promise<OrphanContentReportItem[]> {
    AuthorizationService.assertCan(context, Action.CONTENT_VIEW);

    return await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const items = await tx.contentItem.findMany({
        where: { tenantId, status: ContentStatus.PUBLISHED },
        include: {
          versions: {
            orderBy: { version: 'desc' },
            take: 1,
          },
          relations: true,
        },
      });

      // Count relations pointing to this content item
      const relationInbound = await tx.contentRelation.groupBy({
        by: ['targetId'],
        where: {
          tenantId,
          targetType: 'CONTENT',
        },
        _count: {
          id: true,
        },
      });

      const inboundMap = new Map<string, number>();
      for (const rel of relationInbound) {
        inboundMap.set(rel.targetId, rel._count.id);
      }

      // Also scan published markdown content to count organic inbound markdown links
      const slugCounts = new Map<string, number>();
      for (const item of items) {
        const latestVersion = item.versions[0];
        const text = (latestVersion?.content as any)?.markdown || '';
        const linkRegex = /\/blog\/([a-zA-Z0-9_-]+)/g;
        let match: RegExpExecArray | null;
        while ((match = linkRegex.exec(text)) !== null) {
          const targetSlug = match[1];
          if (targetSlug) {
            slugCounts.set(targetSlug, (slugCounts.get(targetSlug) || 0) + 1);
          }
        }
      }

      const orphans: OrphanContentReportItem[] = [];

      for (const item of items) {
        const relationCount = inboundMap.get(item.id) || 0;
        const markdownInbound = slugCounts.get(item.slug) || 0;
        const totalInbound = relationCount + markdownInbound;

        if (totalInbound === 0) {
          orphans.push({
            contentItemId: item.id,
            title: item.title,
            slug: item.slug,
            publishedAt: item.publishedAt,
            inboundLinkCount: 0,
          });
        }
      }

      return orphans;
    });
  }

  /**
   * Persists an internal relation record between a content item and another entity.
   */
  public static async createContentRelation(
    tenantId: string,
    input: {
      contentItemId: string;
      targetType: ContentRelationTargetTypeValue;
      targetId: string;
      sortOrder?: number;
      notes?: string | null;
    },
    context: AuthorizedContext
  ): Promise<ContentRelationRecord> {
    AuthorizationService.assertCan(context, Action.CONTENT_EDIT);

    return await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const relation = await tx.contentRelation.create({
        data: {
          tenantId,
          contentItemId: input.contentItemId,
          targetType: input.targetType || ContentRelationTargetType.CONTENT,
          targetId: input.targetId,
          sortOrder: input.sortOrder ?? 0,
          notes: input.notes ?? null,
        },
      });

      return {
        id: relation.id,
        tenantId: relation.tenantId,
        contentItemId: relation.contentItemId,
        targetType: relation.targetType as ContentRelationTargetTypeValue,
        targetId: relation.targetId,
        sortOrder: relation.sortOrder,
        notes: relation.notes,
        createdAt: relation.createdAt,
      };
    });
  }
}
