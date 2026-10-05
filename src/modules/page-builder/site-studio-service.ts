import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { createValidationError, createNotFoundError } from '@/shared/errors';
import { SurfaceService, WebSurfaceDto } from './surface-service';
import { ThemeService, BrandThemeDto, UpsertThemeInput } from './theme-service';
import { PageTemplateService, PageTemplateType } from './page-template-service';
import { TemplateVersionService } from './template-version-service';
import { NavigationService, SiteNavigationDto } from './navigation-service';
import { SeoResolver } from './seo-resolver';

export interface SiteOverviewDto {
  isLive: boolean;
  webSurface: WebSurfaceDto;
  primaryDomain: string | null;
  domainsCount: number;
  lastPublishedAt: Date | null;
  pagesCount: number;
  publishedPagesCount: number;
  storesCount: number;
  productsCount: number;
  theme: BrandThemeDto;
  health: {
    domainConfigured: boolean;
    hasPublishedPages: boolean;
    seoConfigured: boolean;
    hasStores: boolean;
  };
}

export interface SitePageDto {
  id: string;
  templateId: string;
  pageType: PageTemplateType;
  slug: string;
  citySlug?: string | null | undefined;
  storeId?: string | null | undefined;
  storeName?: string | undefined;
  categoryId?: string | null | undefined;
  categoryName?: string | undefined;
  productId?: string | null | undefined;
  productName?: string | undefined;
  status: 'PUBLISHED' | 'DRAFT' | 'UNPUBLISHED';
  canonicalUrl?: string | null | undefined;
  publishedVersion?: number | null | undefined;
  latestVersion: number;
  updatedAt: Date;
  createdAt: Date;
}

export interface CreateLandingPageInput {
  name: string;
  pageType: PageTemplateType;
  slug: string;
  citySlug?: string | undefined;
  storeId?: string | undefined;
  categoryId?: string | undefined;
  productId?: string | undefined;
}

