// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveActiveBrandId } from '@/shared/utils/active-brand-resolver';

describe('Active Brand Synchronization', () => {
  const mockBrands = [
    { id: 'b-lakshmi', name: 'Lakshmi food' },
    { id: 'b-sastikaa', name: 'Sastikaa travel agency' },
  ];
  const tenantSlug = 'lakshmi-food';

  describe('resolveActiveBrandId helper', () => {
    it('prioritizes explicit search param if it exists in brand list', () => {
      const mockCookieStore = {
        get: vi.fn().mockReturnValue({ value: 'b-lakshmi' }),
      };

      const resolved = resolveActiveBrandId(
        mockBrands,
        tenantSlug,
        mockCookieStore,
        'b-sastikaa'
      );

      expect(resolved).toBe('b-sastikaa');
    });

    it('falls back to cookie if search param is omitted', () => {
      const mockCookieStore = {
        get: vi.fn((key: string) => {
          if (key === `localbi_active_brand_${tenantSlug}`) {
            return { value: 'b-sastikaa' };
          }
          return undefined;
        }),
      };

      const resolved = resolveActiveBrandId(
        mockBrands,
        tenantSlug,
        mockCookieStore,
        undefined
      );

      expect(resolved).toBe('b-sastikaa');
    });

    it('falls back to default first brand if neither search param nor cookie matches valid brand', () => {
      const mockCookieStore = {
        get: vi.fn().mockReturnValue({ value: 'invalid-brand-id' }),
      };

      const resolved = resolveActiveBrandId(
        mockBrands,
        tenantSlug,
        mockCookieStore,
        undefined
      );

      expect(resolved).toBe('b-lakshmi');
    });

    it('handles empty brands array gracefully without throwing', () => {
      const mockCookieStore = {
        get: vi.fn().mockReturnValue(undefined),
      };

      const resolved = resolveActiveBrandId(
        [],
        tenantSlug,
        mockCookieStore,
        undefined
      );

      expect(resolved).toBe('');
    });
  });
});
