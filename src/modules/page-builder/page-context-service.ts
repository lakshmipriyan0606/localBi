import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { ThemeService, BrandThemeDto } from './theme-service';
import { SurfaceService, WebSurfaceDto, DomainDto } from './surface-service';
import { SeoResolver, ResolvedSeoDto, SeoTokenData } from './seo-resolver';
import {
  StructuredDataService,
  BreadcrumbItem,
  StructuredDataStoreInput,
  StructuredDataProductInput,
} from './structured-data';
import { PriceResolver } from '../catalog/price-resolver';
import { AvailabilityResolver } from '../catalog/availability-resolver';
import { PageTemplateType } from './page-template-service';
import { NavigationService, SiteNavigationDto, DEFAULT_SITE_NAVIGATION } from './navigation-service';

export interface StoreDto {
  id: string;
  name: string;
  storeCode?: string | null | undefined;
  addressLine1?: string | null | undefined;
  addressLine2?: string | null | undefined;
  city?: string | null | undefined;
  state?: string | null | undefined;
  postalCode?: string | null | undefined;
  country?: string | null | undefined;
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
  phone?: string | null | undefined;
  email?: string | null | undefined;
  openingHours?: Record<string, string> | null | undefined;
  rating?: number | null | undefined;
  reviewCount?: number | null | undefined;
  googleMapsUrl?: string | null | undefined;
}

export interface ProductDto {
  id: string;
  name: string;
  sku: string;
  slug: string;
  shortDescription?: string | null | undefined;
  description?: string | null | undefined;
  basePrice?: number | null | undefined;
  currency: string;
  isAvailable?: boolean | undefined;
  category?: { id: string; name: string; slug: string } | null | undefined;
  imageUrl?: string | null | undefined;
}

export interface StoreProductDto {
  storeId: string;
  productId: string;
  isAvailable: boolean;
  priceOverride?: number | null | undefined;
  effectivePrice: number | null;
  quantity?: number | null | undefined;
}

export interface ReviewDto {
  id: string;
  authorName: string;
  rating: number;
  comment?: string | null | undefined;
  createTime?: string | null | undefined;
}

export interface FaqDto {
  question: string;
  answer: string;
}

export interface TrackingContextDto {
  tenantSlug: string;
  brandId: string;
  brandName?: string | undefined;
  webSurfaceId: string;
  webSurfaceType?: string | undefined;
  pageType: PageTemplateType;
  storeId?: string | undefined;
  storeName?: string | undefined;
  productId?: string | undefined;
  productName?: string | undefined;
  categoryId?: string | undefined;
  ga4MeasurementId?: string | undefined;
}

export interface PageContext {
  tenant: { id: string; name: string; slug: string };
  brand: { id: string; name: string; slug: string };
  webSurface: WebSurfaceDto;
  domain: DomainDto | null;
  theme: BrandThemeDto;
  cssBlock: string;
  navigation: SiteNavigationDto;

  pageType: PageTemplateType;
  path: string;

  city?: string | null | undefined;
  store?: StoreDto | null | undefined;
  category?: { id: string; name: string; slug: string } | null | undefined;
  product?: ProductDto | null | undefined;
  storeProduct?: StoreProductDto | null | undefined;

  contentItem?: any | null | undefined;
  contentVersion?: any | null | undefined;
  author?: any | null | undefined;
  articles?: any[] | undefined;
  relatedArticles?: any[] | undefined;
  redirectUrl?: string | null | undefined;

  products: ProductDto[];
  nearbyStores: StoreDto[];
  reviews: ReviewDto[];
  faqs: FaqDto[];

  seo: ResolvedSeoDto;
  structuredData: Array<Record<string, unknown>>;
  breadcrumbs: BreadcrumbItem[];
  trackingContext: TrackingContextDto;
}

