import { describe, it, expect } from 'vitest';
import { MicrositeService } from '@/modules/microsites/microsite-service';
import { VisitorService } from '@/modules/visitors/visitor-service';

describe('Subdomain Microsites Engine', () => {
  it('retrieves configured microsite by subdomain', async () => {
    const site = await MicrositeService.getMicrositeBySubdomain('lakshmi-food');
    expect(site).toBeDefined();
    expect(site?.brandName).toContain('Lakshmi Food');
    expect(site?.menuItems).toBeDefined();
    expect(site?.hours).toBeDefined();
  });

  it('updates microsite settings and menu items', async () => {
    await MicrositeService.createMicrosite({
      subdomain: 'temp-unit-test-store',
      tenantSlug: 'test-tenant',
      brandName: 'Test Store',
      industry: 'FOOD',
    });
    const updated = await MicrositeService.updateMicrosite('temp-unit-test-store', {
      phone: '+91 99999 88888',
      customDomain: 'test.example.com',
    });
    expect(updated?.phone).toBe('+91 99999 88888');
    expect(updated?.customDomain).toBe('test.example.com');
    await MicrositeService.deleteMicrosite('temp-unit-test-store');
  });
});

describe('Microsite Visitor Analytics & Cookieless Lead Capture Engine', () => {
  it('tracks page views and calculates intent levels', async () => {
    const session = await VisitorService.recordEvent({
      tenantSlug: 'isolated-test-tenant',
      deviceFingerprint: 'fp_test_unit_123',
      url: '/site/isolated-test-tenant/menu',
      platform: 'iOS',
      referrer: 'https://www.google.com/search?q=best+dosa',
      eventType: 'page_view',
    });

    expect(session.deviceFingerprint).toBe('fp_test_unit_123');
    expect(session.trafficSource.channel).toBe('Google Search');
  });

  it('stitches identity to device fingerprint upon interaction', async () => {
    const identified = await VisitorService.identifyVisitor({
      deviceFingerprint: 'fp_test_unit_123',
      phone: '+91 98401 55555',
      name: 'Prakash',
    });

    expect(identified).toBeDefined();
    expect(identified?.isIdentified).toBe(true);
    expect(identified?.identifiedUser?.phone).toBe('+91 98401 55555');
    expect(identified?.intentLevel).toBe('HOT');

    // Clean up test tenant
    await VisitorService.clearRealVisitors('isolated-test-tenant');
  });
});

describe('Multi-Industry Puck Visual Page Builder Engine', () => {
  it('retrieves default starter layout for food, hospital, and jewelry subdomains', async () => {
    const { PuckService } = await import('@/modules/microsites/puck-service');
    const foodLayout = await PuckService.getPuckData('lakshmi-food');
    expect(foodLayout).toBeDefined();
    expect(foodLayout?.content.some((c: any) => c.type === 'Hero' || c.type === 'RestaurantHero')).toBe(true);

    const hospLayout = await PuckService.getPuckData('apollo-annanagar');
    expect(hospLayout).toBeDefined();
    expect(hospLayout?.content.some((c: any) => c.type === 'HospitalHero')).toBe(true);

    const jewelryLayout = await PuckService.getPuckData('swarna-mahal');
    expect(jewelryLayout).toBeDefined();
    expect(jewelryLayout?.content.some((c: any) => c.type === 'JewelryHero')).toBe(true);
  });

  it('saves and publishes custom layout for a subdomain', async () => {
    const { PuckService } = await import('@/modules/microsites/puck-service');
    const success = await PuckService.savePuckData('custom-client', {
      content: [
        {
          type: 'GoldRateTicker',
          props: {
            id: 'unit-gold-1',
            rate22k: '₹6,900/g',
            rate24k: '₹7,550/g',
            silverRate: '₹99/g',
            lastUpdated: 'Today',
          },
        },
      ],
      root: { props: { title: 'Custom Jewelers' } },
    });

    expect(success).toBe(true);
    const saved = await PuckService.getPuckData('custom-client');
    expect(saved?.content[0]?.type).toBe('GoldRateTicker');
  });
});
