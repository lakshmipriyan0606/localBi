import { describe, it, expect } from 'vitest';
import { NavigationService } from '@/modules/page-builder/navigation-service';

describe('NavigationService — Website Navigation Management', () => {
  describe('validateNavItem', () => {
    it('validates and normalizes valid internal page navigation items', () => {
      const item = NavigationService.validateNavItem({
        label: 'Our Stores',
        type: 'INTERNAL_PAGE',
        target: 'locations',
        order: 1,
      });

      expect(item.label).toBe('Our Stores');
      expect(item.type).toBe('INTERNAL_PAGE');
      expect(item.target).toBe('/locations');
      expect(item.order).toBe(1);
      expect(item.openInNewTab).toBe(false);
    });

    it('validates external URLs with HTTP/HTTPS', () => {
      const item = NavigationService.validateNavItem({
        label: 'External Portal',
        type: 'EXTERNAL_URL',
        target: 'https://example.com/portal',
        openInNewTab: true,
      });

      expect(item.label).toBe('External Portal');
      expect(item.type).toBe('EXTERNAL_URL');
      expect(item.target).toBe('https://example.com/portal');
      expect(item.openInNewTab).toBe(true);
    });

    it('rejects prohibited schemes such as javascript:, data:, and vbscript:', () => {
      expect(() =>
        NavigationService.validateNavItem({
          label: 'Exploit',
          type: 'EXTERNAL_URL',
          target: 'javascript:alert(1)',
        })
      ).toThrow(/Prohibited URL scheme/);

      expect(() =>
        NavigationService.validateNavItem({
          label: 'Exploit 2',
          type: 'EXTERNAL_URL',
          target: 'data:text/html,<script>alert(1)</script>',
        })
      ).toThrow(/Prohibited URL scheme/);
    });

    it('rejects empty labels or targets', () => {
      expect(() =>
        NavigationService.validateNavItem({
          label: '',
          target: '/about',
        })
      ).toThrow(/requires a non-empty label/);

      expect(() =>
        NavigationService.validateNavItem({
          label: 'About',
          target: '   ',
        })
      ).toThrow(/requires a target URL or path/);
    });
  });
});
