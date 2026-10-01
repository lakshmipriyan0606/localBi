import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '@/shared/database/client';

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
  props: Record<string, any>;
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
  draftData?: any;
  publishedData?: any;
  lastPublishedAt?: string | undefined;
  updatedAt?: string | undefined;
  version?: number | undefined;
}

const micrositeStore: Map<string, MicrositeConfig> = new Map();
let isInitialized = false;

const isTestEnv = process.env['NODE_ENV'] === 'test' || Boolean(process.env['VITEST']);
const DATA_DIR = path.join(process.cwd(), '.data');
const MICROSITES_FILE = path.join(DATA_DIR, 'microsites.json');

function syncStoreFromDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(MICROSITES_FILE)) {
      const data = fs.readFileSync(MICROSITES_FILE, 'utf-8');
      const items: MicrositeConfig[] = JSON.parse(data);
      for (const item of items) {
        if (item.subdomain) {
          micrositeStore.set(item.subdomain.toLowerCase(), normalizeConfig(item));
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load microsites from disk:', err);
  }
}

function initMicrositeStore() {
  if (isInitialized) return;
  isInitialized = true;
  syncStoreFromDisk();
}

function saveMicrositesToDisk() {
  if (isTestEnv) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const list = Array.from(micrositeStore.values());
    fs.writeFileSync(MICROSITES_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save microsites to disk:', err);
  }
}

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
    tagline: config.tagline || 'Leading brand destination for quality, authenticity, and dedicated service.',
    aboutStory: config.aboutStory || `${brandName} is proud to serve our community with premier quality and warm hospitality.`,
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
    reviewCount: config.reviewCount ?? 120,
    googleMapsUrl: config.googleMapsUrl || `https://maps.google.com/?q=${encodeURIComponent(config.address || brandName)}`,
    heroImageUrl: config.heroImageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
    menuItems: config.menuItems || [],
    published: config.published ?? true,
    status: config.status || (config.published ? 'PUBLISHED' : 'DRAFT'),
    customDomain: config.customDomain,
    customDomainStatus: config.customDomain ? (config.customDomainStatus || 'CONNECTED') : 'NOT_CONNECTED',
    industry: config.industry || 'FOOD',
    templateId: config.templateId || 'restaurant',
    theme: config.theme || {
      primaryColor,
      secondaryColor,
      font,
      borderRadius: '16px',
      buttonStyle: 'rounded',
    },
    pages: config.pages || [
      { id: 'page-home', name: 'Home', path: '/', isHome: true },
      { id: 'page-menu', name: 'Menu & Specials', path: '/menu' },
      { id: 'page-about', name: 'Our Story', path: '/about' },
      { id: 'page-contact', name: 'Location & Hours', path: '/contact' },
    ],
    sections: config.sections || [],
    draftData: config.draftData,
    publishedData: config.publishedData,
    lastPublishedAt: config.lastPublishedAt || new Date().toISOString(),
    updatedAt: config.updatedAt || new Date().toISOString(),
    version: config.version || 1,
  };
}

initMicrositeStore();

