import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { createValidationError } from '@/shared/errors';

export type NavItemType = 'INTERNAL_PAGE' | 'STORE' | 'CATEGORY' | 'PRODUCT' | 'EXTERNAL_URL';

export interface NavItem {
  id: string;
  label: string;
  type: NavItemType;
  target: string;
  order: number;
  openInNewTab?: boolean | undefined;
}

export interface SiteNavigationDto {
  headerItems: NavItem[];
  footerItems: NavItem[];
}

export const DEFAULT_SITE_NAVIGATION: SiteNavigationDto = {
  headerItems: [
    { id: 'nav-home', label: 'Home', type: 'INTERNAL_PAGE', target: '/', order: 0 },
    { id: 'nav-stores', label: 'Locations', type: 'INTERNAL_PAGE', target: '/locations', order: 1 },
    { id: 'nav-products', label: 'Catalog', type: 'INTERNAL_PAGE', target: '/products', order: 2 },
    { id: 'nav-contact', label: 'Contact', type: 'INTERNAL_PAGE', target: '/contact', order: 3 },
  ],
  footerItems: [
    { id: 'nav-foot-home', label: 'Overview', type: 'INTERNAL_PAGE', target: '/', order: 0 },
    { id: 'nav-foot-stores', label: 'Store Finder', type: 'INTERNAL_PAGE', target: '/locations', order: 1 },
    { id: 'nav-foot-privacy', label: 'Privacy Policy', type: 'INTERNAL_PAGE', target: '/privacy', order: 2 },
    { id: 'nav-foot-terms', label: 'Terms & Conditions', type: 'INTERNAL_PAGE', target: '/terms', order: 3 },
  ],
};

const DISALLOWED_SCHEMES = ['javascript:', 'data:', 'vbscript:'];

export class NavigationService {
  /**
   * Validates a single navigation target for security and formatting.
   */
  public static validateNavItem(item: Partial<NavItem>): NavItem {
    if (!item.label || typeof item.label !== 'string' || item.label.trim().length === 0) {
      throw createValidationError('Navigation item requires a non-empty label.');
    }
    const label = item.label.trim().substring(0, 60);

    const type: NavItemType = item.type || 'INTERNAL_PAGE';
    const rawTarget = (item.target || '').trim();

    if (!rawTarget) {
      throw createValidationError(`Navigation item "${label}" requires a target URL or path.`);
    }

    const lowerTarget = rawTarget.toLowerCase();
    for (const scheme of DISALLOWED_SCHEMES) {
      if (lowerTarget.includes(scheme)) {
        throw createValidationError(`Prohibited URL scheme detected in navigation target "${rawTarget}".`);
      }
    }

    let target = rawTarget;
    if (type === 'EXTERNAL_URL') {
      try {
        const parsed = new URL(rawTarget);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          throw createValidationError(`External navigation link "${rawTarget}" must use HTTP or HTTPS.`);
        }
        target = parsed.toString();
      } catch {
        throw createValidationError(`Invalid external URL: "${rawTarget}".`);
      }
    } else {
      // Internal page, store, category, or product
      if (!target.startsWith('/')) {
        target = `/${target}`;
      }
      // Strip dangerous characters
      if (/[<>"']/.test(target)) {
        throw createValidationError(`Navigation target contains invalid characters: "${target}".`);
      }
    }

    return {
      id: item.id || `nav-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      label,
      type,
      target,
      order: typeof item.order === 'number' ? item.order : 0,
      openInNewTab: Boolean(item.openInNewTab),
    };
  }

  /**
   * Retrieves navigation configuration for a given web surface.
   */
  public static async getNavigation(
    tenantId: string,
    webSurfaceId: string
  ): Promise<SiteNavigationDto> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // Find the HOME template for this web surface
      const homeTemplate = await tx.pageTemplate.findFirst({
        where: {
          tenantId,
          webSurfaceId,
          type: 'HOME',
        },
        include: {
          versions: {
            orderBy: { version: 'desc' },
            take: 1,
          },
        },
      });

      const puckData = homeTemplate?.versions[0]?.puckData as any;
      const rootNavigation = puckData?.root?.props?.navigation;

      if (
        rootNavigation &&
        Array.isArray(rootNavigation.headerItems) &&
        Array.isArray(rootNavigation.footerItems)
      ) {
        return {
          headerItems: rootNavigation.headerItems.map((i: any) => this.validateNavItem(i)),
          footerItems: rootNavigation.footerItems.map((i: any) => this.validateNavItem(i)),
        };
      }

      return DEFAULT_SITE_NAVIGATION;
    });
  }

  /**
   * Saves navigation items to the web surface HOME template root configuration.
   */
  public static async saveNavigation(
    tenantId: string,
    webSurfaceId: string,
    navigation: SiteNavigationDto
  ): Promise<SiteNavigationDto> {
    const validatedHeader = (navigation.headerItems || []).map((item, idx) =>
      this.validateNavItem({ ...item, order: idx })
    );
    const validatedFooter = (navigation.footerItems || []).map((item, idx) =>
      this.validateNavItem({ ...item, order: idx })
    );

    const cleanNavigation: SiteNavigationDto = {
      headerItems: validatedHeader,
      footerItems: validatedFooter,
    };

    await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // Ensure HOME template exists
      let homeTemplate = await tx.pageTemplate.findFirst({
        where: { tenantId, webSurfaceId, type: 'HOME' },
        include: {
          versions: {
            orderBy: { version: 'desc' },
            take: 1,
          },
        },
      });

      if (!homeTemplate) {
        // Find brand for this webSurface
        const surface = await tx.webSurface.findUniqueOrThrow({
          where: { id: webSurfaceId },
        });

        homeTemplate = await tx.pageTemplate.create({
          data: {
            tenantId,
            brandId: surface.brandId,
            webSurfaceId,
            name: 'Home Template',
            type: 'HOME',
          },
          include: {
            versions: true,
          },
        });
      }

      const latestVersion = homeTemplate.versions[0];
      const currentPuckData = (latestVersion?.puckData as any) || { content: [], root: { props: {} } };

      const updatedPuckData = {
        ...currentPuckData,
        root: {
          ...(currentPuckData.root || {}),
          props: {
            ...(currentPuckData.root?.props || {}),
            navigation: cleanNavigation,
          },
        },
      };

      if (latestVersion && latestVersion.status === 'DRAFT') {
        await tx.pageTemplateVersion.update({
          where: { id: latestVersion.id },
          data: { puckData: updatedPuckData },
        });
      } else {
        const nextVersionNum = latestVersion ? latestVersion.version + 1 : 1;
        await tx.pageTemplateVersion.create({
          data: {
            tenantId,
            pageTemplateId: homeTemplate.id,
            version: nextVersionNum,
            puckData: updatedPuckData,
            status: 'DRAFT',
          },
        });
      }
    });

    return cleanNavigation;
  }
}
