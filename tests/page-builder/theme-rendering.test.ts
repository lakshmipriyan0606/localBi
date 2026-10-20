import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import { prisma } from '@/shared/database/client';
import { TenantService } from '@/modules/tenancy/tenant-service';
import { BrandService } from '@/modules/brands/brand-service';
import { Role, ScopeMode, AuthorizedContext } from '@/shared/authorization/policy';
import { ThemeService, DEFAULT_THEME_VALUES, BrandThemeDto } from '@/modules/page-builder/theme-service';
import { PageContextService } from '@/modules/page-builder/page-context-service';
import { SurfaceService } from '@/modules/page-builder/surface-service';
import { normalizeEmail } from '@/modules/auth/email-normalizer';

describe('Phase 1A: Brand Theme Rendering, Isolation & Deterministic Defaults', () => {
  let tenantAId: string;
  let tenantASlug: string;
  let brandAId: string;

  let tenantBId: string;
  let tenantBSlug: string;
  let brandBId: string;

  beforeEach(async () => {
    const idSuffixA = crypto.randomBytes(4).toString('hex');
    const userA = await prisma.user.create({
      data: {
        email: normalizeEmail(`owner-theme-a-${idSuffixA}@localbi.test`),
        fullName: 'Tenant A Owner',
        status: 'ACTIVE',
      },
    });

    tenantASlug = `tenant-a-${idSuffixA}`;
    const tenantA = await TenantService.createTenant(
      { name: `Tenant A ${idSuffixA}`, slug: tenantASlug, timezone: 'America/New_York' },
      userA.id
    );
    tenantAId = tenantA.id;

    const contextA: AuthorizedContext = {
      userId: userA.id,
      tenantId: tenantAId,
      role: Role.CLIENT_OWNER,
      scopeMode: ScopeMode.ALL,
      grantedBrandIds: new Set(),
      grantedLocationIds: new Set(),
    };

    const brandA = await BrandService.createBrand(
      tenantAId,
      { name: 'Alpha Retail', slug: `alpha-retail-${idSuffixA}` },
      contextA
    );
    brandAId = brandA.id;

    const idSuffixB = crypto.randomBytes(4).toString('hex');
    const userB = await prisma.user.create({
      data: {
        email: normalizeEmail(`owner-theme-b-${idSuffixB}@localbi.test`),
        fullName: 'Tenant B Owner',
        status: 'ACTIVE',
      },
    });

    tenantBSlug = `tenant-b-${idSuffixB}`;
    const tenantB = await TenantService.createTenant(
      { name: `Tenant B ${idSuffixB}`, slug: tenantBSlug, timezone: 'Europe/London' },
      userB.id
    );
    tenantBId = tenantB.id;

    const contextB: AuthorizedContext = {
      userId: userB.id,
      tenantId: tenantBId,
      role: Role.CLIENT_OWNER,
      scopeMode: ScopeMode.ALL,
      grantedBrandIds: new Set(),
      grantedLocationIds: new Set(),
    };

    const brandB = await BrandService.createBrand(
      tenantBId,
      { name: 'Beta Logistics', slug: `beta-logistics-${idSuffixB}` },
      contextB
    );
    brandBId = brandB.id;
  });

  describe('Deterministic Defaults for Missing or Unconfigured Themes', () => {
    it('returns virtual default theme tokens when no brand theme exists in database', async () => {
      const theme = await ThemeService.getThemeForBrand(tenantAId, brandAId);

      expect(theme).toBeDefined();
      expect(theme.tenantId).toBe(tenantAId);
      expect(theme.brandId).toBe(brandAId);
      expect(theme.primaryColor).toBe(DEFAULT_THEME_VALUES.primaryColor);
      expect(theme.secondaryColor).toBe(DEFAULT_THEME_VALUES.secondaryColor);
      expect(theme.accentColor).toBe(DEFAULT_THEME_VALUES.accentColor);
      expect(theme.backgroundColor).toBe(DEFAULT_THEME_VALUES.backgroundColor);
      expect(theme.textColor).toBe(DEFAULT_THEME_VALUES.textColor);
      expect(theme.fontHeading).toBe(DEFAULT_THEME_VALUES.fontHeading);
      expect(theme.fontBody).toBe(DEFAULT_THEME_VALUES.fontBody);
      expect(theme.buttonRadius).toBe(DEFAULT_THEME_VALUES.buttonRadius);
      expect(theme.cardRadius).toBe(DEFAULT_THEME_VALUES.cardRadius);
      expect(theme.customCss).toBeNull();
    });

    it('generates consistent CSS variables and block from default theme', () => {
      const defaultDto: BrandThemeDto = {
        id: 'theme-default-b1',
        tenantId: tenantAId,
        brandId: brandAId,
        ...DEFAULT_THEME_VALUES,
        customCss: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const cssVars = ThemeService.generateCssVariables(defaultDto);
      expect(cssVars['--brand-primary']).toBe(DEFAULT_THEME_VALUES.primaryColor);
      expect(cssVars['--brand-button-radius']).toBe(DEFAULT_THEME_VALUES.buttonRadius);

      const cssBlock = ThemeService.generateCssBlock(defaultDto);
      expect(cssBlock).toContain(`--brand-primary: ${DEFAULT_THEME_VALUES.primaryColor};`);
      expect(cssBlock).toContain(`--brand-secondary: ${DEFAULT_THEME_VALUES.secondaryColor};`);
      expect(cssBlock).not.toContain('Brand Custom CSS');
    });

    it('falls back to defaults when a persisted record has empty or missing values', async () => {
      // Upsert a theme with only primaryColor specified
      await ThemeService.upsertThemeForBrand(tenantAId, brandAId, {
        primaryColor: '#10B981',
      });

      const theme = await ThemeService.getThemeForBrand(tenantAId, brandAId);
      expect(theme.primaryColor).toBe('#10B981');
      // Other values must use deterministic defaults
      expect(theme.secondaryColor).toBe(DEFAULT_THEME_VALUES.secondaryColor);
      expect(theme.accentColor).toBe(DEFAULT_THEME_VALUES.accentColor);
      expect(theme.buttonRadius).toBe(DEFAULT_THEME_VALUES.buttonRadius);
    });
  });

  describe('Theme Mutation, Persistence & Validation', () => {
    it('persists and retrieves custom theme tokens', async () => {
      const saved = await ThemeService.upsertThemeForBrand(tenantAId, brandAId, {
        primaryColor: '#EC4899',
        secondaryColor: '#1E293B',
        accentColor: '#8B5CF6',
        backgroundColor: '#F8FAFC',
        textColor: '#020617',
        fontHeading: 'Poppins, sans-serif',
        fontBody: 'Open Sans, sans-serif',
        buttonRadius: '9999px',
        cardRadius: '1rem',
        customCss: '.custom-header { font-weight: 800; }',
      });

      expect(saved.primaryColor).toBe('#EC4899');
      expect(saved.fontHeading).toBe('Poppins, sans-serif');
      expect(saved.buttonRadius).toBe('9999px');
      expect(saved.customCss).toBe('.custom-header { font-weight: 800; }');

      const retrieved = await ThemeService.getThemeForBrand(tenantAId, brandAId);
      expect(retrieved.primaryColor).toBe('#EC4899');
      expect(retrieved.customCss).toContain('.custom-header');

      const cssBlock = ThemeService.generateCssBlock(retrieved);
      expect(cssBlock).toContain('--brand-primary: #EC4899;');
      expect(cssBlock).toContain('--brand-button-radius: 9999px;');
      expect(cssBlock).toContain('.custom-header { font-weight: 800; }');
    });

    it('rejects invalid color inputs', async () => {
      await expect(
        ThemeService.upsertThemeForBrand(tenantAId, brandAId, {
          primaryColor: 'not-a-color',
        })
      ).rejects.toThrow(/Invalid color format/);

      await expect(
        ThemeService.upsertThemeForBrand(tenantAId, brandAId, {
          primaryColor: '#ZZZ',
        })
      ).rejects.toThrow(/Invalid color format/);
    });

    it('rejects invalid dimension formats', async () => {
      await expect(
        ThemeService.upsertThemeForBrand(tenantAId, brandAId, {
          buttonRadius: '100', // Missing unit
        })
      ).rejects.toThrow(/Invalid dimension format/);

      await expect(
        ThemeService.upsertThemeForBrand(tenantAId, brandAId, {
          cardRadius: '20vh',
        })
      ).rejects.toThrow(/Invalid dimension format/);
    });

    it('rejects malicious custom CSS injections (scripts and style breakout)', async () => {
      // Style tag breakout attempt
      await expect(
        ThemeService.upsertThemeForBrand(tenantAId, brandAId, {
          customCss: '</style><script>alert("hacked")</script>',
        })
      ).rejects.toThrow(/forbidden expressions/);

      // Javascript protocol attempt
      await expect(
        ThemeService.upsertThemeForBrand(tenantAId, brandAId, {
          customCss: 'body { background: url(javascript:alert(1)); }',
        })
      ).rejects.toThrow(/forbidden expressions/);

      // CSS expression attempt
      await expect(
        ThemeService.upsertThemeForBrand(tenantAId, brandAId, {
          customCss: 'div { width: expression(alert(1)); }',
        })
      ).rejects.toThrow(/forbidden expressions/);

      // Import rule attempt
      await expect(
        ThemeService.upsertThemeForBrand(tenantAId, brandAId, {
          customCss: '@import url("https://evil.com/hack.css");',
        })
      ).rejects.toThrow(/forbidden expressions/);
    });
  });

  describe('Multi-Tenant Isolation (Tenant A cannot see or mutate Tenant B theme)', () => {
    it('ensures Tenant A and Tenant B maintain completely isolated themes', async () => {
      // Tenant A configures custom pink theme
      await ThemeService.upsertThemeForBrand(tenantAId, brandAId, {
        primaryColor: '#EC4899',
      });

      // Tenant B configures custom teal theme
      await ThemeService.upsertThemeForBrand(tenantBId, brandBId, {
        primaryColor: '#14B8A6',
      });

      // Tenant A's read returns pink
      const themeA = await ThemeService.getThemeForBrand(tenantAId, brandAId);
      expect(themeA.primaryColor).toBe('#EC4899');

      // Tenant B's read returns teal
      const themeB = await ThemeService.getThemeForBrand(tenantBId, brandBId);
      expect(themeB.primaryColor).toBe('#14B8A6');

      // Tenant A attempting to read Tenant B's brand under Tenant A's context returns virtual defaults
      // (because RLS filters out brand_themes rows where tenant_id != Tenant A)
      const leakedTheme = await ThemeService.getThemeForBrand(tenantAId, brandBId);
      expect(leakedTheme.primaryColor).toBe(DEFAULT_THEME_VALUES.primaryColor);
      expect(leakedTheme.primaryColor).not.toBe('#14B8A6');
    });

    it('rejects cross-tenant theme upsert (Tenant A cannot modify Tenant B brand)', async () => {
      await expect(
        ThemeService.upsertThemeForBrand(tenantAId, brandBId, {
          primaryColor: '#EF4444',
        })
      ).rejects.toThrow(/not found under tenant/i);
    });
  });

  describe('Storefront PageContext Integration', () => {
    it('injects the persisted BrandTheme cssBlock into PageContext when resolving', async () => {
      // Configure custom brand theme
      await ThemeService.upsertThemeForBrand(tenantAId, brandAId, {
        primaryColor: '#7C3AED',
        buttonRadius: '1.25rem',
      });

      const surface = await SurfaceService.ensureLocalBiSurface(tenantAId, brandAId);

      const pageContext = await PageContextService.resolveContext({
        tenant: { id: tenantAId, name: 'Tenant A', slug: tenantASlug },
        brand: { id: brandAId, name: 'Alpha Retail', slug: 'alpha-retail' },
        webSurface: surface,
        domain: null,
        pathSegments: [],
      });

      expect(pageContext).toBeDefined();
      expect(pageContext.theme.primaryColor).toBe('#7C3AED');
      expect(pageContext.cssBlock).toContain('--brand-primary: #7C3AED;');
      expect(pageContext.cssBlock).toContain('--brand-button-radius: 1.25rem;');
    });
  });
});
