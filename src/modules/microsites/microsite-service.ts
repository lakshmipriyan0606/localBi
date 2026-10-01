import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { CatalogCompatibilityAdapter } from '@/modules/catalog/catalog-compatibility-adapter';

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  isPopular?: boolean;
  isVeg?: boolean;
  image?: string;
}

export type MicrositeStatus = 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED_CHANGES';
export type DomainStatus = 'NOT_CONNECTED' | 'PENDING_DNS' | 'VERIFYING' | 'CONNECTED' | 'FAILED';
export type TemplateId = 'modern' | 'minimal' | 'restaurant' | 'retail' | 'professional' | 'services';

export interface MicrositePage {
  id: string;
  name: string;
  path: string;
  isHome?: boolean;
  seoTitle?: string;
  seoDescription?: string;
}

export interface SectionBlock {
  id: string;
  type: string;
  category: 'BASIC' | 'BUSINESS' | 'CONTACT';
  title: string;
  props: Record<string, unknown>;
  hidden?: boolean;
}

export interface MicrositeTheme {
  primaryColor: string;
  secondaryColor: string;
  font: string;
  borderRadius?: string;
  buttonStyle?: 'rounded' | 'pill' | 'square';
}

export interface MicrositeConfig {
  id?: string | undefined;
  subdomain: string;
  tenantSlug: string;
  brandId?: string | undefined;
  brandName: string;
  locationId?: string | undefined;
  locationName?: string | undefined;
  tagline: string;
  aboutStory: string;
  primaryColor: string;
  secondaryColor?: string | undefined;
  font?: string | undefined;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  state?: string | undefined;
  postalCode?: string | undefined;
  hours: string;
  googleRating: number;
  reviewCount: number;
  googleMapsUrl: string;
  heroImageUrl: string;
  menuItems: MenuItem[];
  published: boolean;
  status?: MicrositeStatus | undefined;
  customDomain?: string | undefined;
  customDomainStatus?: DomainStatus | undefined;
  industry?: 'FOOD' | 'JEWELRY' | 'HOSPITAL' | 'RETAIL' | 'SERVICES' | undefined;
  templateId?: TemplateId | undefined;
  theme?: MicrositeTheme | undefined;
  pages?: MicrositePage[] | undefined;
  sections?: SectionBlock[] | undefined;
  draftData?: unknown;
  publishedData?: unknown;
  lastPublishedAt?: string | undefined;
  updatedAt?: string | undefined;
  version?: number | undefined;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_PAGES: MicrositePage[] = [
  { id: 'page-home', name: 'Home', path: '/', isHome: true },
  { id: 'page-menu', name: 'Menu & Specials', path: '/menu' },
  { id: 'page-about', name: 'Our Story', path: '/about' },
  { id: 'page-contact', name: 'Location & Hours', path: '/contact' },
];

function normalizeConfig(config: Partial<MicrositeConfig>): MicrositeConfig {
  const subdomain = (config.subdomain || 'storefront').toLowerCase();
  const brandName = config.brandName || 'Storefront';
  const tenantSlug = config.tenantSlug || 'default';
  const primaryColor = config.primaryColor || '#4F46E5';
  const secondaryColor = config.secondaryColor || '#059669';
  const font = config.font || 'Inter';

  return {
    id: config.id || `ms-${subdomain}`,
    subdomain,
    tenantSlug,
    brandId: config.brandId,
    brandName,
    locationId: config.locationId,
    locationName: config.locationName || brandName,
    tagline:
      config.tagline ||
      'Leading brand destination for quality, authenticity, and dedicated service.',
    aboutStory:
      config.aboutStory ||
      `${brandName} is proud to serve our community with premier quality and warm hospitality.`,
    primaryColor,
    secondaryColor,
    font,
    phone: config.phone || '',
    whatsapp: config.whatsapp || '',
    address: config.address || '',
    city: config.city || '',
    state: config.state || '',
    postalCode: config.postalCode || '',
    hours: config.hours || '9:00 AM - 9:00 PM',
    googleRating: config.googleRating ?? 4.9,
    reviewCount: config.reviewCount ?? 0,
    googleMapsUrl:
      config.googleMapsUrl ||
      `https://maps.google.com/?q=${encodeURIComponent(config.address || brandName)}`,
    heroImageUrl: config.heroImageUrl || '',
    menuItems: config.menuItems || [],
    published: config.published ?? false,
    status: config.status || (config.published ? 'PUBLISHED' : 'DRAFT'),
    customDomain: config.customDomain,
    customDomainStatus: config.customDomain
      ? config.customDomainStatus || 'CONNECTED'
      : 'NOT_CONNECTED',
    industry: config.industry || 'FOOD',
    templateId: config.templateId || 'restaurant',
    theme: config.theme || {
      primaryColor,
      secondaryColor,
      font,
      borderRadius: '16px',
      buttonStyle: 'rounded',
    },
    pages: config.pages || DEFAULT_PAGES,
    sections: config.sections || [],
    draftData: config.draftData,
    publishedData: config.publishedData,
    lastPublishedAt: config.lastPublishedAt,
    updatedAt: config.updatedAt || new Date().toISOString(),
    version: config.version || 1,
  };
}

/** Map a DB Prisma row -> MicrositeConfig */
function dbRowToConfig(row: {
  id: string;
  tenantId: string;
  subdomain: string;
  brandId: string | null;
  brandName: string;
  locationId: string | null;
  locationName: string | null;
  tagline: string | null;
  aboutStory: string | null;
  primaryColor: string;
  secondaryColor: string | null;
  font: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  state: string | null;
  postalCode: string | null;
  hours: string;
  googleRating: number;
  reviewCount: number;
  googleMapsUrl: string;
  heroImageUrl: string;
  menuItems: unknown;
  published: boolean;
  status: string;
  customDomain: string | null;
  customDomainStatus: string;
  industry: string | null;
  templateId: string;
  theme: unknown;
  pages: unknown;
  sections: unknown;
  draftData: unknown;
  publishedData: unknown;
  lastPublishedAt: Date | null;
  updatedAt: Date;
  version: number;
  tenant?: { slug: string };
}, tenantSlug?: string): MicrositeConfig {
  return {
    id: row.id,
    subdomain: row.subdomain,
    tenantSlug: row.tenant?.slug ?? tenantSlug ?? '',
    brandId: row.brandId ?? undefined,
    brandName: row.brandName,
    locationId: row.locationId ?? undefined,
    locationName: row.locationName ?? undefined,
    tagline: row.tagline ?? '',
    aboutStory: row.aboutStory ?? '',
    primaryColor: row.primaryColor,
    secondaryColor: row.secondaryColor ?? undefined,
    font: row.font,
    phone: row.phone,
    whatsapp: row.whatsapp,
    address: row.address,
    city: row.city,
    state: row.state ?? undefined,
    postalCode: row.postalCode ?? undefined,
    hours: row.hours,
    googleRating: row.googleRating,
    reviewCount: row.reviewCount,
    googleMapsUrl: row.googleMapsUrl,
    heroImageUrl: row.heroImageUrl,
    menuItems: (row.menuItems as MenuItem[]) ?? [],
    published: row.published,
    status: row.status as MicrositeStatus,
    customDomain: row.customDomain ?? undefined,
    customDomainStatus: row.customDomainStatus as DomainStatus,
    industry: (row.industry as MicrositeConfig['industry']) ?? undefined,
    templateId: row.templateId as TemplateId,
    theme: (row.theme as MicrositeTheme) ?? undefined,
    pages: (row.pages as MicrositePage[]) ?? DEFAULT_PAGES,
    sections: (row.sections as SectionBlock[]) ?? [],
    draftData: row.draftData ?? undefined,
    publishedData: row.publishedData ?? undefined,
    lastPublishedAt: row.lastPublishedAt?.toISOString() ?? undefined,
    updatedAt: row.updatedAt.toISOString(),
    version: row.version,
  };
}

async function resolveTenantId(tenantSlug: string): Promise<string | null> {
  const baseSlug = tenantSlug.toLowerCase().trim().replace(/-\d+$/, '');
  const tenant = await prisma.tenant.findFirst({
    where: { OR: [{ slug: tenantSlug }, { slug: baseSlug }] },
    select: { id: true, slug: true },
  });
  return tenant?.id ?? null;
}

// ---------------------------------------------------------------------------
// MicrositeService — tenant-isolated via RLS + dedicated public read path
// ---------------------------------------------------------------------------

export class MicrositeService {
  /**
   * Dedicated PUBLIC READ path.
   * Scoped strictly to published microsites using `withPublicReadContext`.
   * Never exposes internal draft data or tenant-private settings.
   */
  static async getMicrositeBySubdomain(subdomainOrHost: string): Promise<MicrositeConfig | null> {
    const cleanKey = subdomainOrHost.toLowerCase().trim().replace(/:\d+$/, '');
    const baseSlug = cleanKey.replace(/-\d+$/, '');

    return TenantContextService.withPublicReadContext(prisma, async (tx) => {
      // 1. Direct lookup by subdomain (published only)
      const bySubdomain = await tx.microsite.findFirst({
        where: {
          published: true,
          subdomain: { in: [cleanKey, baseSlug] },
        },
        include: { tenant: { select: { slug: true } } },
        orderBy: { updatedAt: 'desc' },
      });
      if (bySubdomain) {
        const config = dbRowToConfig(bySubdomain, bySubdomain.tenant.slug);
        config.menuItems = await CatalogCompatibilityAdapter.resolveMenuItemsForMicrosite(
          bySubdomain.tenantId,
          bySubdomain.brandId,
          bySubdomain.locationId,
          config.menuItems
        );
        return config;
      }

      // 2. Match by custom domain (published only)
      const byDomain = await tx.microsite.findFirst({
        where: {
          published: true,
          customDomain: cleanKey,
        },
        include: { tenant: { select: { slug: true } } },
      });
      if (byDomain) {
        const config = dbRowToConfig(byDomain, byDomain.tenant.slug);
        config.menuItems = await CatalogCompatibilityAdapter.resolveMenuItemsForMicrosite(
          byDomain.tenantId,
          byDomain.brandId,
          byDomain.locationId,
          config.menuItems
        );
        return config;
      }

      return null;
    });
  }

