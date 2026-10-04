import { describe, it, expect } from 'vitest';
import { SeoResolver } from '@/modules/page-builder/seo-resolver';
import { SurfaceService } from '@/modules/page-builder/surface-service';
import { ThemeService, DEFAULT_THEME_VALUES } from '@/modules/page-builder/theme-service';
import { NavigationService } from '@/modules/page-builder/navigation-service';

describe('Site Studio — Core Engine & Security Validations', () => {
  describe('SeoResolver Tokenized Patterns', () => {
    it('interpolates brand, store, city, product tokens correctly', () => {
      const template = '{product} in {city} | {brand}';
      const output = SeoResolver.interpolateTokens(template, {
        brand: 'Aalim Perfumes',
        city: 'Chennai',
        product: 'Royal White Oudh',
      });

      expect(output).toBe('Royal White Oudh in Chennai | Aalim Perfumes');
    });

    it('rejects unknown or malformed tokens to prevent template injection', () => {
      const evilTemplate = '{product} - {maliciousToken}';
      expect(() =>
        SeoResolver.interpolateTokens(evilTemplate, {
          product: 'Royal Oudh',
        })
      ).toThrow(/Unknown SEO placeholder/);
    });

    it('handles missing values gracefully without crashing', () => {
      const template = '{store} in {city}';
      const output = SeoResolver.interpolateTokens(template, {
        store: 'Mannadi Branch',
      });

      expect(output).toBe('Mannadi Branch in ');
    });
  });

  describe('SurfaceService Hostname Validation', () => {
    it('normalizes valid hostnames by stripping protocol, port, and trailing slashes', () => {
      expect(SurfaceService.normalizeHostname('https://locate.aalimperfumes.com:3000/')).toBe(
        'locate.aalimperfumes.com'
      );
      expect(SurfaceService.normalizeHostname('  aalim.localbi.app  ')).toBe('aalim.localbi.app');
    });

    it('rejects invalid or unsafe hostname strings', () => {
      expect(() => SurfaceService.normalizeHostname('')).toThrow(/Hostname cannot be empty/);
      expect(() => SurfaceService.normalizeHostname('bad_hostname with spaces')).toThrow(/Invalid hostname/);
      expect(() => SurfaceService.normalizeHostname('http://<script>alert(1)</script>')).toThrow(
        /Invalid hostname/
      );
    });
  });

  describe('ThemeService Token Sanitation & CSS Variables', () => {
    it('generates valid CSS custom properties from brand theme tokens', () => {
      const mockTheme = {
        id: 'th-1',
        tenantId: 't-1',
        brandId: 'b-1',
        primaryColor: '#4F46E5',
        secondaryColor: '#0F172A',
        accentColor: '#F59E0B',
        backgroundColor: '#FFFFFF',
        textColor: '#0F172A',
        fontHeading: 'Inter, sans-serif',
        fontBody: 'Inter, sans-serif',
        buttonRadius: '0.5rem',
        cardRadius: '0.75rem',
        customCss: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const css = ThemeService.generateCssBlock(mockTheme);

      expect(css).toContain('--brand-primary: #4F46E5;');
      expect(css).toContain('--brand-secondary: #0F172A;');
      expect(css).toContain('--brand-accent: #F59E0B;');
      expect(css).toContain('--brand-button-radius: 0.5rem;');
      expect(css).toContain('--brand-font-heading: Inter, sans-serif;');
    });

    it('rejects malicious XSS injections in custom CSS', async () => {
      await expect(
        ThemeService.upsertThemeForBrand('dummy-tenant', 'dummy-brand', {
          customCss: 'body { background: red; } <script>alert(1)</script>',
        })
      ).rejects.toThrow(/forbidden expressions or scripts/);

      await expect(
        ThemeService.upsertThemeForBrand('dummy-tenant', 'dummy-brand', {
          customCss: 'div { background-image: url(javascript:alert(1)); }',
        })
      ).rejects.toThrow(/forbidden expressions or scripts/);
    });
  });

  describe('NavigationService Link Validation', () => {
    it('normalizes internal relative routes with leading slashes', () => {
      const item = NavigationService.validateNavItem({
        label: 'Stores',
        type: 'STORE',
        target: 'chennai/mannadi',
      });

      expect(item.target).toBe('/chennai/mannadi');
      expect(item.type).toBe('STORE');
    });

    it('rejects javascript: and dangerous URI schemes in navigation', () => {
      expect(() =>
        NavigationService.validateNavItem({
          label: 'Exploit',
          type: 'EXTERNAL_URL',
          target: 'javascript:void(0)',
        })
      ).toThrow(/Prohibited URL scheme/);
    });
  });
});