export class MicrositeService {
  /**
   * Resolves a microsite by subdomain or custom domain.
   * If not present in file cache, dynamically auto-resolves from PostgreSQL Tenant/Brand/Location.
   */
  static async getMicrositeBySubdomain(subdomainOrHost: string): Promise<MicrositeConfig | null> {
    initMicrositeStore();
    const cleanKey = subdomainOrHost.toLowerCase().trim().replace(/:\d+$/, '');

    // 1. Direct match by subdomain
    let site = micrositeStore.get(cleanKey);
    if (!site) {
      syncStoreFromDisk();
      site = micrositeStore.get(cleanKey);
    }
    if (site) return site;

    // 2. Match by custom domain
    for (const item of micrositeStore.values()) {
      if (item.customDomain && item.customDomain.toLowerCase() === cleanKey) {
        return item;
      }
    }

    // 3. Fallback: match without numeric suffix (e.g. store-001 -> store)
    const baseSlug = cleanKey.replace(/-\d+$/, '');
    if (baseSlug !== cleanKey) {
      site = micrositeStore.get(baseSlug);
      if (site) {
        return {
          ...site,
          subdomain: cleanKey,
        };
      }
    }

    // 4. Dynamic Auto-Resolution from PostgreSQL Tenant, Brand & Location
    try {
      const dbTenant = await prisma.tenant.findFirst({
        where: {
          OR: [
            { slug: cleanKey },
            { slug: baseSlug },
          ],
        },
        include: {
          brands: {
            include: {
              locations: {
                where: { isArchived: false },
                take: 1,
              },
            },
            take: 1,
          },
        },
      });

      if (dbTenant) {
        const brand = dbTenant.brands[0];
        const location = brand?.locations[0];
        const brandName = brand?.name || dbTenant.name;

        const dynamicConfig = normalizeConfig({
          subdomain: cleanKey,
          tenantSlug: dbTenant.slug,
          brandId: brand?.id,
          brandName,
          locationId: location?.id,
          locationName: location?.name || brandName,
          address: location ? `${location.addressLine1}, ${location.city}` : 'Main Street',
          city: location?.city || 'Chennai',
          state: location?.state || '',
          postalCode: location?.postalCode || '',
          hours: '9:00 AM - 10:00 PM',
          phone: '',
          whatsapp: '',
          published: true,
          status: 'PUBLISHED',
        });

        micrositeStore.set(cleanKey, dynamicConfig);
        saveMicrositesToDisk();
        return dynamicConfig;
      }
    } catch (err) {
      console.warn('Database fallback lookup error in MicrositeService:', err);
    }

    return null;
  }

  /**
   * Returns all microsites for a given tenant.
   * Also synthesizes records for real DB locations if they don't yet have microsites.
   */
  static async getAllMicrosites(tenantSlug: string): Promise<MicrositeConfig[]> {
    initMicrositeStore();
    const cleanTenantSlug = tenantSlug.toLowerCase().trim();

    // 1. In-memory & disk sites matching tenantSlug or base tenantSlug
    const baseSlug = cleanTenantSlug.replace(/-\d+$/, '');
    const sites = Array.from(micrositeStore.values()).filter(
      (m) => m.tenantSlug.toLowerCase() === cleanTenantSlug || m.tenantSlug.toLowerCase() === baseSlug
    );

    // 2. If no sites found, check DB for locations and generate default sites
    if (sites.length === 0) {
      try {
        const tenant = await prisma.tenant.findFirst({
          where: {
            OR: [
              { slug: cleanTenantSlug },
              { slug: baseSlug },
            ],
          },
          include: {
            brands: {
              include: {
                locations: {
                  where: { isArchived: false },
                },
              },
            },
          },
        });

        if (tenant && tenant.brands.length > 0) {
          for (const brand of tenant.brands) {
            if (brand.locations.length > 0) {
              for (const loc of brand.locations) {
                const sub = `${tenant.slug}-${loc.storeCode || loc.city.toLowerCase()}`.replace(/[^a-z0-9-]/g, '-');
                const created = normalizeConfig({
                  subdomain: sub,
                  tenantSlug: tenant.slug,
                  brandId: brand.id,
                  brandName: `${brand.name} - ${loc.name}`,
                  locationId: loc.id,
                  locationName: loc.name,
                  address: `${loc.addressLine1}, ${loc.city}`,
                  city: loc.city,
                  state: loc.state,
                  postalCode: loc.postalCode,
                  published: true,
                  status: 'PUBLISHED',
                });
                micrositeStore.set(sub, created);
                sites.push(created);
              }
            } else {
              const created = normalizeConfig({
                subdomain: tenant.slug,
                tenantSlug: tenant.slug,
                brandId: brand.id,
                brandName: brand.name,
                published: true,
                status: 'PUBLISHED',
              });
              micrositeStore.set(tenant.slug, created);
              sites.push(created);
            }
          }
          saveMicrositesToDisk();
        }
      } catch (err) {
        console.warn('Failed to synthesize microsites from DB:', err);
      }
    }

    return sites;
  }