export class PageContextService {
  /**
   * Resolves full PageContext for any incoming route under a resolved tenant and brand.
   */
  public static async resolveContext(params: {
    tenant: { id: string; name: string; slug: string };
    brand: { id: string; name: string; slug: string };
    webSurface: WebSurfaceDto;
    domain: DomainDto | null;
    pathSegments: string[];
    isDraftOrPreview?: boolean | undefined;
  }): Promise<PageContext> {
    const { tenant, brand, webSurface, domain, pathSegments, isDraftOrPreview } = params;
    const cleanSegments = pathSegments.filter(Boolean).map((s) => s.toLowerCase().trim());
    const rawPath = cleanSegments.length === 0 ? '/' : `/${cleanSegments.join('/')}`;

    // 1. Resolve Theme
    const theme = await ThemeService.getThemeForBrand(tenant.id, brand.id);
    const cssBlock = ThemeService.generateCssBlock(theme);

    return TenantContextService.withTenantContext(prisma, tenant.id, async (tx) => {
      let pageType: PageTemplateType = 'HOME';
      let city: string | null = null;
      let store: StoreDto | null = null;
      let category: { id: string; name: string; slug: string } | null = null;
      let product: ProductDto | null = null;
      let storeProduct: StoreProductDto | null = null;
      let contentItem: any = null;
      let contentVersion: any = null;
      let author: any = null;
      let articles: any[] = [];
      let relatedArticles: any[] = [];
      let redirectUrl: string | null = null;
      let products: ProductDto[] = [];
      let nearbyStores: StoreDto[] = [];
      let reviews: ReviewDto[] = [];
      const faqs: FaqDto[] = [];
      const breadcrumbs: BreadcrumbItem[] = [{ name: 'Home', url: '/' }];

      // Host domain or default
      const domainHost = domain?.hostname || undefined;

      // ── ROUTE SEGMENT RESOLUTION ──────────────────────────────────────────

      // A. STORE_PRODUCT: e.g. /chennai/mannadi/royal-oud (3 segments)
      if (cleanSegments.length === 3) {
        const [citySeg, storeSeg, prodSeg] = cleanSegments as [string, string, string];
        city = citySeg;

        // Find store by name/slug match in city
        const loc = await tx.location.findFirst({
          where: {
            tenantId: tenant.id,
            brandId: brand.id,
            city: { equals: citySeg, mode: 'insensitive' },
            OR: [
              { name: { contains: storeSeg, mode: 'insensitive' } },
              { storeCode: { equals: storeSeg, mode: 'insensitive' } },
            ],
          },
        });

        // Find product by slug
        const prod = await tx.product.findFirst({
          where: {
            tenantId: tenant.id,
            brandId: brand.id,
            slug: prodSeg,
          },
          include: {
            categoryRel: { select: { id: true, name: true, slug: true } },
            media: { take: 1, orderBy: { sortOrder: 'asc' } },
          },
        });

        if (loc && prod) {
          pageType = 'STORE_PRODUCT';
          store = {
            id: loc.id,
            name: loc.name,
            storeCode: loc.storeCode,
            addressLine1: loc.addressLine1,
            addressLine2: null,
            city: loc.city,
            state: loc.state,
            postalCode: loc.postalCode,
            country: loc.country,
            latitude: null,
            longitude: null,
            phone: null,
            email: null,
          };

          category = prod.categoryRel;

          // Find store product mapping
          const spMapping = await tx.storeProduct.findUnique({
            where: {
              uq_store_product_store_product: {
                storeId: loc.id,
                productId: prod.id,
              },
            },
          });

          const basePriceNum = prod.basePrice ? Number(prod.basePrice) : null;
          const overrideNum = spMapping?.priceOverride ? Number(spMapping.priceOverride) : null;

          const effectivePrice = PriceResolver.resolvePrice(
            { basePrice: basePriceNum },
            overrideNum !== null ? { priceOverride: overrideNum } : null
          );

          const isAvailable = AvailabilityResolver.isAvailableAtStore(
            { status: prod.status },
            spMapping ? { isAvailable: spMapping.isAvailable, status: spMapping.status } : null
          );

          product = {
            id: prod.id,
            name: prod.name,
            sku: prod.sku,
            slug: prod.slug,
            shortDescription: prod.shortDescription,
            description: prod.description,
            basePrice: basePriceNum,
            currency: prod.currency,
            isAvailable,
            category: prod.categoryRel,
            imageUrl: prod.media[0]?.url || null,
          };

          storeProduct = {
            storeId: loc.id,
            productId: prod.id,
            isAvailable,
            priceOverride: overrideNum,
            effectivePrice,
            quantity: spMapping?.quantity || null,
          };

          breadcrumbs.push(
            { name: loc.city || citySeg, url: `/${citySeg}` },
            { name: loc.name, url: `/${citySeg}/${storeSeg}` },
            { name: prod.name, url: rawPath }
          );
        }
      }

      // B. STORE or PRODUCT: e.g. /chennai/mannadi or /products/royal-oud (2 segments)
      else if (cleanSegments.length === 2) {
        const [seg0, seg1] = cleanSegments as [string, string];

        if (seg0 === 'products') {
          // Direct Product page
          const prod = await tx.product.findFirst({
            where: {
              tenantId: tenant.id,
              brandId: brand.id,
              slug: seg1,
            },
            include: {
              categoryRel: { select: { id: true, name: true, slug: true } },
              media: { take: 1, orderBy: { sortOrder: 'asc' } },
            },
          });

          if (prod) {
            pageType = 'PRODUCT';
            const basePriceNum = prod.basePrice ? Number(prod.basePrice) : null;
            product = {
              id: prod.id,
              name: prod.name,
              sku: prod.sku,
              slug: prod.slug,
              shortDescription: prod.shortDescription,
              description: prod.description,
              basePrice: basePriceNum,
              currency: prod.currency,
              isAvailable: prod.status === 'ACTIVE',
              category: prod.categoryRel,
              imageUrl: prod.media[0]?.url || null,
            };
            category = prod.categoryRel;

            breadcrumbs.push(
              { name: 'Products', url: '/products' },
              { name: prod.name, url: rawPath }
            );
          }
        } else if (seg0 === 'blog' || seg0 === 'guides') {
          // Article page: /blog/[slug] or /guides/[slug]
          const item = await tx.contentItem.findFirst({
            where: {
              tenantId: tenant.id,
              brandId: brand.id,
              slug: seg1,
              ...(isDraftOrPreview ? {} : { status: 'PUBLISHED' }),
            },
            include: {
              versions: {
                orderBy: { version: 'desc' },
                take: 5,
              },
              author: true,
              category: true,
            },
          });

          if (item) {
            pageType = 'ARTICLE';
            contentItem = item;
            const currentVer = item.versions.find((v: any) => v.version === item.currentVersionNumber) || item.versions[0];
            const pubVer = item.versions.find((v: any) => v.id === item.publishedVersionId);
            contentVersion = isDraftOrPreview ? (currentVer || pubVer) : (pubVer || currentVer);
            author = item.author;

            const related = await tx.contentItem.findMany({
              where: {
                tenantId: tenant.id,
                brandId: brand.id,
                status: 'PUBLISHED',
                id: { not: item.id },
              },
              include: { versions: { take: 1, orderBy: { version: 'desc' } }, author: true },
              take: 3,
              orderBy: { publishedAt: 'desc' },
            });
            relatedArticles = related;

            breadcrumbs.push(
              { name: seg0 === 'guides' ? 'Guides' : 'Blog', url: `/${seg0}` },
              { name: item.title, url: rawPath }
            );
          } else {
            // Check for redirect
            const redir = await tx.redirect.findFirst({
              where: {
                tenantId: tenant.id,
                fromPath: rawPath,
                isActive: true,
              },
            });
            if (redir) {
              redirectUrl = redir.toPath;
            }
          }
        } else {
          // Store page in city: e.g. /chennai/mannadi
          city = seg0;
          const loc = await tx.location.findFirst({
            where: {
              tenantId: tenant.id,
              brandId: brand.id,
              city: { equals: seg0, mode: 'insensitive' },
              OR: [
                { name: { contains: seg1, mode: 'insensitive' } },
                { storeCode: { equals: seg1, mode: 'insensitive' } },
              ],
            },
            include: {
              gbpReviews: { take: 5, orderBy: { createTime: 'desc' } },
              gbpAggregate: true,
            },
          });

          if (loc) {
            pageType = 'STORE';
            store = {
              id: loc.id,
              name: loc.name,
              storeCode: loc.storeCode,
              addressLine1: loc.addressLine1,
              addressLine2: null,
              city: loc.city,
              state: loc.state,
              postalCode: loc.postalCode,
              country: loc.country,
              latitude: null,
              longitude: null,
              phone: null,
              email: null,
              rating: loc.gbpAggregate?.averageRating ? Number(loc.gbpAggregate.averageRating) : null,
              reviewCount: loc.gbpAggregate?.totalReviewCount || null,
            };

            // Map real GBP reviews
            reviews = loc.gbpReviews.map((r) => ({
              id: r.id,
              authorName: r.reviewerName,
              rating: r.rating,
              comment: r.comment,
              createTime: r.createTime?.toISOString() || null,
            }));

            // Coordinated fetch of store products
            const storeProdRows = await tx.storeProduct.findMany({
              where: { tenantId: tenant.id, storeId: loc.id, isAvailable: true },
              include: {
                product: {
                  include: {
                    categoryRel: { select: { id: true, name: true, slug: true } },
                    media: { take: 1, orderBy: { sortOrder: 'asc' } },
                  },
                },
              },
              take: 12,
            });

            products = storeProdRows.map((sp) => {
              const basePriceNum = sp.product.basePrice ? Number(sp.product.basePrice) : null;
              const overrideNum = sp.priceOverride ? Number(sp.priceOverride) : null;
              const effectivePrice = PriceResolver.resolvePrice(
                { basePrice: basePriceNum },
                overrideNum !== null ? { priceOverride: overrideNum } : null
              );
              return {
                id: sp.product.id,
                name: sp.product.name,
                sku: sp.product.sku,
                slug: sp.product.slug,
                shortDescription: sp.product.shortDescription,
                description: sp.product.description,
                basePrice: effectivePrice,
                currency: sp.product.currency,
                isAvailable: sp.isAvailable,
                category: sp.product.categoryRel,
                imageUrl: sp.product.media[0]?.url || null,
              };
            });

            breadcrumbs.push(
              { name: loc.city || seg0, url: `/${seg0}` },
              { name: loc.name, url: rawPath }
            );
          }
        }
      }

      // C. CITY or CATEGORY or BLOG: e.g. /chennai or /attars or /blog (1 segment)
      else if (cleanSegments.length === 1) {
        const seg = cleanSegments[0]!;

        if (seg === 'blog') {
          pageType = 'BLOG_INDEX';
          const blogItems = await tx.contentItem.findMany({
            where: {
              tenantId: tenant.id,
              brandId: brand.id,
              status: 'PUBLISHED',
            },
            include: {
              versions: { take: 1, orderBy: { version: 'desc' } },
              author: true,
              category: true,
            },
            orderBy: { publishedAt: 'desc' },
            take: 20,
          });
          articles = blogItems;
          breadcrumbs.push({ name: 'Blog', url: '/blog' });
        } else {
          // 1. Try Category
          const cat = await tx.category.findFirst({
            where: { tenantId: tenant.id, brandId: brand.id, slug: seg },
          });

        if (cat) {
          pageType = 'CATEGORY';
          category = { id: cat.id, name: cat.name, slug: cat.slug };

          const catProds = await tx.product.findMany({
            where: { tenantId: tenant.id, brandId: brand.id, categoryId: cat.id, status: 'ACTIVE' },
            include: {
              media: { take: 1, orderBy: { sortOrder: 'asc' } },
            },
            take: 24,
          });

          products = catProds.map((p) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            slug: p.slug,
            shortDescription: p.shortDescription,
            description: p.description,
            basePrice: p.basePrice ? Number(p.basePrice) : null,
            currency: p.currency,
            isAvailable: true,
            imageUrl: p.media[0]?.url || null,
          }));

          breadcrumbs.push({ name: cat.name, url: rawPath });
        } else {
          // 2. Try City
          const cityLocs = await tx.location.findMany({
            where: {
              tenantId: tenant.id,
              brandId: brand.id,
              city: { equals: seg, mode: 'insensitive' },
            },
          });

          if (cityLocs.length > 0) {
            pageType = 'CITY';
            city = cityLocs[0]?.city || seg;
            nearbyStores = cityLocs.map((loc) => ({
              id: loc.id,
              name: loc.name,
              storeCode: loc.storeCode,
              addressLine1: loc.addressLine1,
              city: loc.city,
              state: loc.state,
              phone: null,
            }));

            breadcrumbs.push({ name: city, url: rawPath });
          }
        }
      }
    }

      // D. HOME: /
      if (cleanSegments.length === 0 || pageType === 'HOME') {
        pageType = 'HOME';

        // Load featured catalog products
        const homeProds = await tx.product.findMany({
          where: { tenantId: tenant.id, brandId: brand.id, status: 'ACTIVE' },
          include: {
            categoryRel: { select: { id: true, name: true, slug: true } },
            media: { take: 1, orderBy: { sortOrder: 'asc' } },
          },
          take: 12,
        });

        products = homeProds.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          slug: p.slug,
          shortDescription: p.shortDescription,
          description: p.description,
          basePrice: p.basePrice ? Number(p.basePrice) : null,
          currency: p.currency,
          isAvailable: true,
          category: p.categoryRel,
          imageUrl: p.media[0]?.url || null,
        }));

        // Load stores
        const locs = await tx.location.findMany({
          where: { tenantId: tenant.id, brandId: brand.id, isArchived: false },
          take: 8,
        });

        nearbyStores = locs.map((loc) => ({
          id: loc.id,
          name: loc.name,
          storeCode: loc.storeCode,
          addressLine1: loc.addressLine1,
          city: loc.city,
          state: loc.state,
          phone: null,
        }));
      }

      // ── SEO RESOLUTION ──────────────────────────────────────────────────
      const seoTokens: SeoTokenData = {
        brand: brand.name,
        city: city || store?.city || undefined,
        locality: store?.addressLine1 || undefined,
        store: store?.name || undefined,
        product: product?.name || undefined,
        category: category?.name || undefined,
      };

      const seoConfig = await tx.seoConfig.findFirst({
        where: {
          tenantId: tenant.id,
          brandId: brand.id,
          OR: [{ pageType }, { pageType: null }],
        },
        orderBy: { pageType: 'asc' }, // specific pageType precedes null
      });

      const resolvedSeo = SeoResolver.resolveSeo({
        tokenData: seoTokens,
        customConfig: seoConfig || undefined,
        path: rawPath,
        domainHostname: domainHost,
        isDraftOrPreview,
        ogImageUrl: product?.imageUrl || undefined,
      });

      // ── STRUCTURED DATA (JSON-LD) ────────────────────────────────────────
      const structuredData: Array<Record<string, unknown>> = [];

      // BreadcrumbList
      const bcSchema = StructuredDataService.generateBreadcrumbs(
        breadcrumbs.map((b) => ({
          name: b.name,
          url: domainHost ? `https://${domainHost}${b.url}` : b.url,
        }))
      );
      if (bcSchema) structuredData.push(bcSchema);

      // LocalBusiness / Store
      if (store) {
        const storeSchemaInput: StructuredDataStoreInput = {
          name: store.name,
          telephone: store.phone,
          addressLine1: store.addressLine1,
          city: store.city,
          state: store.state,
          postalCode: store.postalCode,
          country: store.country,
          latitude: store.latitude,
          longitude: store.longitude,
          rating: store.rating,
          reviewCount: store.reviewCount,
          url: domainHost ? `https://${domainHost}${rawPath}` : undefined,
        };
        const sSchema = StructuredDataService.generateStoreSchema(storeSchemaInput);
        if (sSchema) structuredData.push(sSchema);
      }

      // Product
      if (product) {
        const productSchemaInput: StructuredDataProductInput = {
          name: product.name,
          description: product.description || product.shortDescription,
          sku: product.sku,
          imageUrl: product.imageUrl,
          price: storeProduct ? storeProduct.effectivePrice : product.basePrice,
          currency: product.currency,
          isAvailable: storeProduct ? storeProduct.isAvailable : product.isAvailable,
          url: domainHost ? `https://${domainHost}${rawPath}` : undefined,
        };
        const pSchema = StructuredDataService.generateProductSchema(productSchemaInput);
        if (pSchema) structuredData.push(pSchema);
      }

      // FAQs
      if (faqs.length > 0) {
        const fSchema = StructuredDataService.generateFaqSchema(faqs);
        if (fSchema) structuredData.push(fSchema);
      }

      // Article schema
      if (contentItem && contentVersion) {
        const artSchema = StructuredDataService.generateArticleSchema({
          headline: contentItem.title,
          description: contentVersion.seoDescription || contentItem.excerpt,
          authorName: author?.name,
          authorUrl: author?.slug ? `/authors/${author.slug}` : undefined,
          publisherName: brand.name,
          datePublished: contentItem.publishedAt ? new Date(contentItem.publishedAt).toISOString() : undefined,
          dateModified: contentItem.updatedAt ? new Date(contentItem.updatedAt).toISOString() : undefined,
          imageUrl: contentItem.featuredImageUrl || contentVersion.ogImageUrl,
          url: domainHost ? `https://${domainHost}${rawPath}` : rawPath,
        });
        if (artSchema) structuredData.push(artSchema);
      }

      // ── TRACKING CONTEXT ─────────────────────────────────────────────────
      let ga4MeasurementId: string | undefined = undefined;
      const ga4Mapping = await tx.internalResourceMapping.findFirst({
        where: {
          tenantId: tenant.id,
          internalType: 'WEBSURFACE',
          internalId: webSurface.id,
          resource: { provider: 'GOOGLE_ANALYTICS_4' },
        },
        include: { resource: true },
      });
      if (ga4Mapping?.resource?.externalResourceId) {
        const extId = ga4Mapping.resource.externalResourceId;
        ga4MeasurementId = extId.startsWith('G-') ? extId : undefined;
      }

      const trackingContext: TrackingContextDto = {
        tenantSlug: tenant.slug,
        brandId: brand.id,
        brandName: brand.name,
        webSurfaceId: webSurface.id,
        webSurfaceType: webSurface.type,
        pageType,
        storeId: store?.id,
        storeName: store?.name,
        productId: product?.id,
        productName: product?.name,
        categoryId: category?.id,
        ga4MeasurementId,
      };

      return {
        tenant,
        brand,
        webSurface,
        domain,
        theme,
        cssBlock,
        navigation: await NavigationService.getNavigation(tenant.id, webSurface.id),
        pageType,
        path: rawPath,
        city,
        store,
        category,
        product,
        storeProduct,
        contentItem,
        contentVersion,
        author,
        articles,
        relatedArticles,
        redirectUrl,
        products,
        nearbyStores,
        reviews,
        faqs,
        seo: resolvedSeo,
        structuredData,
        breadcrumbs,
        trackingContext,
      };
    });
  }

  /**
   * Resolves PageContext directly from incoming HTTP hostname and path.
   */
  public static async resolveByHostnameOrSubdomain(
    hostnameOrSubdomain: string,
    pathSegments: string[],
    isDraftOrPreview = false
  ): Promise<PageContext | null> {
    const hostInfo = await SurfaceService.resolveHost(hostnameOrSubdomain);
    if (!hostInfo) return null;

    return this.resolveContext({
      tenant: hostInfo.tenant,
      brand: hostInfo.brand,
      webSurface: hostInfo.webSurface,
      domain: hostInfo.domain,
      pathSegments,
      isDraftOrPreview,
    });
  }
}
