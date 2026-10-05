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

  describe('SiteStudio Visual Builder — Multi-Column & Layout Structure', () => {
    it('registers Columns, CardBox, Section, Container, and Spacer in layout category', async () => {
      const { siteStudioPuckConfig } = await import('@/modules/page-builder/site-studio-puck-config');

      expect(siteStudioPuckConfig.categories.layout.components).toContain('Columns');
      expect(siteStudioPuckConfig.categories.layout.components).toContain('CardBox');
      expect(siteStudioPuckConfig.categories.layout.components).toContain('Section');
      expect(siteStudioPuckConfig.categories.layout.components).toContain('Container');
      expect(siteStudioPuckConfig.categories.layout.components).toContain('Spacer');
    });

    it('configures Columns with layout, gap, align, stackOnMobile, and 4 slot drop zones', async () => {
      const { siteStudioPuckConfig } = await import('@/modules/page-builder/site-studio-puck-config');
      const columnsConfig = siteStudioPuckConfig.components.Columns;

      expect(columnsConfig).toBeDefined();
      expect(columnsConfig.label).toContain('Columns');
      expect(columnsConfig.defaultProps.layout).toBe('2-equal');
      expect(columnsConfig.defaultProps.gap).toBe('medium');

      const fields = columnsConfig.fields as Record<string, any>;
      expect(fields.layout.type).toBe('select');
      expect(fields.gap.type).toBe('select');
      expect(fields.align.type).toBe('select');
      expect(fields.stackOnMobile.type).toBe('radio');
      expect(fields.column1.type).toBe('slot');
      expect(fields.column2.type).toBe('slot');
      expect(fields.column3.type).toBe('slot');
      expect(fields.column4.type).toBe('slot');
    });

    it('configures CardBox with background, border, shadow, padding, radius, and content slot', async () => {
      const { siteStudioPuckConfig } = await import('@/modules/page-builder/site-studio-puck-config');
      const cardConfig = siteStudioPuckConfig.components.CardBox;

      expect(cardConfig).toBeDefined();
      expect(cardConfig.label).toContain('Card');
      const fields = cardConfig.fields as Record<string, any>;
      expect(fields.background.type).toBe('select');
      expect(fields.border.type).toBe('select');
      expect(fields.shadow.type).toBe('select');
      expect(fields.padding.type).toBe('select');
      expect(fields.radius.type).toBe('select');
      expect(fields.content.type).toBe('slot');
    });

    it('renders Columns component with multiple column slots', async () => {
      const { Columns } = await import('@/modules/page-builder/components/layout-components');
      const element = Columns({
        layout: '2-wide-left',
        gap: 'large',
        align: 'center',
        stackOnMobile: true,
        column1: () => 'Left Slot Content',
        column2: () => 'Right Slot Content',
      });

      expect(element).toBeDefined();
      expect(element.props.children.props.className).toContain('grid-cols-[2fr_1fr]');
      expect(element.props.children.props.className).toContain('gap-8');
      expect(element.props.children.props.className).toContain('items-center');
    });

    it('renders CardBox with customizable style tokens and content', async () => {
      const { CardBox } = await import('@/modules/page-builder/components/layout-components');
      const element = CardBox({
        background: 'slate-50',
        border: 'accent',
        shadow: 'large',
        padding: 'large',
        radius: 'large',
        content: () => 'Card Inner Content',
      });

      expect(element).toBeDefined();
      expect(element.props.className).toContain('bg-slate-50');
      expect(element.props.className).toContain('border-indigo-500/20');
      expect(element.props.className).toContain('shadow-xl');
      expect(element.props.className).toContain('rounded-3xl');
    });
  });
});
