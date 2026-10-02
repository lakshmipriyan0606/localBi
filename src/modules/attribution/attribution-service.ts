import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import type { AttributionEventType } from '@prisma/client';

export interface TrafficSourceInput {
  referrer?: string | null | undefined;
  utmSource?: string | null | undefined;
  utmMedium?: string | null | undefined;
  utmCampaign?: string | null | undefined;
  utmContent?: string | null | undefined;
  utmTerm?: string | null | undefined;
  gclid?: string | null | undefined;
}

export interface ResolvedTrafficSource {
  source: string;
  medium: string;
  campaign?: string | null | undefined;
  utmSource?: string | null | undefined;
  utmMedium?: string | null | undefined;
  utmCampaign?: string | null | undefined;
  utmContent?: string | null | undefined;
  utmTerm?: string | null | undefined;
  gclid?: string | null | undefined;
}

export interface RecordEventInput {
  tenantId: string;
  brandId: string;
  webSurfaceId: string;
  pageId?: string | null | undefined;
  pageType?: string | null | undefined;
  storeId?: string | null | undefined;
  productId?: string | null | undefined;
  categoryId?: string | null | undefined;
  visitorId?: string | null | undefined;
  sessionId?: string | null | undefined;
  eventType: AttributionEventType;
  currentPath?: string | null | undefined;
  landingPath?: string | null | undefined;
  referrer?: string | null | undefined;
  utmSource?: string | null | undefined;
  utmMedium?: string | null | undefined;
  utmCampaign?: string | null | undefined;
  utmContent?: string | null | undefined;
  utmTerm?: string | null | undefined;
  gclid?: string | null | undefined;
  metadata?: Record<string, unknown> | null | undefined;
  devicePlatform?: string | null | undefined;
  browser?: string | null | undefined;
}

export interface ConversionSummaryDto {
  pageViews: number;
  callClicks: number;
  whatsappClicks: number;
  directionsClicks: number;
  formSubmits: number;
  bookingStarts: number;
  bookingCompletes: number;
  totalConversions: number;
  totalLeads: number;
  conversionRate: number; // (totalConversions / pageViews) * 100
  formulaLabel: string;
}

export interface StoreConversionDto {
  storeId: string;
  storeName: string;
  storeCode?: string | null | undefined;
  city?: string | null | undefined;
  pageViews: number;
  callClicks: number;
  whatsappClicks: number;
  directionsClicks: number;
  formSubmits: number;
  bookingCompletes: number;
  totalConversions: number;
  conversionRate: number;
}

export interface ProductConversionDto {
  productId: string;
  productName: string;
  sku?: string | null | undefined;
  basePrice?: number | null | undefined;
  views: number;
  callClicks: number;
  whatsappClicks: number;
  formSubmits: number;
  totalConversions: number;
}

export interface PageConversionDto {
  path: string;
  pageType?: string | null | undefined;
  views: number;
  conversions: number;
  conversionRate: number;
}

export class AttributionService {
  /**
   * Deterministically resolves source & medium from incoming URL parameters and HTTP referrer.
   * Strips PII and adheres to privacy rules (never synthesizes GSC keywords).
   */
  public static resolveTrafficSource(input: TrafficSourceInput): ResolvedTrafficSource {
    const utmSource = input.utmSource?.trim().toLowerCase() || null;
    const utmMedium = input.utmMedium?.trim().toLowerCase() || null;
    const utmCampaign = input.utmCampaign?.trim() || null;
    const utmContent = input.utmContent?.trim() || null;
    const utmTerm = input.utmTerm?.trim() || null;
    const gclid = input.gclid?.trim() || null;
    const referrer = input.referrer?.trim() || null;

    // 1. Explicit UTMs
    if (utmSource) {
      return {
        source: utmSource,
        medium: utmMedium || (gclid ? 'cpc' : 'referral'),
        campaign: utmCampaign,
        utmSource,
        utmMedium,
        utmCampaign,
        utmContent,
        utmTerm,
        gclid,
      };
    }

    // 2. Google Click ID (gclid) without UTM
    if (gclid) {
      return {
        source: 'google',
        medium: 'cpc',
        campaign: utmCampaign,
        gclid,
      };
    }

    // 3. Referrer-based classification
    if (referrer) {
      try {
        const parsed = new URL(referrer.startsWith('http') ? referrer : `https://${referrer}`);
        const host = parsed.hostname.toLowerCase();

        if (host.includes('google.')) {
          return { source: 'google', medium: 'organic' };
        }
        if (host.includes('bing.')) {
          return { source: 'bing', medium: 'organic' };
        }
        if (host.includes('yahoo.')) {
          return { source: 'yahoo', medium: 'organic' };
        }
        if (host.includes('duckduckgo.')) {
          return { source: 'duckduckgo', medium: 'organic' };
        }
        if (host.includes('instagram.')) {
          return { source: 'instagram', medium: 'social' };
        }
        if (host.includes('facebook.') || host.includes('fb.')) {
          return { source: 'facebook', medium: 'social' };
        }
        if (host.includes('wa.me') || host.includes('whatsapp.')) {
          return { source: 'whatsapp', medium: 'referral' };
        }
        if (host.includes('linkedin.')) {
          return { source: 'linkedin', medium: 'social' };
        }

        return { source: host, medium: 'referral' };
      } catch {
        return { source: referrer.slice(0, 50), medium: 'referral' };
      }
    }

    // 4. Default to direct traffic
    return {
      source: 'direct',
      medium: 'none',
    };
  }

