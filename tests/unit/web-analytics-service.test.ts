import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebAnalyticsService } from '@/modules/analytics/web-analytics-service';
import { prisma } from '@/shared/database/client';

vi.mock('@/shared/database/client', () => {
  const mockPrisma: any = {
    attributionEvent: {
      findMany: vi.fn(),
    },
    visitorSession: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
      count: vi.fn(),
    },
    location: {
      findMany: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
    },
    lead: {
      findMany: vi.fn(),
    },
    $executeRaw: vi.fn().mockResolvedValue(1),
    $executeRawUnsafe: vi.fn().mockResolvedValue(1),
  };
  mockPrisma.$transaction = vi.fn(async (cb: (tx: any) => Promise<any>) => cb(mockPrisma));
  return { prisma: mockPrisma };
});

describe('WebAnalyticsService', () => {
  const tenantId = 'tenant_mannadi';
  const dateRange = {
    startDate: new Date('2026-10-01T00:00:00.000Z'),
    endDate: new Date('2026-10-04T23:59:59.999Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Overview Aggregates', () => {
    it('calculates primary KPIs, active engagement, and engaged sessions accurately without double counting', async () => {
      const mockEvents = [
        {
          id: 'ev_1',
          eventType: 'PAGE_VIEW',
          visitorId: 'vid_1',
          sessionId: 'sid_1',
          currentPath: '/chennai/mannadi',
          landingPath: '/chennai/mannadi',
          storeId: 'loc_1',
          productId: null,
          source: 'google',
          metadata: { activeDeltaMs: 15000 },
          occurredAt: new Date('2026-10-02T10:00:00.000Z'),
        },
        {
          id: 'ev_2',
          eventType: 'PAGE_VIEW',
          visitorId: 'vid_1',
          sessionId: 'sid_1',
          currentPath: '/products/royal-oud',
          landingPath: '/chennai/mannadi',
          storeId: 'loc_1',
          productId: 'prod_1',
          source: 'google',
          metadata: { activeDeltaMs: 25000 },
          occurredAt: new Date('2026-10-02T10:02:00.000Z'),
        },
        {
          id: 'ev_3',
          eventType: 'WHATSAPP_CLICK',
          visitorId: 'vid_1',
          sessionId: 'sid_1',
          currentPath: '/products/royal-oud',
          landingPath: '/chennai/mannadi',
          storeId: 'loc_1',
          productId: 'prod_1',
          source: 'google',
          metadata: {},
          occurredAt: new Date('2026-10-02T10:03:00.000Z'),
        },
        {
          id: 'ev_4',
          eventType: 'FORM_SUBMIT',
          visitorId: 'vid_1',
          sessionId: 'sid_1',
          currentPath: '/products/royal-oud',
          landingPath: '/chennai/mannadi',
          storeId: 'loc_1',
          productId: 'prod_1',
          source: 'google',
          metadata: {},
          occurredAt: new Date('2026-10-02T10:04:00.000Z'),
        },
      ];

      const mockSessions = [
        {
          id: 'vs_1',
          visitorId: 'vid_1',
          sessionId: 'sid_1',
          firstSeenAt: new Date('2026-10-02T10:00:00.000Z'),
          lastSeenAt: new Date('2026-10-02T10:04:00.000Z'),
          firstTouchLandingPage: '/chennai/mannadi',
          firstTouchSource: 'google',
        },
      ];

      vi.mocked(prisma.attributionEvent.findMany).mockResolvedValue(mockEvents as any);
      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue(mockSessions as any);
      vi.mocked(prisma.visitorSession.groupBy).mockResolvedValue([
        { visitorId: 'vid_1', _count: { sessionId: 1 } },
      ] as any);
      vi.mocked(prisma.location.findMany).mockResolvedValue([
        { id: 'loc_1', name: 'Mannadi Branch' },
      ] as any);
      vi.mocked(prisma.product.findMany).mockResolvedValue([
        { id: 'prod_1', name: 'Royal Oud 50ml' },
      ] as any);

      const overview = await WebAnalyticsService.getOverview({
        tenantId,
        dateRange,
      });

      expect(overview.metrics.visitors).toBe(1);
      expect(overview.metrics.sessions).toBe(1);
      expect(overview.metrics.pageViews).toBe(2);
      expect(overview.metrics.conversions).toBe(1);
      expect(overview.metrics.engagedSessions).toBe(1);
      // Total active = 15s + 25s = 40s
      expect(overview.metrics.avgActiveEngagementSeconds).toBe(40);
      expect(overview.metrics.conversionRate).toBe(100);
      expect(overview.metrics.bounceRate).toBe(0);

      // Check funnel stages
      expect(overview.funnel).toHaveLength(5);
      expect(overview.funnel[0]!.stage).toBe('All Sessions');
      expect(overview.funnel[0]!.count).toBe(1);
      expect(overview.funnel[4]!.stage).toBe('Lead Submitted');
      expect(overview.funnel[4]!.count).toBe(1);
    });
  });

  describe('Audience and Devices Breakdown', () => {
    it('groups sessions by coarse device and browser without invasive fingerprinting', async () => {
      const mockSessions = [
        {
          visitorId: 'vid_1',
          devicePlatform: 'MOBILE:iOS',
          browser: 'Apple Safari',
        },
        {
          visitorId: 'vid_2',
          devicePlatform: 'DESKTOP:Windows 10/11',
          browser: 'Google Chrome',
        },
      ];

      vi.mocked(prisma.visitorSession.findMany).mockResolvedValue(mockSessions as any);
      vi.mocked(prisma.visitorSession.groupBy).mockResolvedValue([
        { visitorId: 'vid_1', _count: { sessionId: 1 } },
        { visitorId: 'vid_2', _count: { sessionId: 2 } }, // Returning
      ] as any);

      const audience = await WebAnalyticsService.getAudience({
        tenantId,
        dateRange,
      });

      expect(audience.newVsReturning.newVisitors).toBe(1);
      expect(audience.newVsReturning.returningVisitors).toBe(1);
      expect(audience.devices.find((d) => d.category === 'MOBILE')?.sessions).toBe(1);
      expect(audience.devices.find((d) => d.category === 'DESKTOP')?.sessions).toBe(1);
      expect(audience.browsers.find((b) => b.browser === 'Apple Safari')?.sessions).toBe(1);
      expect(audience.browsers.find((b) => b.browser === 'Google Chrome')?.sessions).toBe(1);
    });
  });

  describe('Stores Performance Attribution', () => {
    it('aggregates store views, calls, WhatsApp, directions, and form leads by store', async () => {
      vi.mocked(prisma.location.findMany).mockResolvedValue([
        { id: 'store_mannadi', name: 'Mannadi Store', city: 'Chennai' },
        { id: 'store_t_nagar', name: 'T Nagar Store', city: 'Chennai' },
      ] as any);

      const mockEvents = [
        {
          storeId: 'store_mannadi',
          eventType: 'PAGE_VIEW',
          visitorId: 'vid_1',
          sessionId: 'sid_1',
          metadata: { activeDeltaMs: 12000 },
        },
        {
          storeId: 'store_mannadi',
          eventType: 'CALL_CLICK',
          visitorId: 'vid_1',
          sessionId: 'sid_1',
          metadata: {},
        },
        {
          storeId: 'store_mannadi',
          eventType: 'WHATSAPP_CLICK',
          visitorId: 'vid_1',
          sessionId: 'sid_1',
          metadata: {},
        },
        {
          storeId: 'store_mannadi',
          eventType: 'DIRECTIONS_CLICK',
          visitorId: 'vid_1',
          sessionId: 'sid_1',
          metadata: {},
        },
        {
          storeId: 'store_mannadi',
          eventType: 'FORM_SUBMIT',
          visitorId: 'vid_1',
          sessionId: 'sid_1',
          metadata: {},
        },
      ];

      vi.mocked(prisma.attributionEvent.findMany).mockResolvedValue(mockEvents as any);

      const result = await WebAnalyticsService.getStores({
        tenantId,
        dateRange,
      });

      expect(result.stores).toHaveLength(2);
      const mannadi = result.stores.find((s) => s.storeId === 'store_mannadi')!;
      expect(mannadi.pageViews).toBe(1);
      expect(mannadi.callClicks).toBe(1);
      expect(mannadi.whatsappClicks).toBe(1);
      expect(mannadi.directionsClicks).toBe(1);
      expect(mannadi.formSubmits).toBe(1);
      expect(mannadi.conversions).toBe(1);

      const tNagar = result.stores.find((s) => s.storeId === 'store_t_nagar')!;
      expect(tNagar.pageViews).toBe(0);
      expect(tNagar.callClicks).toBe(0);
    });
  });

  describe('Human-Readable Journey Timeline', () => {
    it('produces chronological human-readable events with store and product context', async () => {
      vi.mocked(prisma.attributionEvent.findMany).mockResolvedValue([
        {
          id: 'ev_1',
          eventType: 'PAGE_VIEW',
          currentPath: '/chennai',
          storeId: null,
          productId: null,
          campaign: null,
          occurredAt: new Date('2026-10-04T10:31:04.000Z'),
        },
        {
          id: 'ev_2',
          eventType: 'PAGE_VIEW',
          currentPath: '/chennai/mannadi',
          storeId: 'loc_1',
          productId: null,
          campaign: null,
          occurredAt: new Date('2026-10-04T10:31:52.000Z'),
        },
        {
          id: 'ev_3',
          eventType: 'PAGE_VIEW',
          currentPath: '/products/royal-oud',
          storeId: 'loc_1',
          productId: 'prod_1',
          campaign: null,
          occurredAt: new Date('2026-10-04T10:33:10.000Z'),
        },
        {
          id: 'ev_4',
          eventType: 'WHATSAPP_CLICK',
          currentPath: '/products/royal-oud',
          storeId: 'loc_1',
          productId: 'prod_1',
          campaign: null,
          occurredAt: new Date('2026-10-04T10:35:22.000Z'),
        },
        {
          id: 'ev_5',
          eventType: 'FORM_SUBMIT',
          currentPath: '/products/royal-oud',
          storeId: 'loc_1',
          productId: 'prod_1',
          campaign: null,
          occurredAt: new Date('2026-10-04T10:38:11.000Z'),
        },
      ] as any);

      vi.mocked(prisma.location.findMany).mockResolvedValue([
        { id: 'loc_1', name: 'Mannadi Store' },
      ] as any);
      vi.mocked(prisma.product.findMany).mockResolvedValue([
        { id: 'prod_1', name: 'Royal Oud' },
      ] as any);

      const journey = await WebAnalyticsService.getSessionJourney(tenantId, 'sid_123');

      expect(journey).toHaveLength(5);
      expect(journey[0]!.label).toContain('Viewed /chennai');
      expect(journey[1]!.label).toContain('Viewed Store: Mannadi Store');
      expect(journey[2]!.label).toContain('Viewed Product: Royal Oud');
      expect(journey[3]!.label).toContain('Clicked WhatsApp at Mannadi Store regarding Royal Oud');
      expect(journey[4]!.label).toBe('Submitted lead enquiry form');
    });
  });
});
