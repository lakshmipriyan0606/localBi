import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'node:crypto';
import { prisma } from '../src/shared/database/client';
import { TenantContextService } from '../src/shared/database/tenant-context';
import { Role, AuthorizedContext, ScopeMode } from '../src/shared/authorization/policy';
import { normalizeEmail } from '../src/modules/auth/email-normalizer';
import {
  ContentService,
} from '../src/modules/content/content-service';
import {
  ContentBriefService,
} from '../src/modules/content/content-brief-service';
import {
  InternalLinkService,
} from '../src/modules/content/internal-link-service';
import {
  AiContentService,
  PROMPT_VERSION_CONTENT_DRAFT_V1,
} from '../src/modules/content/ai-content-service';
import {
  ContentStatus,
  ContentOrigin,
  ContentRelationTargetType,
} from '../src/modules/content/content-types';

describe('Phase 11: Content & Growth Engine Tests', () => {
  let tenantAId: string;
  let tenantBId: string;
  let brandAId: string;
  let brandBId: string;
  let storeA1Id: string;
  let productA1Id: string;
  let opportunityAId: string;
  let userAId: string;
  let userBId: string;
  let contextA: AuthorizedContext;
  let contextB: AuthorizedContext;

  const idSuffix = crypto.randomBytes(4).toString('hex');

  beforeAll(async () => {
    // 1. Create Users
    const userA = await prisma.user.create({
      data: {
        email: normalizeEmail(`owner-content-a-${idSuffix}@example.com`),
        fullName: 'Tenant A Content Owner',
        status: 'ACTIVE',
      },
    });
    userAId = userA.id;

    const userB = await prisma.user.create({
      data: {
        email: normalizeEmail(`owner-content-b-${idSuffix}@example.com`),
        fullName: 'Tenant B Content Owner',
        status: 'ACTIVE',
      },
    });
    userBId = userB.id;

    // 2. Create Tenants
    const tenantA = await prisma.tenant.create({
      data: {
        name: `Tenant A Content ${idSuffix}`,
        slug: `tenant-content-a-${idSuffix}`,
        status: 'ACTIVE',
      },
    });
    tenantAId = tenantA.id;

    const tenantB = await prisma.tenant.create({
      data: {
        name: `Tenant B Content ${idSuffix}`,
        slug: `tenant-content-b-${idSuffix}`,
        status: 'ACTIVE',
      },
    });
    tenantBId = tenantB.id;

    // 3. Create Brands and Data under TenantContext
    await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
      const brandA = await tx.brand.create({
        data: {
          tenantId: tenantAId,
          name: `Royal Attar Brand ${idSuffix}`,
          slug: `royal-attar-${idSuffix}`,
        },
      });
      brandAId = brandA.id;

      const locA = await tx.location.create({
        data: {
          tenantId: tenantAId,
          brandId: brandAId,
          name: 'Express Avenue Boutique',
          storeCode: `EA-${idSuffix}`,
          city: 'Chennai',
          state: 'Tamil Nadu',
          postalCode: '600002',
          country: 'IN',
          addressLine1: 'Ground Floor, EA Mall, Whites Road',
        },
      });
      storeA1Id = locA.id;

      const catA = await tx.category.create({
        data: {
          tenantId: tenantAId,
          brandId: brandAId,
          name: 'Oud Oils',
          slug: `oud-oils-${idSuffix}`,
        },
      });

      const prodA = await tx.product.create({
        data: {
          tenantId: tenantAId,
          brandId: brandAId,
          name: 'Royal Cambodian Oud',
          slug: `royal-cambodian-oud-${idSuffix}`,
          sku: `OUD-ROYAL-${idSuffix}`,
          categoryId: catA.id,
          basePrice: 4500,
          currency: 'INR',
          status: 'ACTIVE',
          description: 'Aged pure wild Cambodian oud with honeyed woody notes.',
        },
      });
      productA1Id = prodA.id;

      const oppA = await tx.opportunity.create({
        data: {
          tenantId: tenantAId,
          brandId: brandAId,
          identityHash: crypto.createHash('sha256').update(`opp-${idSuffix}`).digest('hex'),
          ruleId: 'RULE_SEARCH_DEMAND_GROWTH_V1',
          type: 'SEARCH_DEMAND_GROWTH',
          status: 'OPEN',
          priority: 'HIGH',
          priorityScore: 85,
          confidence: 'HIGH',
          actionType: 'CREATE_PAGE',
          title: 'Create In-depth Guide for Pure Cambodian Oud',
          summary: 'Growing customer search queries for pure wild oud oil in Chennai.',
          evidence: {
            create: {
              source: 'GSC',
              metric: 'impressions',
              value: 1200,
              entityType: 'KEYWORD',
              entityLabel: 'pure wild cambodian oud oil',
              details: {
                keywordText: 'pure wild cambodian oud oil',
                searchVolume: 1200,
                intent: 'COMMERCIAL',
                secondaryKeywords: ['authentic agarwood oil', 'best oud in chennai'],
              },
            },
          },
        },
      });
      opportunityAId = oppA.id;
    });

    await TenantContextService.withTenantContext(prisma, tenantBId, async (tx) => {
      const brandB = await tx.brand.create({
        data: {
          tenantId: tenantBId,
          name: `Other Brand ${idSuffix}`,
          slug: `other-brand-${idSuffix}`,
        },
      });
      brandBId = brandB.id;
    });

    // 4. Authorized Contexts
    contextA = {
      userId: userAId,
      tenantId: tenantAId,
      role: Role.CLIENT_OWNER,
      scopeMode: ScopeMode.ALL,
      grantedBrandIds: new Set([brandAId]),
      grantedLocationIds: new Set([storeA1Id]),
    };

    contextB = {
      userId: userBId,
      tenantId: tenantBId,
      role: Role.CLIENT_OWNER,
      scopeMode: ScopeMode.ALL,
      grantedBrandIds: new Set([brandBId]),
      grantedLocationIds: new Set(),
    };
  });

  afterAll(async () => {
    // Cleanup Tenant A
    await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
      await tx.contentRelation.deleteMany({ where: { tenantId: tenantAId } });
      await tx.contentVersion.deleteMany({ where: { tenantId: tenantAId } });
      await tx.contentItem.deleteMany({ where: { tenantId: tenantAId } });
      await tx.contentBrief.deleteMany({ where: { tenantId: tenantAId } });
      await tx.contentAuthor.deleteMany({ where: { tenantId: tenantAId } });
      await tx.contentCategory.deleteMany({ where: { tenantId: tenantAId } });
      await tx.redirect.deleteMany({ where: { tenantId: tenantAId } });
      await tx.opportunityEvidence.deleteMany({ where: { tenantId: tenantAId } });
      await tx.opportunity.deleteMany({ where: { tenantId: tenantAId } });
      await tx.product.deleteMany({ where: { tenantId: tenantAId } });
      await tx.category.deleteMany({ where: { tenantId: tenantAId } });
      await tx.location.deleteMany({ where: { tenantId: tenantAId } });
      await tx.brand.deleteMany({ where: { tenantId: tenantAId } });
    });

    // Cleanup Tenant B
    await TenantContextService.withTenantContext(prisma, tenantBId, async (tx) => {
      await tx.contentRelation.deleteMany({ where: { tenantId: tenantBId } });
      await tx.contentVersion.deleteMany({ where: { tenantId: tenantBId } });
      await tx.contentItem.deleteMany({ where: { tenantId: tenantBId } });
      await tx.contentBrief.deleteMany({ where: { tenantId: tenantBId } });
      await tx.contentAuthor.deleteMany({ where: { tenantId: tenantBId } });
      await tx.contentCategory.deleteMany({ where: { tenantId: tenantBId } });
      await tx.redirect.deleteMany({ where: { tenantId: tenantBId } });
      await tx.brand.deleteMany({ where: { tenantId: tenantBId } });
    });

    // Global cleanup
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } });
  });

  describe('1. Content Author and Category Management', () => {
    it('creates an author and a content category under Tenant A', async () => {
      const author = await ContentService.createAuthor(
        {
          tenantId: tenantAId,
          brandId: brandAId,
          name: 'Master Perfumer Zayd',
          slug: `zayd-${idSuffix}`,
          role: 'Chief Perfumer & Scent Historian',
          bio: '30+ years distilling rare agarwood across South-East Asia.',
        },
        contextA
      );

      expect(author.id).toBeDefined();
      expect(author.name).toBe('Master Perfumer Zayd');

      const category = await ContentService.createCategory(
        {
          tenantId: tenantAId,
          brandId: brandAId,
          name: 'Fragrance Guides',
          slug: `guides-${idSuffix}`,
          description: 'Comprehensive tutorials on choosing and applying natural perfumery.',
        },
        contextA
      );

      expect(category.id).toBeDefined();
      expect(category.name).toBe('Fragrance Guides');

      const authorList = await ContentService.listAuthors(tenantAId, brandAId, contextA);
      expect(authorList.some((a) => a.id === author.id)).toBe(true);

      const categoryList = await ContentService.listCategories(tenantAId, brandAId, contextA);
      expect(categoryList.some((c) => c.id === category.id)).toBe(true);
    });
  });

  describe('2. Content Item Creation and Version 1 Generation', () => {
    let createdItemId: string;

    it('creates a new article with initial immutable version 1', async () => {
      const item = await ContentService.createContentItem(
        {
          tenantId: tenantAId,
          brandId: brandAId,
          title: 'The Ultimate Guide to Pure Cambodian Oud',
          slug: `guide-cambodian-oud-${idSuffix}`,
          excerpt: 'Everything you need to know before buying authentic wild oud oil.',
          contentMarkdown: '# The Ultimate Guide to Pure Cambodian Oud\n\nCambodian oud is renowned worldwide.',
          userId: userAId,
        },
        contextA
      );

      expect(item.id).toBeDefined();
      expect(item.status).toBe(ContentStatus.DRAFT);
      expect(item.currentVersionNumber).toBe(1);
      expect(item.currentVersion).toBeDefined();
      expect(item.currentVersion?.version).toBe(1);
      expect(item.currentVersion?.title).toBe('The Ultimate Guide to Pure Cambodian Oud');

      createdItemId = item.id;
    });

    it('rejects duplicate slug within the same brand', async () => {
      await expect(
        ContentService.createContentItem(
          {
            tenantId: tenantAId,
            brandId: brandAId,
            title: 'Duplicate Slug Test',
            slug: `guide-cambodian-oud-${idSuffix}`,
            userId: userAId,
          },
          contextA
        )
      ).rejects.toThrow();
    });
  });

  describe('3. Versioning, Optimistic Concurrency, and Rollback', () => {
    let testItemId: string;

    beforeAll(async () => {
      const item = await ContentService.createContentItem(
        {
          tenantId: tenantAId,
          brandId: brandAId,
          title: 'Versioning Test Article',
          slug: `versioning-test-${idSuffix}`,
          contentMarkdown: 'Original text version 1',
          userId: userAId,
        },
        contextA
      );
      testItemId = item.id;
    });

    it('creates Version 2 upon updating content', async () => {
      const updated = await ContentService.updateContentItem(
        tenantAId,
        testItemId,
        {
          contentMarkdown: 'Updated text in version 2',
          changeSummary: 'Expanded explanation of notes',
          userId: userAId,
          expectedVersionNumber: 1,
        },
        contextA
      );

      expect(updated.currentVersionNumber).toBe(2);
      expect(updated.currentVersion?.version).toBe(2);
      expect(updated.currentVersion?.changeSummary).toBe('Expanded explanation of notes');
      expect((updated.currentVersion?.content as any)?.markdown).toBe('Updated text in version 2');

      const versions = await ContentService.listVersions(tenantAId, testItemId, contextA);
      expect(versions.length).toBe(2);
      expect(versions[0]?.version).toBe(2);
      expect(versions[1]?.version).toBe(1);
    });

    it('throws VersionConflictError if expectedVersionNumber does not match current version', async () => {
      await expect(
        ContentService.updateContentItem(
          tenantAId,
          testItemId,
          {
            contentMarkdown: 'Stale update attempt',
            userId: userAId,
            expectedVersionNumber: 1, // Stale! Current is 2
          },
          contextA
        )
      ).rejects.toThrow(/Conflict/);
    });

    it('rolls back to Version 1 by generating Version 3 with historical snapshot', async () => {
      const versions = await ContentService.listVersions(tenantAId, testItemId, contextA);
      const v1 = versions.find((v) => v.version === 1)!;

      const restored = await ContentService.rollbackToVersion(
        tenantAId,
        testItemId,
        v1.id,
        userAId,
        contextA
      );

      expect(restored.currentVersionNumber).toBe(3);
      expect(restored.currentVersion?.version).toBe(3);
      expect(restored.currentVersion?.changeSummary).toContain('Rollback to version 1');
      expect((restored.currentVersion?.content as any)?.markdown).toBe('Original text version 1');
    });
  });

  describe('4. Automatic 301 Redirect on Slug Change', () => {
    let redirectItemId: string;

    beforeAll(async () => {
      const item = await ContentService.createContentItem(
        {
          tenantId: tenantAId,
          brandId: brandAId,
          title: 'Initial Slug Article',
          slug: `initial-slug-${idSuffix}`,
          contentMarkdown: 'Initial content',
          userId: userAId,
        },
        contextA
      );
      redirectItemId = item.id;
    });

    it('creates an automatic 301 redirect when the article slug changes', async () => {
      const updated = await ContentService.updateContentItem(
        tenantAId,
        redirectItemId,
        {
          slug: `renamed-seo-slug-${idSuffix}`,
          userId: userAId,
        },
        contextA
      );

      expect(updated.slug).toBe(`renamed-seo-slug-${idSuffix}`);

      // Query redirect via public resolver
      const result = await ContentService.getContentItemBySlug(
        tenantAId,
        `initial-slug-${idSuffix}`
      );

      expect(result.item).toBeNull();
      expect(result.redirect).toBeDefined();
      expect(result.redirect?.fromPath).toBe(`/blog/initial-slug-${idSuffix}`);
      expect(result.redirect?.toPath).toBe(`/blog/renamed-seo-slug-${idSuffix}`);
      expect(result.redirect?.statusCode).toBe(301);
    });
  });

  describe('5. Editorial Workflow State Machine & Governance', () => {
    let workflowItemId: string;

    beforeAll(async () => {
      const item = await ContentService.createContentItem(
        {
          tenantId: tenantAId,
          brandId: brandAId,
          title: 'Editorial Workflow Test',
          slug: `workflow-test-${idSuffix}`,
          contentMarkdown: 'Full article body ready for human review',
          userId: userAId,
        },
        contextA
      );
      workflowItemId = item.id;
    });

    it('disallows direct publishing from DRAFT status (human review gate)', async () => {
      await expect(
        ContentService.transitionWorkflow(
          {
            tenantId: tenantAId,
            contentId: workflowItemId,
            newStatus: ContentStatus.PUBLISHED,
            userId: userAId,
          },
          contextA
        )
      ).rejects.toThrow(/Cannot publish content from status 'DRAFT'/);
    });

    it('progresses through DRAFT -> IN_REVIEW -> REJECTED -> IN_REVIEW -> APPROVED -> PUBLISHED', async () => {
      // 1. Submit for review
      let item = await ContentService.transitionWorkflow(
        {
          tenantId: tenantAId,
          contentId: workflowItemId,
          newStatus: ContentStatus.IN_REVIEW,
          userId: userAId,
        },
        contextA
      );
      expect(item.status).toBe(ContentStatus.IN_REVIEW);

      // 2. Reject with reason
      item = await ContentService.transitionWorkflow(
        {
          tenantId: tenantAId,
          contentId: workflowItemId,
          newStatus: ContentStatus.REJECTED,
          userId: userAId,
          rejectionReason: 'Add more details about extraction method.',
        },
        contextA
      );
      expect(item.status).toBe(ContentStatus.REJECTED);

      // 3. Resubmit
      item = await ContentService.transitionWorkflow(
        {
          tenantId: tenantAId,
          contentId: workflowItemId,
          newStatus: ContentStatus.IN_REVIEW,
          userId: userAId,
        },
        contextA
      );
      expect(item.status).toBe(ContentStatus.IN_REVIEW);

      // 4. Approve
      item = await ContentService.transitionWorkflow(
        {
          tenantId: tenantAId,
          contentId: workflowItemId,
          newStatus: ContentStatus.APPROVED,
          userId: userAId,
        },
        contextA
      );
      expect(item.status).toBe(ContentStatus.APPROVED);

      // 5. Publish live
      item = await ContentService.transitionWorkflow(
        {
          tenantId: tenantAId,
          contentId: workflowItemId,
          newStatus: ContentStatus.PUBLISHED,
          userId: userAId,
        },
        contextA
      );
      expect(item.status).toBe(ContentStatus.PUBLISHED);
      expect(item.publishedAt).toBeDefined();
      expect(item.publishedVersionId).toBeDefined();
    });
  });

  describe('6. SEO Opportunity Bridge to Content Brief', () => {
    it('creates a content brief directly from an SEO opportunity and marks it ACCEPTED', async () => {
      const brief = await ContentBriefService.createBriefFromOpportunity(
        tenantAId,
        opportunityAId,
        userAId,
        contextA
      );

      expect(brief.id).toBeDefined();
      expect(brief.primaryKeyword).toBe('pure wild cambodian oud oil');
      expect(brief.intent).toBe('COMMERCIAL');
      expect(brief.status).toBe('DRAFT');

      // Verify opportunity status updated to ACCEPTED (must use tenant context for RLS)
      const opp = await TenantContextService.withTenantContext(prisma, tenantAId, (tx) =>
        tx.opportunity.findUnique({ where: { id: opportunityAId } })
      );
      expect(opp?.status).toBe('ACCEPTED');
    });
  });

  describe('7. Internal Linking Engine', () => {
    let linkingArticleId: string;

    beforeAll(async () => {
      const article = await ContentService.createContentItem(
        {
          tenantId: tenantAId,
          brandId: brandAId,
          title: 'Guide to Agarwood and Fragrance Notes',
          slug: `agarwood-notes-${idSuffix}`,
          contentMarkdown: `
When looking for **Royal Cambodian Oud**, customers in Chennai can visit our store in Express Avenue.
Check our Fragrance Guides for more tips.
          `.trim(),
          userId: userAId,
        },
        contextA
      );
      linkingArticleId = article.id;
    });

    it('detects entity mentions for products and stores in content', async () => {
      const mentions = await InternalLinkService.detectEntityMentions(
        tenantAId,
        brandAId,
        `We proudly feature Royal Cambodian Oud at our Express Avenue Boutique.`
      );

      expect(mentions.length).toBeGreaterThanOrEqual(2);
      const productMention = mentions.find((m) => m.entityType === 'PRODUCT');
      const storeMention = mentions.find((m) => m.entityType === 'STORE');

      expect(productMention).toBeDefined();
      expect(productMention?.entityName).toBe('Royal Cambodian Oud');
      expect(productMention?.targetUrl).toContain('/products/');

      expect(storeMention).toBeDefined();
      expect(storeMention?.entityName).toBe('Express Avenue Boutique');
      expect(storeMention?.targetUrl).toContain('/stores/');
    });

    it('generates internal link suggestions with relevance score', async () => {
      const suggestions = await InternalLinkService.generateLinkSuggestions(
        tenantAId,
        linkingArticleId,
        contextA
      );

      expect(suggestions.length).toBeGreaterThanOrEqual(1);
      expect(suggestions[0]?.targetUrl).toBeDefined();
      expect(suggestions[0]?.relevanceScore).toBeGreaterThan(0.7);
    });

    it('audits broken internal links and flags non-existent articles', async () => {
      // Create a published article with a broken markdown link
      const brokenArticle = await ContentService.createContentItem(
        {
          tenantId: tenantAId,
          brandId: brandAId,
          title: 'Article With Broken Link',
          slug: `broken-link-art-${idSuffix}`,
          contentMarkdown: 'Check out our [Non Existent Article](/blog/non-existent-article-xyz)!',
          userId: userAId,
        },
        contextA
      );

      // Publish it (must run under tenant context to satisfy RLS)
      await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
        await tx.contentItem.update({
          where: { id: brokenArticle.id },
          data: { status: ContentStatus.PUBLISHED },
        });
      });

      const audit = await InternalLinkService.auditBrokenLinks(tenantAId, contextA);
      const brokenItem = audit.find((a) => a.contentItemId === brokenArticle.id);

      expect(brokenItem).toBeDefined();
      expect(brokenItem?.brokenUrl).toBe('/blog/non-existent-article-xyz');
      expect(brokenItem?.reason).toBe('NOT_FOUND');
    });

    it('detects orphan content items having 0 inbound links', async () => {
      const orphans = await InternalLinkService.findOrphanContent(tenantAId, contextA);
      expect(orphans.length).toBeGreaterThan(0);
      expect(orphans.some((o) => o.inboundLinkCount === 0)).toBe(true);
    });

    it('creates and records content relations', async () => {
      const relation = await InternalLinkService.createContentRelation(
        tenantAId,
        {
          contentItemId: linkingArticleId,
          targetType: ContentRelationTargetType.PRODUCT,
          targetId: productA1Id,
          sortOrder: 1,
          notes: 'Featured recommendation in article',
        },
        contextA
      );

      expect(relation.id).toBeDefined();
      expect(relation.contentItemId).toBe(linkingArticleId);
      expect(relation.targetType).toBe('PRODUCT');
      expect(relation.targetId).toBe(productA1Id);
    });
  });

  describe('8. Grounded AI-Assisted Content Drafting', () => {
    it('compiles factual context strictly from the database without fabrication', async () => {
      const facts = await AiContentService.loadGroundedFacts(tenantAId, brandAId, opportunityAId);

      expect(facts.brandName).toContain('Royal Attar');
      expect(facts.locations.length).toBeGreaterThanOrEqual(1);
      expect(facts.locations[0]?.city).toBe('Chennai');
      expect(facts.products.length).toBeGreaterThanOrEqual(1);
      expect(facts.products[0]?.name).toBe('Royal Cambodian Oud');
      expect(facts.opportunityEvidence?.primaryKeyword).toBe('pure wild cambodian oud oil');
    });

    it('generates a factual draft incorporating real locations and catalog products', async () => {
      const draft = await AiContentService.generateDraft(
        {
          tenantId: tenantAId,
          brandId: brandAId,
          opportunityId: opportunityAId,
          primaryKeyword: 'wild cambodian agarwood',
          userId: userAId,
        },
        contextA
      );

      expect(draft.title).toContain('wild cambodian agarwood');
      expect(draft.contentMarkdown).toContain('Royal Cambodian Oud');
      expect(draft.contentMarkdown).toContain('Express Avenue Boutique');
      expect(draft.promptVersion).toBe(PROMPT_VERSION_CONTENT_DRAFT_V1);
      expect(draft.auditMetadata.groundedEntities.locationCount).toBeGreaterThanOrEqual(1);
      expect(draft.auditMetadata.groundedEntities.productCount).toBeGreaterThanOrEqual(1);
    });

    it('persists AI-assisted draft with DRAFT status and audit metadata', async () => {
      const item = await AiContentService.createDraftContentItem(
        {
          tenantId: tenantAId,
          brandId: brandAId,
          primaryKeyword: 'artisan oud distillation',
          userId: userAId,
        },
        contextA
      );

      expect(item.id).toBeDefined();
      expect(item.status).toBe(ContentStatus.DRAFT); // Human review mandatory!
      expect(item.currentVersion?.origin).toBe(ContentOrigin.AI_ASSISTED);
      expect(item.currentVersion?.aiAudit).toBeDefined();
    });
  });

  describe('9. Multi-Tenant Dual-Role RLS Isolation', () => {
    it('prevents Tenant B from viewing Tenant A content items', async () => {
      const resultA = await ContentService.listContentItems(
        { tenantId: tenantAId, brandId: brandAId },
        contextA
      );
      expect(resultA.items.length).toBeGreaterThan(0);

      // Context B trying to view Tenant A
      await expect(
        ContentService.listContentItems(
          { tenantId: tenantAId, brandId: brandAId },
          contextB // Tenant B context!
        )
      ).rejects.toThrow();
    });

    it('prevents Tenant B from modifying Tenant A content item', async () => {
      const itemsA = await ContentService.listContentItems(
        { tenantId: tenantAId, brandId: brandAId },
        contextA
      );
      const targetItem = itemsA.items[0]!;

      await expect(
        ContentService.updateContentItem(
          tenantAId,
          targetItem.id,
          {
            title: 'Hacked by Tenant B',
            userId: userBId,
          },
          contextB
        )
      ).rejects.toThrow();
    });

    it('enforces PostgreSQL 16 Dual-Role RLS at database layer', async () => {
      // Under Tenant B context, querying Tenant A content returns 0 rows
      const itemsUnderTenantB = await TenantContextService.withTenantContext(
        prisma,
        tenantBId,
        async (tx) => {
          return await tx.contentItem.findMany({
            where: { tenantId: tenantAId },
          });
        }
      );

      expect(itemsUnderTenantB.length).toBe(0);
    });
  });
});
