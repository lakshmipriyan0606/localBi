import { prisma } from '../../shared/database/client';
import { TenantContextService } from '../../shared/database/tenant-context';
import {
  AuthorizedContext,
  AuthorizationService,
  Action,
} from '../../shared/authorization/policy';
import {
  createValidationError,
  createTenantAccessDeniedError,
} from '../../shared/errors';
import { logger } from '../../shared/observability/logger';
import { WhiteLabelConfigDto, UpdateWhiteLabelInput } from './agency-types';

const DEFAULT_WHITE_LABEL: Omit<WhiteLabelConfigDto, 'tenantId'> = {
  enabled: false,
  portalName: 'LocalBi',
  companyLegalName: null,
  logoUrl: null,
  faviconUrl: null,
  primaryColor: '#4F46E5',
  secondaryColor: '#0F172A',
  accentColor: '#F59E0B',
  supportEmail: null,
  supportUrl: null,
  hideLocalBiBranding: false,
  customCss: null,
  portalDomain: null,
};

export class WhiteLabelService {
  /**
   * Validates color tokens to prevent malicious CSS injection.
   */
  public static validateColor(color: string, fieldName: string): void {
    const hexRegex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
    const hslRegex = /^hsl\(\s*\d+(\.\d+)?\s*,\s*\d+(\.\d+)?%\s*,\s*\d+(\.\d+)?%\s*\)$/i;
    const rgbRegex = /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i;

    if (!hexRegex.test(color) && !hslRegex.test(color) && !rgbRegex.test(color)) {
      throw createValidationError(`Invalid color format for ${fieldName}: must be valid HEX, HSL, or RGB.`);
    }
  }