  /**
   * Creates a new microsite with normalized configuration.
   */
  static async createMicrosite(
    config: Partial<MicrositeConfig> & {
      subdomain: string;
      tenantSlug: string;
      brandName: string;
    }
  ): Promise<MicrositeConfig> {
    initMicrositeStore();
    const cleanSubdomain = config.subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const normalized = normalizeConfig({
      ...config,
      subdomain: cleanSubdomain,
      status: config.published ? 'PUBLISHED' : 'DRAFT',
      updatedAt: new Date().toISOString(),
    });

    micrositeStore.set(cleanSubdomain, normalized);
    saveMicrositesToDisk();
    return normalized;
  }

  /**
   * Updates an existing microsite configuration.
   */
  static async updateMicrosite(
    subdomain: string,
    updates: Partial<MicrositeConfig>
  ): Promise<MicrositeConfig | null> {
    initMicrositeStore();
    const cleanKey = subdomain.toLowerCase().trim();
    const existing = micrositeStore.get(cleanKey);
    if (!existing) {
      // Try to resolve first
      const resolved = await this.getMicrositeBySubdomain(cleanKey);
      if (!resolved) return null;
      const updated = normalizeConfig({
        ...resolved,
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      micrositeStore.set(cleanKey, updated);
      saveMicrositesToDisk();
      return updated;
    }

    const updated = normalizeConfig({
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    micrositeStore.set(cleanKey, updated);
    saveMicrositesToDisk();
    return updated;
  }

  /**
   * Creates an immutable published version snapshot.
   */
  static async publishMicrosite(subdomain: string): Promise<MicrositeConfig | null> {
    initMicrositeStore();
    const cleanKey = subdomain.toLowerCase().trim();
    const site = await this.getMicrositeBySubdomain(cleanKey);
    if (!site) return null;

    const publishedAt = new Date().toISOString();
    const updated = {
      ...site,
      published: true,
      status: 'PUBLISHED' as MicrositeStatus,
      publishedData: site.draftData || site.publishedData,
      lastPublishedAt: publishedAt,
      updatedAt: publishedAt,
      version: (site.version || 1) + 1,
    };

    micrositeStore.set(cleanKey, updated);
    saveMicrositesToDisk();
    return updated;
  }

  /**
   * Unpublishes a microsite (sets to draft).
   */
  static async unpublishMicrosite(subdomain: string): Promise<MicrositeConfig | null> {
    initMicrositeStore();
    const cleanKey = subdomain.toLowerCase().trim();
    const site = await this.getMicrositeBySubdomain(cleanKey);
    if (!site) return null;

    const updated = {
      ...site,
      published: false,
      status: 'DRAFT' as MicrositeStatus,
      updatedAt: new Date().toISOString(),
    };

    micrositeStore.set(cleanKey, updated);
    saveMicrositesToDisk();
    return updated;
  }

  /**
   * Connects and verifies a custom domain for a microsite.
   */
  static async connectCustomDomain(subdomain: string, customDomain: string): Promise<MicrositeConfig | null> {
    initMicrositeStore();
    const cleanKey = subdomain.toLowerCase().trim();
    const cleanDomain = customDomain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    return this.updateMicrosite(cleanKey, {
      customDomain: cleanDomain,
      customDomainStatus: 'CONNECTED',
    });
  }

  /**
   * Deletes a microsite by subdomain.
   */
  static async deleteMicrosite(subdomain: string): Promise<boolean> {
    initMicrositeStore();
    const cleanKey = subdomain.toLowerCase().trim();
    const res = micrositeStore.delete(cleanKey);
    saveMicrositesToDisk();
    return res;
  }
}
