import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/v1/pixel/track/route';
import { prisma } from '@/shared/database/client';
import { MicrositeService } from '@/modules/microsites/microsite-service';

vi.mock('@/shared/database/client', () => {
  const mockPrisma: any = {
    webSurface: {
      findFirst: vi.fn(),
    },
    brand: {
      findFirst: vi.fn(),
    },
    visitorSession: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    attributionEvent: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    micrositeVisitor: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    $executeRaw: vi.fn().mockResolvedValue(1),
    $executeRawUnsafe: vi.fn().mockResolvedValue(1),
  };
  mockPrisma.$transaction = vi.fn(async (cb: (tx: any) => Promise<any>) => cb(mockPrisma));
  return { prisma: mockPrisma };
});

vi.mock('@/modules/microsites/microsite-service', () => ({
  MicrositeService: {
    resolvePublishedMicrosite: vi.fn(),
  },
}));

describe('Web Analytics Ingestion Pipeline (/api/v1/pixel/track)', () => {
  const mockTenantId = 'tenant_123';
  const mockBrandId = 'brand_123';
  const mockSurfaceId = 'surface_123';

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(MicrositeService.resolvePublishedMicrosite).mockResolvedValue({
      id: 'site_123',
      tenantId: mockTenantId,
      tenantSlug: 'mannadi-perfumes',
      subdomain: 'mannadi',
      customDomain: null,
      published: true,
      title: 'Mannadi Perfumes',
      theme: {},
      pages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    vi.mocked(prisma.webSurface.findFirst).mockResolvedValue({
      id: mockSurfaceId,
      tenantId: mockTenantId,
      brandId: mockBrandId,
      type: 'LOCALBI',
      tenant: { id: mockTenantId, slug: 'mannadi-perfumes' },
    } as any);

    vi.mocked(prisma.visitorSession.findUnique).mockResolvedValue(null);
    (vi.mocked(prisma.visitorSession.create) as any).mockImplementation(async (args: any) => ({
      id: 'vs_1',
      tenantId: mockTenantId,
      visitorId: args.data.visitorId,
      sessionId: args.data.sessionId,
      brandId: mockBrandId,
      webSurfaceId: mockSurfaceId,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      ...args.data,
    }));

    vi.mocked((prisma as any).micrositeVisitor.upsert).mockResolvedValue({
      id: 'mv_123',
      tenantSlug: 'mannadi-perfumes',
      deviceFingerprint: 'vid_test1',
      isIdentified: false,
      identifiedUser: null,
      intentLevel: 'LOW',
      pageViews: [],
      deviceInfo: { platform: 'Unknown', browser: 'Unknown', screenResolution: '1920x1080', timezone: 'UTC' },
      trafficSource: { referrer: '', channel: 'Direct' },
      conversions: [],
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
    } as any);
  });

  it('rejects oversized payloads (>64KB) with 413 Payload Too Large', async () => {
    const hugePayload = JSON.stringify({
      subdomain: 'mannadi',
      extraData: 'a'.repeat(70000),
    });

    const req = new NextRequest('http://localhost/api/v1/pixel/track', {
      method: 'POST',
      body: hugePayload,
    });

    const res = await POST(req);
    expect(res.status).toBe(413);
  });

  it('rejects invalid JSON with 400 Bad Request', async () => {
    const req = new NextRequest('http://localhost/api/v1/pixel/track', {
      method: 'POST',
      body: '{ not valid json',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('ingests page_view event, establishes session, and returns valid event ID', async () => {
    vi.mocked(prisma.attributionEvent.create).mockResolvedValue({
      id: 'attr_123',
      eventType: 'PAGE_VIEW',
    } as any);

    const payload = {
      subdomain: 'mannadi',
      visitorId: 'vid_abc123',
      sessionId: 'sid_xyz789',
      eventType: 'page_view',
      url: '/chennai/mannadi',
      landingPath: '/chennai/mannadi',
      utmSource: 'google',
      utmMedium: 'organic',
    };

    const req = new NextRequest('http://localhost/api/v1/pixel/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.event.eventType).toBe('PAGE_VIEW');
    expect(body.visitorId).toBe('vid_abc123');
    expect(body.sessionId).toBe('sid_xyz789');
  });

  it('handles active engagement heartbeat without creating redundant event records', async () => {
    const payload = {
      subdomain: 'mannadi',
      visitorId: 'vid_abc123',
      sessionId: 'sid_xyz789',
      eventType: 'heartbeat',
      isHeartbeat: true,
      activeDeltaMs: 20000,
      url: '/chennai/mannadi',
    };

    const req = new NextRequest('http://localhost/api/v1/pixel/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.heartbeat).toBe(true);
    expect(body.activeDeltaMs).toBe(20000);
    // Crucial: heartbeat does NOT invoke attributionEvent.create
    expect(prisma.attributionEvent.create).not.toHaveBeenCalled();
  });

  it('tracks CTA conversions (whatsapp_click) with store and product linkage', async () => {
    vi.mocked(prisma.attributionEvent.findFirst).mockResolvedValue(null); // No rapid duplicate
    vi.mocked(prisma.attributionEvent.create).mockResolvedValue({
      id: 'attr_cta_1',
      eventType: 'WHATSAPP_CLICK',
    } as any);

    const payload = {
      subdomain: 'mannadi',
      visitorId: 'vid_abc123',
      sessionId: 'sid_xyz789',
      eventType: 'whatsapp_click',
      storeId: 'loc_mannadi',
      productId: 'prod_royal_oud',
      url: '/products/royal-oud',
    };

    const req = new NextRequest('http://localhost/api/v1/pixel/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.event.eventType).toBe('WHATSAPP_CLICK');
  });

  it('enforces short-window deduplication on rapid CTA clicks within 5 seconds', async () => {
    const existingClick = {
      id: 'attr_existing_click',
      eventType: 'WHATSAPP_CLICK',
      tenantId: mockTenantId,
      sessionId: 'sid_xyz789',
    };
    // Simulate finding a recent identical click within 5 seconds
    vi.mocked(prisma.attributionEvent.findFirst).mockResolvedValue(existingClick as any);

    const payload = {
      subdomain: 'mannadi',
      visitorId: 'vid_abc123',
      sessionId: 'sid_xyz789',
      eventType: 'whatsapp_click',
      storeId: 'loc_mannadi',
      url: '/products/royal-oud',
    };

    const req = new NextRequest('http://localhost/api/v1/pixel/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    // Did not create a new row because it was deduped
    expect(prisma.attributionEvent.create).not.toHaveBeenCalled();
  });
});