  /**
   * Validates URL protocols to prevent XSS (e.g. javascript:).
   */
  public static validateSafeUrl(url: string | null | undefined, fieldName: string): void {
    if (!url) return;
    const trimmed = url.trim().toLowerCase();
    if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:') || trimmed.startsWith('vbscript:')) {
      throw createValidationError(`Insecure URL protocol provided for ${fieldName}`);
    }
  }

  /**
   * Retrieves white-label configuration for a tenant with safe defaults.
   */
  public static async getWhiteLabelConfig(tenantId: string): Promise<WhiteLabelConfigDto> {
    const config = await prisma.whiteLabelConfig.findUnique({
      where: { tenantId },
      include: {
        portalDomain: {
          select: {
            id: true,
            hostname: true,
            status: true,
            sslStatus: true,
          },
        },
      },
    });

    if (!config) {
      return {
        tenantId,
        ...DEFAULT_WHITE_LABEL,
      };
    }

    return {
      id: config.id,
      tenantId: config.tenantId,
      enabled: config.enabled,
      portalName: config.portalName,
      companyLegalName: config.companyLegalName,
      logoUrl: config.logoUrl,
      faviconUrl: config.faviconUrl,
      primaryColor: config.primaryColor,
      secondaryColor: config.secondaryColor,
      accentColor: config.accentColor,
      supportEmail: config.supportEmail,
      supportUrl: config.supportUrl,
      hideLocalBiBranding: config.hideLocalBiBranding,
      customCss: config.customCss,
      portalDomain: config.portalDomain,
    };
  }

  /**
   * Updates white-label portal configuration for an agency tenant.
   */
  public static async updateWhiteLabelConfig(
    tenantId: string,
    input: UpdateWhiteLabelInput,
    context: AuthorizedContext
  ): Promise<WhiteLabelConfigDto> {
    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }
    AuthorizationService.assertCan(context, Action.WHITELABEL_MANAGE);

    // Validate inputs
    if (input.primaryColor) this.validateColor(input.primaryColor, 'primaryColor');
    if (input.secondaryColor) this.validateColor(input.secondaryColor, 'secondaryColor');
    if (input.accentColor) this.validateColor(input.accentColor, 'accentColor');
    this.validateSafeUrl(input.logoUrl, 'logoUrl');
    this.validateSafeUrl(input.faviconUrl, 'faviconUrl');
    this.validateSafeUrl(input.supportUrl, 'supportUrl');

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const config = await tx.whiteLabelConfig.upsert({
        where: { tenantId },
        create: {
          tenantId,
          enabled: input.enabled ?? true,
          portalName: input.portalName?.trim() || 'LocalBi',
          companyLegalName: input.companyLegalName?.trim() || null,
          logoUrl: input.logoUrl?.trim() || null,
          faviconUrl: input.faviconUrl?.trim() || null,
          primaryColor: input.primaryColor || '#4F46E5',
          secondaryColor: input.secondaryColor || '#0F172A',
          accentColor: input.accentColor || '#F59E0B',
          supportEmail: input.supportEmail?.trim().toLowerCase() || null,
          supportUrl: input.supportUrl?.trim() || null,
          hideLocalBiBranding: input.hideLocalBiBranding ?? false,
          customCss: input.customCss || null,
        },
        update: {
          ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
          ...(input.portalName !== undefined ? { portalName: input.portalName.trim() } : {}),
          ...(input.companyLegalName !== undefined ? { companyLegalName: input.companyLegalName?.trim() || null } : {}),
          ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl?.trim() || null } : {}),
          ...(input.faviconUrl !== undefined ? { faviconUrl: input.faviconUrl?.trim() || null } : {}),
          ...(input.primaryColor !== undefined ? { primaryColor: input.primaryColor } : {}),
          ...(input.secondaryColor !== undefined ? { secondaryColor: input.secondaryColor } : {}),
          ...(input.accentColor !== undefined ? { accentColor: input.accentColor } : {}),
          ...(input.supportEmail !== undefined ? { supportEmail: input.supportEmail?.trim().toLowerCase() || null } : {}),
          ...(input.supportUrl !== undefined ? { supportUrl: input.supportUrl?.trim() || null } : {}),
          ...(input.hideLocalBiBranding !== undefined ? { hideLocalBiBranding: input.hideLocalBiBranding } : {}),
          ...(input.customCss !== undefined ? { customCss: input.customCss } : {}),
        },
        include: {
          portalDomain: {
            select: {
              id: true,
              hostname: true,
              status: true,
              sslStatus: true,
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: context.userId,
          actorRole: context.role,
          action: 'whitelabel:update',
          resourceType: 'WhiteLabelConfig',
          resourceId: config.id,
          payload: input as Record<string, unknown>,
        },
      });

      logger.info({ tenantId, enabled: config.enabled }, 'White-label configuration updated');

      return {
        id: config.id,
        tenantId: config.tenantId,
        enabled: config.enabled,
        portalName: config.portalName,
        companyLegalName: config.companyLegalName,
        logoUrl: config.logoUrl,
        faviconUrl: config.faviconUrl,
        primaryColor: config.primaryColor,
        secondaryColor: config.secondaryColor,
        accentColor: config.accentColor,
        supportEmail: config.supportEmail,
        supportUrl: config.supportUrl,
        hideLocalBiBranding: config.hideLocalBiBranding,
        customCss: config.customCss,
        portalDomain: config.portalDomain,
      };
    });
  }

  /**
   * Resolves white-label portal branding by hostname (custom portal domain).
   */
  public static async resolveByHostname(hostname: string): Promise<{
    tenant: { id: string; name: string; slug: string };
    branding: WhiteLabelConfigDto;
  } | null> {
    const cleanHost = hostname.trim().toLowerCase().split(':')[0];

    const portalDomain = await prisma.portalDomain.findUnique({
      where: { hostname: cleanHost },
      include: {
        tenant: { select: { id: true, name: true, slug: true, status: true } },
      },
    });

    if (!portalDomain || portalDomain.status !== 'ACTIVE' || portalDomain.tenant.status !== 'ACTIVE') {
      return null;
    }

    const branding = await this.getWhiteLabelConfig(portalDomain.tenant.id);

    return {
      tenant: {
        id: portalDomain.tenant.id,
        name: portalDomain.tenant.name,
        slug: portalDomain.tenant.slug,
      },
      branding,
    };
  }
}
