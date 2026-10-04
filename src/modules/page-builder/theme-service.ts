import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { createValidationError } from '@/shared/errors';

export interface BrandThemeDto {
  id: string;
  tenantId: string;
  brandId: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontHeading: string;
  fontBody: string;
  buttonRadius: string;
  cardRadius: string;
  customCss: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertThemeInput {
  primaryColor?: string | undefined;
  secondaryColor?: string | undefined;
  accentColor?: string | undefined;
  backgroundColor?: string | undefined;
  textColor?: string | undefined;
  fontHeading?: string | undefined;
  fontBody?: string | undefined;
  buttonRadius?: string | undefined;
  cardRadius?: string | undefined;
  customCss?: string | null | undefined;
}

export const DEFAULT_THEME_VALUES = {
  primaryColor: '#4F46E5',
  secondaryColor: '#0F172A',
  accentColor: '#F59E0B',
  backgroundColor: '#FFFFFF',
  textColor: '#0F172A',
  fontHeading: 'Inter, sans-serif',
  fontBody: 'Inter, sans-serif',
  buttonRadius: '0.5rem',
  cardRadius: '0.75rem',
};

// Safe color validation regex: allows hex, rgb, rgba, hsl, hsla
const SAFE_COLOR_REGEX = /^(#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)|hsl\(\s*\d+\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*\)|hsla\(\s*\d+\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*,\s*[\d.]+\s*\))$/;

// Safe CSS dimension regex: e.g. 0.5rem, 8px, 0.75em, 0
const SAFE_DIMENSION_REGEX = /^(0|0px|0rem|0em|\d+(\.\d+)?(px|rem|em|%))$/;

function sanitizeColor(val: string | undefined, defaultVal: string): string {
  if (!val) return defaultVal;
  const trimmed = val.trim();
  if (!SAFE_COLOR_REGEX.test(trimmed)) {
    throw createValidationError(`Invalid color format: "${val}". Must be hex, rgb, or hsl.`);
  }
  return trimmed;
}

function sanitizeDimension(val: string | undefined, defaultVal: string): string {
  if (!val) return defaultVal;
  const trimmed = val.trim();
  if (!SAFE_DIMENSION_REGEX.test(trimmed)) {
    throw createValidationError(`Invalid dimension format: "${val}". Must be e.g. "0.5rem" or "8px".`);
  }
  return trimmed;
}

function sanitizeFont(val: string | undefined, defaultVal: string): string {
  if (!val) return defaultVal;
  const trimmed = val.trim();
  // Strip dangerous characters to prevent style breakout
  const sanitized = trimmed.replace(/[<>"';{}]/g, '');
  if (!sanitized) return defaultVal;
  return sanitized;
}

function sanitizeCustomCss(css: string | null | undefined): string | null {
  if (!css) return null;
  // Disallow script, url(javascript:), expression, import to prevent XSS
  const lower = css.toLowerCase();
  if (
    lower.includes('<script') ||
    lower.includes('javascript:') ||
    lower.includes('expression(') ||
    lower.includes('@import') ||
    lower.includes('behavior:')
  ) {
    throw createValidationError('Custom CSS contains forbidden expressions or scripts.');
  }
  return css.trim();
}

export class ThemeService {
  /**
   * Retrieves the BrandTheme for a given brand under authenticated tenant context.
   * If none exists yet, returns virtual default theme tokens.
   */
  public static async getThemeForBrand(
    tenantId: string,
    brandId: string
  ): Promise<BrandThemeDto> {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const theme = await tx.brandTheme.findFirst({
        where: { tenantId, brandId },
      });

      if (!theme) {
        return {
          id: `theme-default-${brandId}`,
          tenantId,
          brandId,
          ...DEFAULT_THEME_VALUES,
          customCss: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      return {
        id: theme.id,
        tenantId: theme.tenantId,
        brandId: theme.brandId,
        primaryColor: theme.primaryColor,
        secondaryColor: theme.secondaryColor,
        accentColor: theme.accentColor,
        backgroundColor: theme.backgroundColor,
        textColor: theme.textColor,
        fontHeading: theme.fontHeading,
        fontBody: theme.fontBody,
        buttonRadius: theme.buttonRadius,
        cardRadius: theme.cardRadius,
        customCss: theme.customCss,
        createdAt: theme.createdAt,
        updatedAt: theme.updatedAt,
      };
    });
  }

  /**
   * Upserts the BrandTheme for a given brand under authenticated tenant context.
   */
  public static async upsertThemeForBrand(
    tenantId: string,
    brandId: string,
    input: UpsertThemeInput
  ): Promise<BrandThemeDto> {
    const primaryColor = sanitizeColor(input.primaryColor, DEFAULT_THEME_VALUES.primaryColor);
    const secondaryColor = sanitizeColor(input.secondaryColor, DEFAULT_THEME_VALUES.secondaryColor);
    const accentColor = sanitizeColor(input.accentColor, DEFAULT_THEME_VALUES.accentColor);
    const backgroundColor = sanitizeColor(input.backgroundColor, DEFAULT_THEME_VALUES.backgroundColor);
    const textColor = sanitizeColor(input.textColor, DEFAULT_THEME_VALUES.textColor);
    const fontHeading = sanitizeFont(input.fontHeading, DEFAULT_THEME_VALUES.fontHeading);
    const fontBody = sanitizeFont(input.fontBody, DEFAULT_THEME_VALUES.fontBody);
    const buttonRadius = sanitizeDimension(input.buttonRadius, DEFAULT_THEME_VALUES.buttonRadius);
    const cardRadius = sanitizeDimension(input.cardRadius, DEFAULT_THEME_VALUES.cardRadius);
    const customCss = sanitizeCustomCss(input.customCss);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // Verify brand belongs to tenant
      const brand = await tx.brand.findFirst({
        where: { id: brandId, tenantId },
      });
      if (!brand) {
        throw createValidationError(`Brand ${brandId} not found under tenant.`);
      }

      const theme = await tx.brandTheme.upsert({
        where: { brandId },
        create: {
          tenantId,
          brandId,
          primaryColor,
          secondaryColor,
          accentColor,
          backgroundColor,
          textColor,
          fontHeading,
          fontBody,
          buttonRadius,
          cardRadius,
          customCss,
        },
        update: {
          ...(input.primaryColor !== undefined && { primaryColor }),
          ...(input.secondaryColor !== undefined && { secondaryColor }),
          ...(input.accentColor !== undefined && { accentColor }),
          ...(input.backgroundColor !== undefined && { backgroundColor }),
          ...(input.textColor !== undefined && { textColor }),
          ...(input.fontHeading !== undefined && { fontHeading }),
          ...(input.fontBody !== undefined && { fontBody }),
          ...(input.buttonRadius !== undefined && { buttonRadius }),
          ...(input.cardRadius !== undefined && { cardRadius }),
          ...(input.customCss !== undefined && { customCss }),
        },
      });

      return {
        id: theme.id,
        tenantId: theme.tenantId,
        brandId: theme.brandId,
        primaryColor: theme.primaryColor,
        secondaryColor: theme.secondaryColor,
        accentColor: theme.accentColor,
        backgroundColor: theme.backgroundColor,
        textColor: theme.textColor,
        fontHeading: theme.fontHeading,
        fontBody: theme.fontBody,
        buttonRadius: theme.buttonRadius,
        cardRadius: theme.cardRadius,
        customCss: theme.customCss,
        createdAt: theme.createdAt,
        updatedAt: theme.updatedAt,
      };
    });
  }

  /**
   * Generates safe CSS variable map for server-side HTML/JSX injection.
   */
  public static generateCssVariables(theme: BrandThemeDto): Record<string, string> {
    return {
      '--brand-primary': theme.primaryColor,
      '--brand-secondary': theme.secondaryColor,
      '--brand-accent': theme.accentColor,
      '--brand-bg': theme.backgroundColor,
      '--brand-text': theme.textColor,
      '--brand-font-heading': theme.fontHeading,
      '--brand-font-body': theme.fontBody,
      '--brand-button-radius': theme.buttonRadius,
      '--brand-card-radius': theme.cardRadius,
    };
  }

  /**
   * Generates a safe CSS text block to inject into <style> tags on SSR pages.
   */
  public static generateCssBlock(theme: BrandThemeDto): string {
    const vars = this.generateCssVariables(theme);
    const varLines = Object.entries(vars)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join('\n');

    let block = `:root {\n${varLines}\n}\n`;
    if (theme.customCss) {
      block += `\n/* Brand Custom CSS */\n${theme.customCss}\n`;
    }
    return block;
  }
}