export class SiteStudioService {
  /**
   * Resolves the target brandId, falling back to the first active brand for the tenant under RLS context.
   */
  public static async resolveBrandId(
    tenantId: string,
    requestedBrandId?: string | null
  ): Promise<string | null> {
    if (requestedBrandId) {
      return requestedBrandId;
    }
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const defaultBrand = await tx.brand.findFirst({
        where: { tenantId, isArchived: false },
        orderBy: { createdAt: 'asc' },
      });
      return defaultBrand?.id || null;
    });
  }

  /**
   * Ensures an active LOCALBI WebSurface exists for the given tenant and brand,
   * along with a default HOME template.
   */
  public static async getOrCreateLocalBiSurface(
    tenantId: string,
    brandId: string
  ): Promise<WebSurfaceDto> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      let surface = await tx.webSurface.findFirst({
        where: { tenantId, brandId, type: 'LOCALBI' },
        include: {
          domains: true,
          pageTemplates: true,
        },
      });

      if (!surface) {
        const brand = await tx.brand.findUniqueOrThrow({
          where: { id: brandId },
        });

        surface = await tx.webSurface.create({
          data: {
            tenantId,
            brandId,
            type: 'LOCALBI',
            name: `${brand.name} Website`,
            status: 'ACTIVE',
          },
          include: {
            domains: true,
            pageTemplates: true,
          },
        });

        // Create default subdomain e.g. [brand-slug].localbi.app
        const autoSubdomain = `${brand.slug.toLowerCase().replace(/[^a-z0-9]/g, '-')}.localbi.app`;
        await tx.domain.create({
          data: {
            tenantId,
            brandId: brand.id,
            webSurfaceId: surface.id,
            hostname: autoSubdomain,
            isPrimary: true,
            isVerified: true,
            sslStatus: 'ACTIVE',
          },
        });

        // Create default HOME template
        const homeTemplate = await tx.pageTemplate.create({
          data: {
            tenantId,
            brandId,
            webSurfaceId: surface.id,
            name: 'Home Template',
            type: 'HOME',
          },
        });

        // Create initial draft version
        await tx.pageTemplateVersion.create({
          data: {
            tenantId,
            pageTemplateId: homeTemplate.id,
            version: 1,
            status: 'PUBLISHED',
            publishedAt: new Date(),
            puckData: {
              content: [
                {
                  type: 'BrandHeader',
                  props: {
                    id: 'BrandHeader-home',
                    showCta: true,
                    ctaLabel: 'Contact Us',
                    link1Label: 'Home',
                    link1Url: '/',
                    link2Label: 'Locations',
                    link2Url: '/locations',
                  },
                },
                {
                  type: 'StoreHero',
                  props: {
                    id: 'StoreHero-home',
                    badgeText: 'Official Brand Storefront',
                    primaryCtaText: 'Get Directions',
                    secondaryCtaText: 'Call Now',
                  },
                },
                {
                  type: 'ProductGrid',
                  props: {
                    id: 'ProductGrid-home',
                    source: 'FEATURED_PRODUCTS',
                    headline: 'Popular Offerings',
                    limit: 6,
                    columns: 3,
                    showPrice: true,
                    showAvailability: true,
                  },
                },
                {
                  type: 'ReviewSummary',
                  props: {
                    id: 'ReviewSummary-home',
                    headline: 'Customer Satisfaction & Reviews',
                    showGoogleBadge: true,
                  },
                },
                {
                  type: 'BrandFooter',
                  props: {
                    id: 'BrandFooter-home',
                    showSocialLinks: true,
                  },
                },
              ],
              root: { props: {} },
            },
          },
        });

        // Create default Home Page record
        await tx.page.create({
          data: {
            tenantId,
            brandId,
            webSurfaceId: surface.id,
            templateId: homeTemplate.id,
            pageType: 'HOME',
            slug: '/',
            status: 'PUBLISHED',
          },
        });
      }

      const primaryDomain = surface.domains.find((d) => d.isPrimary) || surface.domains[0];
      return {
        id: surface.id,
        tenantId: surface.tenantId,
        brandId: surface.brandId,
        type: surface.type as 'LOCALBI',
        name: surface.name,
        status: surface.status as 'ACTIVE' | 'INACTIVE',
        primaryDomain: primaryDomain?.hostname || null,
        domainsCount: surface.domains.length,
        templatesCount: surface.pageTemplates.length,
        createdAt: surface.createdAt,
        updatedAt: surface.updatedAt,
      };
    });
  }

  /**
   * Retrieves high-level overview metrics and health for Site Studio.
   */
  public static async getSiteOverview(
    tenantId: string,
    brandId: string
  ): Promise<SiteOverviewDto> {
    const webSurface = await this.getOrCreateLocalBiSurface(tenantId, brandId);
    const theme = await ThemeService.getThemeForBrand(tenantId, brandId);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const [domains, pages, storesCount, productsCount, lastPublishedVersion] = await Promise.all([
        tx.domain.findMany({
          where: { tenantId, webSurfaceId: webSurface.id },
          orderBy: { isPrimary: 'desc' },
        }),
        tx.page.findMany({
          where: { tenantId, webSurfaceId: webSurface.id },
        }),
        tx.location.count({
          where: { tenantId, brandId, isArchived: false },
        }),
        tx.product.count({
          where: { tenantId, brandId, status: 'ACTIVE' },
        }),
        tx.pageTemplateVersion.findFirst({
          where: {
            tenantId,
            status: 'PUBLISHED',
            pageTemplate: { webSurfaceId: webSurface.id },
          },
          orderBy: { publishedAt: 'desc' },
        }),
      ]);

      const primaryDomain = domains.find((d) => d.isPrimary)?.hostname || domains[0]?.hostname || null;
      const publishedPagesCount = pages.filter((p) => p.status === 'PUBLISHED').length;

      const health = {
        domainConfigured: Boolean(primaryDomain),
        hasPublishedPages: publishedPagesCount > 0,
        seoConfigured: true,
        hasStores: storesCount > 0,
      };

      return {
        isLive: health.domainConfigured && health.hasPublishedPages,
        webSurface,
        primaryDomain,
        domainsCount: domains.length,
        lastPublishedAt: lastPublishedVersion?.publishedAt || null,
        pagesCount: pages.length,
        publishedPagesCount,
        storesCount,
        productsCount,
        theme,
        health,
      };
    });
  }

  /**
   * Lists all pages configured under this brand's website.
   */
  public static async listSitePages(
    tenantId: string,
    brandId: string
  ): Promise<SitePageDto[]> {
    const webSurface = await this.getOrCreateLocalBiSurface(tenantId, brandId);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const pages = await tx.page.findMany({
        where: { tenantId, webSurfaceId: webSurface.id },
        orderBy: [{ pageType: 'asc' }, { slug: 'asc' }],
      });

      // Gather template version stats
      const templateIds = Array.from(new Set(pages.map((p) => p.templateId)));
      const templates = await tx.pageTemplate.findMany({
        where: { tenantId, id: { in: templateIds } },
        include: {
          versions: {
            orderBy: { version: 'desc' },
          },
        },
      });

      const templateMap = new Map<string, (typeof templates)[0]>();
      templates.forEach((t) => templateMap.set(t.id, t));

      // Resolve store/product names where assigned
      const storeIds = pages.map((p) => p.storeId).filter(Boolean) as string[];
      const productIds = pages.map((p) => p.productId).filter(Boolean) as string[];

      const [stores, products] = await Promise.all([
        storeIds.length
          ? tx.location.findMany({
              where: { id: { in: storeIds } },
              select: { id: true, name: true },
            })
          : [],
        productIds.length
          ? tx.product.findMany({
              where: { id: { in: productIds } },
              select: { id: true, name: true },
            })
          : [],
      ]);

      const storeNameMap = new Map(stores.map((s) => [s.id, s.name]));
      const productNameMap = new Map(products.map((p) => [p.id, p.name]));

      return pages.map((p) => {
        const t = templateMap.get(p.templateId);
        const publishedVer = t?.versions.find((v) => v.status === 'PUBLISHED')?.version;
        const latestVer = t?.versions[0]?.version || 1;

        return {
          id: p.id,
          templateId: p.templateId,
          pageType: p.pageType as PageTemplateType,
          slug: p.slug,
          citySlug: p.citySlug,
          storeId: p.storeId,
          storeName: p.storeId ? storeNameMap.get(p.storeId) : undefined,
          categoryId: p.categoryId,
          productId: p.productId,
          productName: p.productId ? productNameMap.get(p.productId) : undefined,
          status: p.status as 'PUBLISHED' | 'DRAFT' | 'UNPUBLISHED',
          canonicalUrl: p.canonicalUrl,
          publishedVersion: publishedVer || null,
          latestVersion: latestVer,
          updatedAt: p.updatedAt,
          createdAt: p.createdAt,
        };
      });
    });
  }

  /**
   * Creates a new landing page or entity page without requiring code.
   */
  public static async createLandingPage(
    tenantId: string,
    brandId: string,
    input: CreateLandingPageInput
  ): Promise<SitePageDto> {
    const webSurface = await this.getOrCreateLocalBiSurface(tenantId, brandId);

    // Normalize slug
    let cleanSlug = input.slug.trim().toLowerCase();
    if (!cleanSlug.startsWith('/')) {
      cleanSlug = `/${cleanSlug}`;
    }
    // Prevent invalid characters
    if (!/^\/[a-z0-9_\-\/]*$/.test(cleanSlug)) {
      throw createValidationError(
        'Slug can only contain lowercase letters, numbers, dashes, and forward slashes.'
      );
    }
    // Prevent reserved slugs
    if (
      cleanSlug === '/api' ||
      cleanSlug.startsWith('/api/') ||
      cleanSlug === '/_next' ||
      cleanSlug.startsWith('/_next/') ||
      cleanSlug === '/admin'
    ) {
      throw createValidationError(`Slug "${cleanSlug}" conflicts with a reserved system path.`);
    }

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // Check for duplicate slug on this web surface
      const existing = await tx.page.findFirst({
        where: {
          tenantId,
          webSurfaceId: webSurface.id,
          slug: cleanSlug,
        },
      });

      if (existing) {
        throw createValidationError(`A page with slug "${cleanSlug}" already exists.`);
      }

      // Create a page template for this landing page
      const template = await tx.pageTemplate.create({
        data: {
          tenantId,
          brandId,
          webSurfaceId: webSurface.id,
          name: input.name.trim() || `${input.pageType} Page`,
          type: input.pageType,
        },
      });

      // Seed initial template content based on page type
      const initialBlocks = this.getInitialBlocksForType(input.pageType);
      await tx.pageTemplateVersion.create({
        data: {
          tenantId,
          pageTemplateId: template.id,
          version: 1,
          status: 'DRAFT',
          puckData: {
            content: initialBlocks,
            root: { props: {} },
          },
        },
      });

      const page = await tx.page.create({
        data: {
          tenantId,
          brandId,
          webSurfaceId: webSurface.id,
          templateId: template.id,
          pageType: input.pageType,
          slug: cleanSlug,
          citySlug: input.citySlug,
          storeId: input.storeId,
          categoryId: input.categoryId,
          productId: input.productId,
          status: 'DRAFT',
        },
      });

      return {
        id: page.id,
        templateId: page.templateId,
        pageType: page.pageType as PageTemplateType,
        slug: page.slug,
        citySlug: page.citySlug,
        storeId: page.storeId,
        categoryId: page.categoryId,
        productId: page.productId,
        status: page.status as 'DRAFT',
        canonicalUrl: page.canonicalUrl,
        publishedVersion: null,
        latestVersion: 1,
        updatedAt: page.updatedAt,
        createdAt: page.createdAt,
      };
    });
  }

  /**
   * Returns sensible initial visual blocks for newly created landing pages.
   */
  private static getInitialBlocksForType(type: PageTemplateType): any[] {
    const uid = () => Math.random().toString(36).slice(2, 8);
    const headerBlock = {
      type: 'BrandHeader',
      props: { id: `BrandHeader-${uid()}`, showCta: true, ctaLabel: 'Contact Us', link1Label: 'Home', link1Url: '/', link2Label: 'Catalog', link2Url: '/products' },
    };
    const footerBlock = {
      type: 'BrandFooter',
      props: { id: `BrandFooter-${uid()}`, showSocialLinks: true },
    };

    let blocks: any[] = [];
    switch (type) {
      case 'STORE':
        blocks = [
          headerBlock,
          { type: 'StoreHero', props: { id: `StoreHero-${uid()}`, badgeText: 'Verified Storefront', primaryCtaText: 'Get Directions', secondaryCtaText: 'Call Store' } },
          { type: 'StoreInfo', props: { id: `StoreInfo-${uid()}`, headline: 'Store Information', showHours: true, showAddress: true } },
          { type: 'ProductGrid', props: { id: `ProductGrid-${uid()}`, source: 'CURRENT_STORE_PRODUCTS', headline: 'Available at this Store', limit: 6, columns: 3, showPrice: true, showAvailability: true } },
          { type: 'ReviewSummary', props: { id: `ReviewSummary-${uid()}`, headline: 'Customer Feedback', showGoogleBadge: true } },
          footerBlock,
        ];
        break;
      case 'PRODUCT':
      case 'STORE_PRODUCT':
        blocks = [
          headerBlock,
          { type: 'ProductDetails', props: { id: `ProductDetails-${uid()}`, showSku: true } },
          { type: 'ProductGrid', props: { id: `ProductGrid-${uid()}`, source: 'FEATURED_PRODUCTS', headline: 'Related Offerings', limit: 4, columns: 4, showPrice: true, showAvailability: true } },
          footerBlock,
        ];
        break;
      case 'CITY':
        blocks = [
          headerBlock,
          { type: 'BrandHero', props: { id: `BrandHero-${uid()}`, headline: 'Explore Our Locations', subheading: 'Discover stores and services in your area.', primaryCtaText: 'View All Stores', primaryCtaUrl: '/locations' } },
          { type: 'NearbyStores', props: { id: `NearbyStores-${uid()}`, headline: 'Stores in this Region', limit: 6 } },
          footerBlock,
        ];
        break;
      default:
        blocks = [
          headerBlock,
          { type: 'BrandHero', props: { id: `BrandHero-${uid()}`, headline: 'Welcome', subheading: 'Discover authentic offerings and verified locations.', primaryCtaText: 'Explore', primaryCtaUrl: '/locations' } },
          { type: 'RichText', props: { id: `RichText-${uid()}`, content: '<p>Customize this landing page with your brand story, announcements, and call-to-actions.</p>', alignment: 'left' } },
          { type: 'CallCTA', props: { id: `CallCTA-${uid()}`, headline: 'Have Questions?', subheading: 'Get in touch with our team today.', buttonText: 'Contact Us' } },
          footerBlock,
        ];
        break;
    }

    return blocks.map((b, i) => ({
      ...b,
      props: {
        ...b.props,
        id: b.props?.id || `${b.type}-${i}-${uid()}`,
      },
    }));
  }

  /**
   * Publishes the latest draft version of a page's template atomically.
   */
  public static async publishPage(
    tenantId: string,
    pageId: string,
    userId?: string
  ): Promise<{ version: number; publishedAt: Date }> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const page = await tx.page.findFirst({
        where: { tenantId, id: pageId },
      });

      if (!page) {
        throw createNotFoundError('Page not found.');
      }

      // Find the template
      const template = await tx.pageTemplate.findUniqueOrThrow({
        where: { id: page.templateId },
        include: {
          versions: {
            orderBy: { version: 'desc' },
            take: 1,
          },
        },
      });

      const latestVersion = template.versions[0];
      if (!latestVersion) {
        throw createValidationError('No version found to publish.');
      }

      // Mark all previous versions ARCHIVED if previously published
      await tx.pageTemplateVersion.updateMany({
        where: {
          pageTemplateId: template.id,
          status: 'PUBLISHED',
        },
        data: {
          status: 'ARCHIVED',
        },
      });

      // Publish the latest version atomically
      const now = new Date();
      await tx.pageTemplateVersion.update({
        where: { id: latestVersion.id },
        data: {
          status: 'PUBLISHED',
          publishedAt: now,
          createdBy: userId,
        },
      });

      // Update Page status
      await tx.page.update({
        where: { id: page.id },
        data: {
          status: 'PUBLISHED',
          updatedAt: now,
        },
      });

      return {
        version: latestVersion.version,
        publishedAt: now,
      };
    });
  }

  /**
   * Rolls back a template to an existing historical version safely.
   * Does NOT mutate the historical record; it copies the historical puckData into
   * a brand-new published version!
   */
  public static async rollbackToVersion(
    tenantId: string,
    templateId: string,
    targetVersionNumber: number,
    userId?: string
  ): Promise<{ newVersion: number; rolledBackFrom: number }> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const historical = await tx.pageTemplateVersion.findFirst({
        where: {
          tenantId,
          pageTemplateId: templateId,
          version: targetVersionNumber,
        },
      });

      if (!historical) {
        throw createNotFoundError(`Version ${targetVersionNumber} not found for rollback.`);
      }

      const latest = await tx.pageTemplateVersion.findFirst({
        where: { tenantId, pageTemplateId: templateId },
        orderBy: { version: 'desc' },
      });

      const nextVersionNum = (latest?.version || 1) + 1;
      const now = new Date();

      // Archive currently published versions
      await tx.pageTemplateVersion.updateMany({
        where: { pageTemplateId: templateId, status: 'PUBLISHED' },
        data: { status: 'ARCHIVED' },
      });

      // Create new published version containing historical puckData
      await tx.pageTemplateVersion.create({
        data: {
          tenantId,
          pageTemplateId: templateId,
          version: nextVersionNum,
          puckData: historical.puckData as any,
          status: 'PUBLISHED',
          publishedAt: now,
          createdBy: userId,
        },
      });

      return {
        newVersion: nextVersionNum,
        rolledBackFrom: targetVersionNumber,
      };
    });
  }
}
