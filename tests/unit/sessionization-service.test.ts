import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionizationService } from '@/modules/analytics/sessionization-service';
import { prisma } from '@/shared/database/client';

vi.mock('@/shared/database/client', () => {
  const mockPrisma: any = {
    visitorSession: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $executeRaw: vi.fn().mockResolvedValue(1),
    $executeRawUnsafe: vi.fn().mockResolvedValue(1),
  };
  mockPrisma.$transaction = vi.fn(async (cb: (tx: any) => Promise<any>) => cb(mockPrisma));
  return { prisma: mockPrisma };
});

describe('SessionizationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Opaque ID Generation', () => {
    it('generates secure, opaque visitor ID with vid_ prefix and no hyphens', () => {
      const vid1 = SessionizationService.generateVisitorId();
      const vid2 = SessionizationService.generateVisitorId();

      expect(vid1).toMatch(/^vid_[a-f0-9]{32}$/);
      expect(vid2).toMatch(/^vid_[a-f0-9]{32}$/);
      expect(vid1).not.toBe(vid2);
    });

    it('generates secure, opaque session ID with sid_ prefix', () => {
      const sid = SessionizationService.generateSessionId();
      expect(sid).toMatch(/^sid_[a-f0-9]{32}$/);
    });

    it('generates secure, opaque pageview ID with pv_ prefix', () => {
      const pvid = SessionizationService.generatePageViewId();
      expect(pvid).toMatch(/^pv_[a-f0-9]{32}$/);
    });
  });

  describe('BotClassifier', () => {
    it('detects search engine web crawlers', () => {
      expect(SessionizationService.classifyBot('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe(true);
      expect(SessionizationService.classifyBot('Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)')).toBe(true);
      expect(SessionizationService.classifyBot('DuckDuckBot/1.0; (+http://duckduckgo.com/duckduckbot.html)')).toBe(true);
      expect(SessionizationService.classifyBot('YandexBot/3.0')).toBe(true);
    });

    it('detects automated curl and headless automation tools', () => {
      expect(SessionizationService.classifyBot('curl/7.88.1')).toBe(true);
      expect(SessionizationService.classifyBot('python-requests/2.31.0')).toBe(true);
      expect(SessionizationService.classifyBot('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/112.0.5615.49 Safari/537.36')).toBe(true);
      expect(SessionizationService.classifyBot('Playwright/1.39.0')).toBe(true);
    });

    it('classifies legitimate human desktop and mobile browsers as non-bot', () => {
      expect(SessionizationService.classifyBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')).toBe(false);
      expect(SessionizationService.classifyBot('Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1')).toBe(false);
      expect(SessionizationService.classifyBot(null)).toBe(false);
    });
  });

  describe('Coarse Device Classifier', () => {
    it('accurately classifies mobile, desktop, and tablet user agents without invasive fingerprinting', () => {
      const iphoneUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
      const iphoneResult = SessionizationService.classifyDevice(iphoneUA);
      expect(iphoneResult.category).toBe('MOBILE');
      expect(iphoneResult.os).toBe('iOS');
      expect(iphoneResult.browser).toBe('Apple Safari');

      const ipadUA = 'Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1';
      const ipadResult = SessionizationService.classifyDevice(ipadUA);
      expect(ipadResult.category).toBe('TABLET');
      expect(ipadResult.os).toBe('iOS');

      const winChromeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      const winResult = SessionizationService.classifyDevice(winChromeUA);
      expect(winResult.category).toBe('DESKTOP');
      expect(winResult.os).toBe('Windows 10/11');
      expect(winResult.browser).toBe('Google Chrome');
    });
  });

  describe('Engaged Session Policy', () => {
    it('evaluates engaged status based on active time, page views, or conversions', () => {
      // Rule 1: active engagement >= 10,000ms
      expect(
        SessionizationService.isSessionEngaged({
          activeEngagementMs: 12000,
          pageViewCount: 1,
          hasConversion: false,
        })
      ).toBe(true);

      // Rule 2: page views >= 2
      expect(
        SessionizationService.isSessionEngaged({
          activeEngagementMs: 4000,
          pageViewCount: 2,
          hasConversion: false,
        })
      ).toBe(true);

      // Rule 3: conversion completed
      expect(
        SessionizationService.isSessionEngaged({
          activeEngagementMs: 3000,
          pageViewCount: 1,
          hasConversion: true,
        })
      ).toBe(true);

      // Bounce: 1 pageview, <10s active, 0 conversion
      expect(
        SessionizationService.isSessionEngaged({
          activeEngagementMs: 5000,
          pageViewCount: 1,
          hasConversion: false,
        })
      ).toBe(false);
    });
  });

  describe('Session Activity Ingestion', () => {
    it('creates a new session when none exists', async () => {
      vi.mocked(prisma.visitorSession.findUnique).mockResolvedValue(null);
      const mockCreated = {
        id: 'vs_1',
        tenantId: 'tenant_1',
        visitorId: 'vid_123',
        sessionId: 'sid_456',
        brandId: 'brand_1',
        webSurfaceId: 'surface_1',
        firstTouchSource: 'google',
        firstTouchMedium: 'organic',
        firstTouchCampaign: null,
        firstTouchLandingPage: '/chennai/mannadi',
        lastTouchSource: 'google',
        lastTouchMedium: 'organic',
        lastTouchCampaign: null,
        lastTouchPage: '/chennai/mannadi',
        devicePlatform: 'DESKTOP:Windows 10/11',
        browser: 'Google Chrome',
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      };
      vi.mocked(prisma.visitorSession.create).mockResolvedValue(mockCreated as any);

      const result = await SessionizationService.processSessionActivity({
        tenantId: 'tenant_1',
        visitorId: 'vid_123',
        sessionId: 'sid_456',
        brandId: 'brand_1',
        webSurfaceId: 'surface_1',
        path: '/chennai/mannadi',
        landingPath: '/chennai/mannadi',
        trafficInput: {
          referrer: 'https://www.google.com/search?q=mannadi+perfume',
        },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      });

      expect(result.isNewSession).toBe(true);
      expect(prisma.visitorSession.create).toHaveBeenCalledOnce();
    });

    it('updates active session within 30-minute threshold without creating a new session', async () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const mockExisting = {
        id: 'vs_existing',
        tenantId: 'tenant_1',
        visitorId: 'vid_123',
        sessionId: 'sid_456',
        brandId: 'brand_1',
        webSurfaceId: 'surface_1',
        firstTouchSource: 'google',
        firstTouchMedium: 'organic',
        firstTouchCampaign: null,
        firstTouchLandingPage: '/',
        lastTouchSource: 'google',
        lastTouchMedium: 'organic',
        lastTouchCampaign: null,
        lastTouchPage: '/',
        devicePlatform: 'DESKTOP:Windows 10/11',
        browser: 'Google Chrome',
        firstSeenAt: tenMinutesAgo,
        lastSeenAt: tenMinutesAgo,
      };

      vi.mocked(prisma.visitorSession.findUnique).mockResolvedValue(mockExisting as any);
      vi.mocked(prisma.visitorSession.update).mockResolvedValue({
        ...mockExisting,
        lastTouchPage: '/products/royal-oud',
        lastSeenAt: new Date(),
      } as any);

      const result = await SessionizationService.processSessionActivity({
        tenantId: 'tenant_1',
        visitorId: 'vid_123',
        sessionId: 'sid_456',
        brandId: 'brand_1',
        webSurfaceId: 'surface_1',
        path: '/products/royal-oud',
        trafficInput: {},
      });

      expect(result.isNewSession).toBe(false);
      expect(prisma.visitorSession.update).toHaveBeenCalledOnce();
      expect(prisma.visitorSession.create).not.toHaveBeenCalled();
    });

    it('expires session and creates a new one when inactivity exceeds 30 minutes', async () => {
      const thirtyFiveMinutesAgo = new Date(Date.now() - 35 * 60 * 1000);
      const mockExpired = {
        id: 'vs_expired',
        tenantId: 'tenant_1',
        visitorId: 'vid_123',
        sessionId: 'sid_old',
        brandId: 'brand_1',
        webSurfaceId: 'surface_1',
        firstTouchSource: 'google',
        firstTouchMedium: 'organic',
        firstTouchCampaign: null,
        firstTouchLandingPage: '/',
        lastTouchSource: 'google',
        lastTouchMedium: 'organic',
        lastTouchCampaign: null,
        lastTouchPage: '/',
        devicePlatform: 'DESKTOP:Windows 10/11',
        browser: 'Google Chrome',
        firstSeenAt: thirtyFiveMinutesAgo,
        lastSeenAt: thirtyFiveMinutesAgo,
      };

      vi.mocked(prisma.visitorSession.findUnique).mockResolvedValue(mockExpired as any);
      vi.mocked(prisma.visitorSession.create).mockResolvedValue({
        ...mockExpired,
        id: 'vs_new',
        sessionId: 'sid_new',
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      } as any);

      const result = await SessionizationService.processSessionActivity({
        tenantId: 'tenant_1',
        visitorId: 'vid_123',
        sessionId: 'sid_old',
        brandId: 'brand_1',
        webSurfaceId: 'surface_1',
        path: '/products/royal-oud',
        trafficInput: {},
      });

      expect(result.isNewSession).toBe(true);
      expect(prisma.visitorSession.create).toHaveBeenCalledOnce();
    });
  });
});