  /**
   * Resolves published microsite identity for visitor pixel attribution.
   */
  static async resolvePublishedMicrosite(subdomainOrHost: string): Promise<{
    id: string;
    tenantId: string;
    tenantSlug: string;
    subdomain: string;
    brandId: string | null;
    locationId: string | null;
  } | null> {
    const cleanKey = subdomainOrHost.toLowerCase().trim().replace(/:\d+$/, '');
    const baseSlug = cleanKey.replace(/-\d+$/, '');

    return TenantContextService.withPublicReadContext(prisma, async (tx) => {
      const site = await tx.microsite.findFirst({
        where: {
          published: true,
          OR: [
            { subdomain: { in: [cleanKey, baseSlug] } },
            { customDomain: cleanKey },
          ],
        },
        include: { tenant: { select: { slug: true } } },
      });

      if (!site) return null;

      return {
        id: site.id,
        tenantId: site.tenantId,
        tenantSlug: site.tenant.slug,
        subdomain: site.subdomain,
        brandId: site.brandId,
        locationId: site.locationId,
      };
    });
  }

  /**
   * Returns all microsites for an authenticated tenant.
   * Enforced within TenantContextService with RLS.
   */
  static async getAllMicrosites(tenantIdOrSlug: string): Promise<MicrositeConfig[]> {
    const tenantId = tenantIdOrSlug.startsWith('tenant_') || tenantIdOrSlug.length > 20
      ? tenantIdOrSlug
      : await resolveTenantId(tenantIdOrSlug);

    if (!tenantId) return [];

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const rows = await tx.microsite.findMany({
        where: { tenantId },
        include: { tenant: { select: { slug: true } } },
        orderBy: { updatedAt: 'desc' },
      });

      return rows.map((r) => dbRowToConfig(r, r.tenant.slug));
    });
  }

  /**
   * Returns an individual microsite for administration under authenticated tenant context.
   */
  static async getMicrositeForAdministration(
    tenantId: string,
    subdomain: string
  ): Promise<MicrositeConfig | null> {
    const cleanKey = subdomain.toLowerCase().trim();

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const row = await tx.microsite.findFirst({
        where: { tenantId, subdomain: cleanKey },
        include: { tenant: { select: { slug: true } } },
      });

      return row ? dbRowToConfig(row, row.tenant.slug) : null;
    });
  }

  /**
   * Creates a new microsite row in the DB under strict tenant context.
   */
  static async createMicrosite(
    tenantIdOrConfig: string | (Partial<MicrositeConfig> & { subdomain: string; tenantSlug: string; brandName: string }),
    maybeConfig?: Partial<MicrositeConfig> & { subdomain: string; tenantSlug: string; brandName: string }
  ): Promise<MicrositeConfig> {
    const isOverload = typeof tenantIdOrConfig === 'string';
    const rawConfig = isOverload ? maybeConfig! : tenantIdOrConfig;

    const tenantId = isOverload
      ? (tenantIdOrConfig as string)
      : await resolveTenantId(rawConfig.tenantSlug);

    if (!tenantId) throw new Error(`Tenant not found for slug: ${rawConfig.tenantSlug}`);

    const normalized = normalizeConfig({
      ...rawConfig,
      subdomain: rawConfig.subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      status: rawConfig.published ? 'PUBLISHED' : 'DRAFT',
      updatedAt: new Date().toISOString(),
    });

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const row = await tx.microsite.upsert({
        where: {
          uq_microsite_subdomain: { tenantId, subdomain: normalized.subdomain },
        },
        create: {
          tenantId,
          subdomain: normalized.subdomain,
          brandId: normalized.brandId ?? null,
          brandName: normalized.brandName,
          locationId: normalized.locationId ?? null,
          locationName: normalized.locationName ?? null,
          tagline: normalized.tagline ?? null,
          aboutStory: normalized.aboutStory ?? null,
          primaryColor: normalized.primaryColor,
          secondaryColor: normalized.secondaryColor ?? null,
          font: normalized.font ?? 'Inter',
          phone: normalized.phone,
          whatsapp: normalized.whatsapp,
          address: normalized.address,
          city: normalized.city,
          state: normalized.state ?? null,
          postalCode: normalized.postalCode ?? null,
          hours: normalized.hours,
          googleRating: normalized.googleRating,
          reviewCount: normalized.reviewCount,
          googleMapsUrl: normalized.googleMapsUrl,
          heroImageUrl: normalized.heroImageUrl,
          menuItems: (normalized.menuItems ?? []) as unknown as Prisma.InputJsonValue,
          published: normalized.published,
          status: normalized.status ?? 'DRAFT',
          customDomain: normalized.customDomain ?? null,
          customDomainStatus: normalized.customDomainStatus ?? 'NOT_CONNECTED',
          industry: normalized.industry ?? null,
          templateId: normalized.templateId ?? 'restaurant',
          theme: (normalized.theme ?? null) as unknown as Prisma.InputJsonValue,
          pages: (normalized.pages ?? DEFAULT_PAGES) as unknown as Prisma.InputJsonValue,
          sections: (normalized.sections ?? []) as unknown as Prisma.InputJsonValue,
          draftData: normalized.draftData != null ? (normalized.draftData as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
          publishedData: normalized.publishedData != null ? (normalized.publishedData as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
          lastPublishedAt: normalized.lastPublishedAt ? new Date(normalized.lastPublishedAt) : null,
          version: normalized.version ?? 1,
        },
        update: {
          brandName: normalized.brandName,
          tagline: normalized.tagline ?? null,
          aboutStory: normalized.aboutStory ?? null,
          primaryColor: normalized.primaryColor,
          secondaryColor: normalized.secondaryColor ?? null,
          font: normalized.font ?? 'Inter',
          phone: normalized.phone,
          whatsapp: normalized.whatsapp,
          address: normalized.address,
          city: normalized.city,
          state: normalized.state ?? null,
          postalCode: normalized.postalCode ?? null,
          hours: normalized.hours,
          googleRating: normalized.googleRating,
          reviewCount: normalized.reviewCount,
          googleMapsUrl: normalized.googleMapsUrl,
          heroImageUrl: normalized.heroImageUrl,
          menuItems: (normalized.menuItems ?? []) as unknown as Prisma.InputJsonValue,
          published: normalized.published,
          status: normalized.status ?? 'DRAFT',
          theme: (normalized.theme ?? null) as unknown as Prisma.InputJsonValue,
          pages: (normalized.pages ?? DEFAULT_PAGES) as unknown as Prisma.InputJsonValue,
          sections: (normalized.sections ?? []) as unknown as Prisma.InputJsonValue,
        },
        include: { tenant: { select: { slug: true } } },
      });

      return dbRowToConfig(row, row.tenant.slug);
    });
  }

  /**
   * Updates an existing microsite configuration under tenant context.
   */
  static async updateMicrosite(
    tenantIdOrSubdomain: string,
    subdomainOrUpdates: string | Partial<MicrositeConfig>,
    maybeUpdates?: Partial<MicrositeConfig>
  ): Promise<MicrositeConfig | null> {
    const isExplicitTenant = maybeUpdates !== undefined;
    const subdomain = isExplicitTenant ? (subdomainOrUpdates as string) : tenantIdOrSubdomain;
    const updates = isExplicitTenant ? maybeUpdates! : (subdomainOrUpdates as Partial<MicrositeConfig>);
    const cleanKey = subdomain.toLowerCase().trim();

    let tenantId = isExplicitTenant ? tenantIdOrSubdomain : '';
    if (!tenantId) {
      // Legacy resolution: look up tenantId from existing microsite
      const existing = await prisma.microsite.findFirst({
        where: { subdomain: cleanKey },
        select: { tenantId: true },
      });
      if (!existing) return null;
      tenantId = existing.tenantId;
    }

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const existing = await tx.microsite.findFirst({
        where: { tenantId, subdomain: cleanKey },
        include: { tenant: { select: { slug: true } } },
      });
      if (!existing) return null;

      const row = await tx.microsite.update({
        where: { id: existing.id },
        data: {
          ...(updates.brandName !== undefined && { brandName: updates.brandName }),
          ...(updates.tagline !== undefined && { tagline: updates.tagline ?? null }),
          ...(updates.aboutStory !== undefined && { aboutStory: updates.aboutStory ?? null }),
          ...(updates.primaryColor !== undefined && { primaryColor: updates.primaryColor }),
          ...(updates.secondaryColor !== undefined && { secondaryColor: updates.secondaryColor ?? null }),
          ...(updates.font !== undefined && { font: updates.font ?? null }),
          ...(updates.phone !== undefined && { phone: updates.phone }),
          ...(updates.whatsapp !== undefined && { whatsapp: updates.whatsapp }),
          ...(updates.address !== undefined && { address: updates.address }),
          ...(updates.city !== undefined && { city: updates.city }),
          ...(updates.state !== undefined && { state: updates.state ?? null }),
          ...(updates.postalCode !== undefined && { postalCode: updates.postalCode ?? null }),
          ...(updates.hours !== undefined && { hours: updates.hours }),
          ...(updates.googleRating !== undefined && { googleRating: updates.googleRating }),
          ...(updates.reviewCount !== undefined && { reviewCount: updates.reviewCount }),
          ...(updates.googleMapsUrl !== undefined && { googleMapsUrl: updates.googleMapsUrl }),
          ...(updates.heroImageUrl !== undefined && { heroImageUrl: updates.heroImageUrl }),
          ...(updates.menuItems !== undefined && { menuItems: updates.menuItems as unknown as Prisma.InputJsonValue }),
          ...(updates.published !== undefined && {
            published: updates.published,
            status: updates.published ? 'PUBLISHED' : 'DRAFT',
          }),
          ...(updates.status !== undefined && { status: updates.status }),
          ...(updates.customDomain !== undefined && { customDomain: updates.customDomain ?? null }),
          ...(updates.customDomainStatus !== undefined && {
            customDomainStatus: updates.customDomainStatus,
          }),
          ...(updates.industry !== undefined && { industry: updates.industry ?? null }),
          ...(updates.templateId !== undefined && { templateId: updates.templateId }),
          ...(updates.theme !== undefined && { theme: updates.theme as unknown as Prisma.InputJsonValue }),
          ...(updates.pages !== undefined && { pages: updates.pages as unknown as Prisma.InputJsonValue }),
          ...(updates.sections !== undefined && { sections: updates.sections as unknown as Prisma.InputJsonValue }),
          ...(updates.draftData !== undefined && { draftData: updates.draftData as unknown as Prisma.InputJsonValue }),
          ...(updates.publishedData !== undefined && {
            publishedData: updates.publishedData as unknown as Prisma.InputJsonValue,
          }),
          ...(updates.lastPublishedAt !== undefined && {
            lastPublishedAt: new Date(updates.lastPublishedAt),
          }),
        },
        include: { tenant: { select: { slug: true } } },
      });

      return dbRowToConfig(row, row.tenant.slug);
    });
  }

  /**
   * Publishes a microsite under tenant context.
   */
  static async publishMicrosite(
    tenantIdOrSubdomain: string,
    maybeSubdomain?: string
  ): Promise<MicrositeConfig | null> {
    const isExplicit = maybeSubdomain !== undefined;
    const subdomain = isExplicit ? maybeSubdomain! : tenantIdOrSubdomain;
    const cleanKey = subdomain.toLowerCase().trim();

    let tenantId = isExplicit ? tenantIdOrSubdomain : '';
    if (!tenantId) {
      const existing = await prisma.microsite.findFirst({
        where: { subdomain: cleanKey },
        select: { tenantId: true },
      });
      if (!existing) return null;
      tenantId = existing.tenantId;
    }

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const existing = await tx.microsite.findFirst({
        where: { tenantId, subdomain: cleanKey },
      });
      if (!existing) return null;

      const now = new Date();
      const row = await tx.microsite.update({
        where: { id: existing.id },
        data: {
          published: true,
          status: 'PUBLISHED',
          publishedData: (existing.draftData ?? existing.publishedData ?? null) as unknown as Prisma.InputJsonValue,
          lastPublishedAt: now,
          version: { increment: 1 },
        },
        include: { tenant: { select: { slug: true } } },
      });

      return dbRowToConfig(row, row.tenant.slug);
    });
  }

  /**
   * Sets microsite to DRAFT under tenant context.
   */
  static async unpublishMicrosite(
    tenantIdOrSubdomain: string,
    maybeSubdomain?: string
  ): Promise<MicrositeConfig | null> {
    const isExplicit = maybeSubdomain !== undefined;
    const subdomain = isExplicit ? maybeSubdomain! : tenantIdOrSubdomain;
    const cleanKey = subdomain.toLowerCase().trim();

    let tenantId = isExplicit ? tenantIdOrSubdomain : '';
    if (!tenantId) {
      const existing = await prisma.microsite.findFirst({
        where: { subdomain: cleanKey },
        select: { tenantId: true },
      });
      if (!existing) return null;
      tenantId = existing.tenantId;
    }

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const existing = await tx.microsite.findFirst({
        where: { tenantId, subdomain: cleanKey },
      });
      if (!existing) return null;

      const row = await tx.microsite.update({
        where: { id: existing.id },
        data: { published: false, status: 'DRAFT' },
        include: { tenant: { select: { slug: true } } },
      });

      return dbRowToConfig(row, row.tenant.slug);
    });
  }

  /**
   * Connects custom domain under tenant context.
   */
  static async connectCustomDomain(
    tenantIdOrSubdomain: string,
    subdomainOrCustomDomain: string,
    maybeCustomDomain?: string
  ): Promise<MicrositeConfig | null> {
    const isExplicit = maybeCustomDomain !== undefined;
    const tenantId = isExplicit ? tenantIdOrSubdomain : undefined;
    const subdomain = isExplicit ? subdomainOrCustomDomain : tenantIdOrSubdomain;
    const customDomain = isExplicit ? maybeCustomDomain! : subdomainOrCustomDomain;

    const cleanDomain = customDomain
      .toLowerCase()
      .trim()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '');

    if (tenantId) {
      return this.updateMicrosite(tenantId, subdomain, {
        customDomain: cleanDomain,
        customDomainStatus: 'CONNECTED',
      });
    }

    return this.updateMicrosite(subdomain, {
      customDomain: cleanDomain,
      customDomainStatus: 'CONNECTED',
    });
  }

  /**
   * Deletes a microsite under tenant context.
   */
  static async deleteMicrosite(
    tenantIdOrSubdomain: string,
    maybeSubdomain?: string
  ): Promise<boolean> {
    const isExplicit = maybeSubdomain !== undefined;
    const subdomain = isExplicit ? maybeSubdomain! : tenantIdOrSubdomain;
    const cleanKey = subdomain.toLowerCase().trim();

    let tenantId = isExplicit ? tenantIdOrSubdomain : '';
    if (!tenantId) {
      const existing = await prisma.microsite.findFirst({
        where: { subdomain: cleanKey },
        select: { tenantId: true },
      });
      if (!existing) return false;
      tenantId = existing.tenantId;
    }

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const existing = await tx.microsite.findFirst({
        where: { tenantId, subdomain: cleanKey },
      });
      if (!existing) return false;

      await tx.microsite.delete({ where: { id: existing.id } });
      return true;
    });
  }
}
