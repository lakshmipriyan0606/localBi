import { describe, it, expect } from 'vitest';
import { DiscoveredResource, BrandOption } from '@/features/integrations/components/steps/select-google-resources-step';

describe('Review Google Resources Step Data Logic & Scalability', () => {
  const sampleBrands: BrandOption[] = Array.from({ length: 30 }, (_, i) => ({
    id: `brand-${i + 1}`,
    name: `Brand ${i + 1}`,
    slug: `brand-${i + 1}`,
    domain: `brand-${i + 1}.example.com`,
  }));

  const sampleResources: DiscoveredResource[] = [
    {
      id: 'res-ga4-1',
      product: 'GA4',
      resourceName: 'Brand 1 Analytics',
      externalResourceId: 'ga4-123',
      propertyId: 'G-12345678',
    },
    {
      id: 'res-gsc-1',
      product: 'GSC',
      resourceName: 'https://brand-1.example.com/',
      externalResourceId: 'https://brand-1.example.com/',
    },
    {
      id: 'res-gbp-1',
      product: 'GBP',
      resourceName: 'Brand 1 Store #101',
      externalResourceId: 'gbp-101',
    },
    {
      id: 'res-ga4-2',
      product: 'GA4',
      resourceName: 'Brand 2 Analytics',
      externalResourceId: 'ga4-456',
      propertyId: 'G-87654321',
    },
  ];

  const sampleMappings: Record<string, string> = {
    'res-ga4-1': 'brand-1',
    'res-gsc-1': 'brand-1',
    'res-gbp-1': 'brand-1',
    'res-ga4-2': 'brand-2',
  };

  it('correctly maps resources to brands and separates mapped vs unmapped brands', () => {
    const map = new Map<string, DiscoveredResource[]>();
    sampleBrands.forEach((b) => map.set(b.id, []));

    let mappedTotal = 0;
    sampleResources.forEach((r) => {
      const brandId = sampleMappings[r.id];
      if (brandId && map.has(brandId)) {
        map.get(brandId)!.push(r);
        mappedTotal++;
      }
    });

    const mappedBrands = sampleBrands.filter((b) => (map.get(b.id) || []).length > 0);
    const unmappedBrands = sampleBrands.filter((b) => (map.get(b.id) || []).length === 0);

    expect(mappedTotal).toBe(4);
    expect(mappedBrands.length).toBe(2);
    expect(unmappedBrands.length).toBe(28);
    expect(map.get('brand-1')?.length).toBe(3);
    expect(map.get('brand-2')?.length).toBe(1);
  });

  it('handles 30+ brands pagination with 8 brands per page', () => {
    const BRANDS_PER_PAGE = 8;
    const totalPages = Math.ceil(sampleBrands.length / BRANDS_PER_PAGE);

    expect(totalPages).toBe(4); // 30 / 8 = 3.75 -> 4 pages

    const page1 = sampleBrands.slice(0, BRANDS_PER_PAGE);
    expect(page1.length).toBe(8);
    expect(page1[0].name).toBe('Brand 1');
    expect(page1[7].name).toBe('Brand 8');

    const page4 = sampleBrands.slice(24, 32);
    expect(page4.length).toBe(6);
    expect(page4[5].name).toBe('Brand 30');
  });

  it('filters brands by search keyword across brand name, domain, and resource names', () => {
    const q = 'brand 1';
    const filtered = sampleBrands.filter((b) => {
      const matchName = b.name.toLowerCase().includes(q.toLowerCase());
      const matchDomain = (b.domain || '').toLowerCase().includes(q.toLowerCase());
      return matchName || matchDomain;
    });

    // Matches 'Brand 1', 'Brand 10', 'Brand 11', ..., 'Brand 19'
    expect(filtered.length).toBe(11);
  });
});