  /**
   * Records an AttributionEvent under strict tenant isolation.
   * Includes short-window deduplication (5s window) to discard rapid duplicate clicks.
   */
  public static async recordEvent(input: RecordEventInput) {
    const {
      tenantId,
      brandId,
      webSurfaceId,
      pageId,
      pageType,
      storeId,
      productId,
      categoryId,
      visitorId,
      sessionId,
      eventType,
      currentPath,
      landingPath,
      referrer,
      devicePlatform,
      browser,
      metadata,
    } = input;

    // Resolve traffic attribution
    const traffic = this.resolveTrafficSource({
      referrer,
      utmSource: input.utmSource,
      utmMedium: input.utmMedium,
      utmCampaign: input.utmCampaign,
      utmContent: input.utmContent,
      utmTerm: input.utmTerm,
      gclid: input.gclid,
    });

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // Short-window deduplication for CTA clicks (5-second threshold)
      if (sessionId && eventType !== 'PAGE_VIEW') {
        const fiveSecondsAgo = new Date(Date.now() - 5000);
        const existingRecentEvent = await tx.attributionEvent.findFirst({
          where: {
            tenantId,
            sessionId,
            eventType,
            ...(storeId ? { storeId } : {}),
            ...(productId ? { productId } : {}),
            occurredAt: { gte: fiveSecondsAgo },
          },
        });

        if (existingRecentEvent) {
          return existingRecentEvent;
        }
      }

      // Maintain VisitorSession if visitor & session tokens are provided
      if (sessionId && visitorId) {
        const existingSession = await tx.visitorSession.findUnique({
          where: {
            uq_visitor_session_tenant_session: {
              tenantId,
              sessionId,
            },
          },
        });

        if (!existingSession) {
          // Record first-touch attribution on new session
          await tx.visitorSession.create({
            data: {
              tenantId,
              visitorId,
              sessionId,
              brandId,
              webSurfaceId,
              firstTouchSource: traffic.source,
              firstTouchMedium: traffic.medium,
              firstTouchCampaign: traffic.campaign || null,
              firstTouchLandingPage: landingPath || currentPath || '/',
              lastTouchSource: traffic.source,
              lastTouchMedium: traffic.medium,
              lastTouchCampaign: traffic.campaign || null,
              lastTouchPage: currentPath || '/',
              devicePlatform: devicePlatform || null,
              browser: browser || null,
            },
          });
        } else {
          // Update last-touch attribution
          await tx.visitorSession.update({
            where: { id: existingSession.id },
            data: {
              lastTouchSource: traffic.source,
              lastTouchMedium: traffic.medium,
              lastTouchCampaign: traffic.campaign || existingSession.lastTouchCampaign,
              lastTouchPage: currentPath || existingSession.lastTouchPage,
              lastSeenAt: new Date(),
            },
          });
        }
      }

      // Persist the attribution event
      return tx.attributionEvent.create({
        data: {
          tenantId,
          brandId,
          webSurfaceId,
          pageId: pageId || null,
          pageType: pageType || null,
          storeId: storeId || null,
          productId: productId || null,
          categoryId: categoryId || null,
          visitorId: visitorId || null,
          sessionId: sessionId || null,
          eventType,
          source: traffic.source,
          medium: traffic.medium,
          campaign: traffic.campaign || null,
          landingPath: landingPath || null,
          currentPath: currentPath || null,
          referrer: referrer || null,
          utmSource: traffic.utmSource || null,
          utmMedium: traffic.utmMedium || null,
          utmCampaign: traffic.utmCampaign || null,
          utmContent: traffic.utmContent || null,
          utmTerm: traffic.utmTerm || null,
          gclid: traffic.gclid || null,
          metadata: metadata ? (metadata as any) : undefined,
        },
      });
    });
  }

  /**
   * Retrieves high-level conversion metrics across specified filters and date range.
   */
  public static async getConversionSummary(params: {
    tenantId: string;
    brandId?: string | undefined;
    webSurfaceId?: string | undefined;
    storeId?: string | undefined;
    startDate: Date;
    endDate: Date;
  }): Promise<ConversionSummaryDto> {
    const { tenantId, brandId, webSurfaceId, storeId, startDate, endDate } = params;

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const whereClause = {
        tenantId,
        ...(brandId ? { brandId } : {}),
        ...(webSurfaceId ? { webSurfaceId } : {}),
        ...(storeId ? { storeId } : {}),
        occurredAt: { gte: startDate, lte: endDate },
      };

      const counts = await tx.attributionEvent.groupBy({
        by: ['eventType'],
        where: whereClause,
        _count: { _all: true },
      });

      const map = new Map<string, number>();
      for (const item of counts) {
        map.set(item.eventType, item._count._all);
      }

      const pageViews = map.get('PAGE_VIEW') || 0;
      const callClicks = map.get('CALL_CLICK') || 0;
      const whatsappClicks = map.get('WHATSAPP_CLICK') || 0;
      const directionsClicks = map.get('DIRECTIONS_CLICK') || 0;
      const formSubmits = map.get('FORM_SUBMIT') || 0;
      const bookingStarts = map.get('BOOKING_START') || 0;
      const bookingCompletes = map.get('BOOKING_COMPLETE') || 0;

      const totalConversions =
        callClicks + whatsappClicks + directionsClicks + formSubmits + bookingCompletes;
      const totalLeads = callClicks + whatsappClicks + formSubmits + bookingCompletes;

      // Canonical formula: Conversions / Page Views * 100
      const conversionRate =
        pageViews > 0 ? Number(((totalConversions / pageViews) * 100).toFixed(2)) : 0;

      return {
        pageViews,
        callClicks,
        whatsappClicks,
        directionsClicks,
        formSubmits,
        bookingStarts,
        bookingCompletes,
        totalConversions,
        totalLeads,
        conversionRate,
        formulaLabel: 'Total Conversions / Page Views × 100%',
      };
    });
  }

  /**
   * Retrieves per-store conversion performance breakdown.
   */
  public static async getStoreConversions(params: {
    tenantId: string;
    brandId?: string | undefined;
    webSurfaceId?: string | undefined;
    startDate: Date;
    endDate: Date;
  }): Promise<StoreConversionDto[]> {
    const { tenantId, brandId, webSurfaceId, startDate, endDate } = params;

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // 1. Fetch active stores for the tenant / brand
      const stores = await tx.location.findMany({
        where: {
          tenantId,
          ...(brandId ? { brandId } : {}),
          isArchived: false,
        },
        select: { id: true, name: true, storeCode: true, city: true },
      });

      if (stores.length === 0) return [];

      // 2. Aggregate events grouped by store and eventType
      const aggregations = await tx.attributionEvent.groupBy({
        by: ['storeId', 'eventType'],
        where: {
          tenantId,
          storeId: { in: stores.map((s) => s.id) },
          ...(brandId ? { brandId } : {}),
          ...(webSurfaceId ? { webSurfaceId } : {}),
          occurredAt: { gte: startDate, lte: endDate },
        },
        _count: { _all: true },
      });

      // Build store metric map
      const storeMap = new Map<string, Record<string, number>>();
      for (const item of aggregations) {
        if (!item.storeId) continue;
        if (!storeMap.has(item.storeId)) {
          storeMap.set(item.storeId, {});
        }
        storeMap.get(item.storeId)![item.eventType] = item._count._all;
      }

      return stores.map((store) => {
        const counts = storeMap.get(store.id) || {};
        const pageViews = counts['PAGE_VIEW'] || 0;
        const callClicks = counts['CALL_CLICK'] || 0;
        const whatsappClicks = counts['WHATSAPP_CLICK'] || 0;
        const directionsClicks = counts['DIRECTIONS_CLICK'] || 0;
        const formSubmits = counts['FORM_SUBMIT'] || 0;
        const bookingCompletes = counts['BOOKING_COMPLETE'] || 0;

        const totalConversions =
          callClicks + whatsappClicks + directionsClicks + formSubmits + bookingCompletes;
        const conversionRate =
          pageViews > 0 ? Number(((totalConversions / pageViews) * 100).toFixed(2)) : 0;

        return {
          storeId: store.id,
          storeName: store.name,
          storeCode: store.storeCode,
          city: store.city,
          pageViews,
          callClicks,
          whatsappClicks,
          directionsClicks,
          formSubmits,
          bookingCompletes,
          totalConversions,
          conversionRate,
        };
      }).sort((a, b) => b.totalConversions - a.totalConversions);
    });
  }

  /**
   * Retrieves per-product conversion performance.
   */
  public static async getProductConversions(params: {
    tenantId: string;
    brandId?: string | undefined;
    webSurfaceId?: string | undefined;
    storeId?: string | undefined;
    startDate: Date;
    endDate: Date;
  }): Promise<ProductConversionDto[]> {
    const { tenantId, brandId, webSurfaceId, storeId, startDate, endDate } = params;

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const aggregations = await tx.attributionEvent.groupBy({
        by: ['productId', 'eventType'],
        where: {
          tenantId,
          productId: { not: null },
          ...(brandId ? { brandId } : {}),
          ...(webSurfaceId ? { webSurfaceId } : {}),
          ...(storeId ? { storeId } : {}),
          occurredAt: { gte: startDate, lte: endDate },
        },
        _count: { _all: true },
      });

      const productIds = Array.from(new Set(aggregations.map((a) => a.productId).filter(Boolean))) as string[];
      if (productIds.length === 0) return [];

      const products = await tx.product.findMany({
        where: { id: { in: productIds }, tenantId },
        select: { id: true, name: true, sku: true, basePrice: true },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));
      const metricsMap = new Map<string, Record<string, number>>();

      for (const item of aggregations) {
        if (!item.productId) continue;
        if (!metricsMap.has(item.productId)) {
          metricsMap.set(item.productId, {});
        }
        metricsMap.get(item.productId)![item.eventType] = item._count._all;
      }

      return productIds.map((pid) => {
        const prod = productMap.get(pid);
        const counts = metricsMap.get(pid) || {};
        const views = counts['PAGE_VIEW'] || 0;
        const callClicks = counts['CALL_CLICK'] || 0;
        const whatsappClicks = counts['WHATSAPP_CLICK'] || 0;
        const formSubmits = counts['FORM_SUBMIT'] || 0;
        const totalConversions = callClicks + whatsappClicks + formSubmits;

        return {
          productId: pid,
          productName: prod?.name || 'Unknown Product',
          sku: prod?.sku || null,
          basePrice: prod?.basePrice ? Number(prod.basePrice) : null,
          views,
          callClicks,
          whatsappClicks,
          formSubmits,
          totalConversions,
        };
      }).sort((a, b) => b.totalConversions - a.totalConversions);
    });
  }

  /**
   * Retrieves top converting pages.
   */
  public static async getPageConversions(params: {
    tenantId: string;
    brandId?: string | undefined;
    webSurfaceId?: string | undefined;
    storeId?: string | undefined;
    startDate: Date;
    endDate: Date;
    limit?: number | undefined;
  }): Promise<PageConversionDto[]> {
    const { tenantId, brandId, webSurfaceId, storeId, startDate, endDate, limit = 15 } = params;

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const aggregations = await tx.attributionEvent.groupBy({
        by: ['currentPath', 'pageType', 'eventType'],
        where: {
          tenantId,
          currentPath: { not: null },
          ...(brandId ? { brandId } : {}),
          ...(webSurfaceId ? { webSurfaceId } : {}),
          ...(storeId ? { storeId } : {}),
          occurredAt: { gte: startDate, lte: endDate },
        },
        _count: { _all: true },
      });

      const pageMap = new Map<string, { pageType?: string | null; views: number; conversions: number }>();

      for (const item of aggregations) {
        const path = item.currentPath || '/';
        if (!pageMap.has(path)) {
          pageMap.set(path, { pageType: item.pageType, views: 0, conversions: 0 });
        }
        const entry = pageMap.get(path)!;
        if (item.eventType === 'PAGE_VIEW') {
          entry.views += item._count._all;
        } else if (
          item.eventType === 'CALL_CLICK' ||
          item.eventType === 'WHATSAPP_CLICK' ||
          item.eventType === 'DIRECTIONS_CLICK' ||
          item.eventType === 'FORM_SUBMIT' ||
          item.eventType === 'BOOKING_COMPLETE'
        ) {
          entry.conversions += item._count._all;
        }
      }

      return Array.from(pageMap.entries()).map(([path, data]) => ({
        path,
        pageType: data.pageType || null,
        views: data.views,
        conversions: data.conversions,
        conversionRate: data.views > 0 ? Number(((data.conversions / data.views) * 100).toFixed(2)) : 0,
      })).sort((a, b) => b.conversions - a.conversions).slice(0, limit);
    });
  }
}
