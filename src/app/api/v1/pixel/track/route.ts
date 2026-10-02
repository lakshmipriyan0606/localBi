import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { VisitorService } from '@/modules/visitors/visitor-service';
import { MicrositeService } from '@/modules/microsites/microsite-service';
import { AttributionService } from '@/modules/attribution/attribution-service';
import { prisma } from '@/shared/database/client';
import type { AttributionEventType } from '@prisma/client';

const TrackPayloadSchema = z.object({
  subdomain: z.string().min(1).max(100).optional(),
  tenantSlug: z.string().min(1).max(100).optional(),
  deviceFingerprint: z.string().max(128).optional(),
  visitorId: z.string().max(128).optional(),
  sessionId: z.string().max(128).optional(),
  brandId: z.string().max(100).optional(),
  webSurfaceId: z.string().max(100).optional(),
  pageId: z.string().max(100).optional(),
  pageType: z.string().max(100).optional(),
  storeId: z.string().max(100).optional(),
  productId: z.string().max(100).optional(),
  categoryId: z.string().max(100).optional(),
  url: z.string().max(2048).default('/'),
  landingPath: z.string().max(2048).optional(),
  title: z.string().max(200).optional(),
  platform: z.string().max(100).optional(),
  browser: z.string().max(100).optional(),
  screenResolution: z.string().max(50).optional(),
  timezone: z.string().max(100).optional(),
  referrer: z.string().max(2048).optional(),
  dwellTimeSeconds: z.number().int().min(0).max(86400).optional(),
  utmSource: z.string().max(100).optional(),
  utmMedium: z.string().max(100).optional(),
  utmCampaign: z.string().max(100).optional(),
  utmContent: z.string().max(100).optional(),
  utmTerm: z.string().max(100).optional(),
  gclid: z.string().max(200).optional(),
  eventType: z.string().default('page_view'),
  metadata: z.record(z.unknown()).optional(),
  identifiedUser: z
    .object({
      phone: z.string().max(50).optional(),
      name: z.string().max(100).optional(),
      email: z.string().email().max(100).optional(),
    })
    .optional(),
});

function normalizeEventType(raw: string): AttributionEventType {
  const lower = raw.toLowerCase().trim();
  switch (lower) {
    case 'click_call':
    case 'phone_call':
    case 'call_click':
      return 'CALL_CLICK';
    case 'whatsapp_click':
      return 'WHATSAPP_CLICK';
    case 'directions_click':
      return 'DIRECTIONS_CLICK';
    case 'form_start':
      return 'FORM_START';
    case 'form_submit':
    case 'lead_form_submit':
      return 'FORM_SUBMIT';
    case 'booking_start':
      return 'BOOKING_START';
    case 'booking_complete':
      return 'BOOKING_COMPLETE';
    case 'cta_click':
      return 'CTA_CLICK';
    case 'localbi_page_view':
    case 'page_view':
    case 'menu_view':
    default:
      return 'PAGE_VIEW';
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Payload size protection (max 64KB)
    const rawBody = await req.text();
    if (rawBody.length > 65536) {
      return NextResponse.json({ error: 'Payload size exceeded' }, { status: 413 });
    }

    let json: unknown;
    try {
      json = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    // 2. Strict Zod Validation
    const parsed = TrackPayloadSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid tracking payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const {
      subdomain,
      tenantSlug,
      deviceFingerprint,
      visitorId,
      sessionId,
      url,
      landingPath,
      title,
      platform,
      browser,
      screenResolution,
      timezone,
      referrer,
      dwellTimeSeconds,
      eventType: rawEventType,
      identifiedUser,
      storeId,
      productId,
      categoryId,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      gclid,
      metadata,
    } = data;

    // 3. Trusted Server-Side Resolution of Tenant, Brand, and WebSurface
    // Never trust client-supplied tenantId directly
    let resolvedTenantId: string | null = null;
    let resolvedBrandId: string | null = null;
    let resolvedWebSurfaceId: string | null = null;
    let resolvedTenantSlug: string | null = null;
    let micrositeId: string | null = null;

    // If webSurfaceId and brandId provided, verify against DB
    if (data.webSurfaceId && data.brandId) {
      const surface = await prisma.webSurface.findFirst({
        where: { id: data.webSurfaceId, brandId: data.brandId },
        include: { tenant: { select: { id: true, slug: true } } },
      });
      if (surface) {
        resolvedTenantId = surface.tenantId;
        resolvedBrandId = surface.brandId;
        resolvedWebSurfaceId = surface.id;
        resolvedTenantSlug = surface.tenant.slug;
      }
    }

    // Fallback: Resolve via subdomain or tenantSlug
    if (!resolvedTenantId) {
      const siteKey = subdomain || tenantSlug || '';
      if (!siteKey) {
        return NextResponse.json(
          { error: 'A valid website identifier (subdomain or tenantSlug) is required.' },
          { status: 400 }
        );
      }

      const publishedSite = await MicrositeService.resolvePublishedMicrosite(siteKey);
      if (publishedSite) {
        resolvedTenantId = publishedSite.tenantId;
        resolvedTenantSlug = publishedSite.tenantSlug;
        micrositeId = publishedSite.id;

        // Find primary brand and web surface for this tenant
        const defaultSurface = await prisma.webSurface.findFirst({
          where: { tenantId: resolvedTenantId, type: 'LOCALBI' },
          select: { id: true, brandId: true },
        });

        if (defaultSurface) {
          resolvedBrandId = defaultSurface.brandId;
          resolvedWebSurfaceId = defaultSurface.id;
        } else {
          const firstBrand = await prisma.brand.findFirst({
            where: { tenantId: resolvedTenantId },
            select: { id: true },
          });
          if (firstBrand) {
            resolvedBrandId = firstBrand.id;
            const surface = await prisma.webSurface.findFirst({
              where: { tenantId: resolvedTenantId, brandId: firstBrand.id },
              select: { id: true },
            });
            resolvedWebSurfaceId = surface?.id || null;
          }
        }
      }
    }

    if (!resolvedTenantId) {
      return NextResponse.json(
        { error: 'Published storefront not found for the provided identifier.' },
        { status: 404 }
      );
    }

    // 4. Legacy Identity Stitching Event
    if (rawEventType === 'identify' && identifiedUser?.phone && deviceFingerprint) {
      const legacySession = await VisitorService.identifyVisitor({
        tenantId: resolvedTenantId,
        deviceFingerprint,
        phone: identifiedUser.phone,
        name: identifiedUser.name,
        email: identifiedUser.email,
      });
      return NextResponse.json({ success: true, identified: true, session: legacySession });
    }

    // 5. Canonical Phase 5 Attribution Event Ingestion
    const canonicalEventType = normalizeEventType(rawEventType);
    let attrEvent = null;

    if (resolvedBrandId && resolvedWebSurfaceId) {
      attrEvent = await AttributionService.recordEvent({
        tenantId: resolvedTenantId,
        brandId: resolvedBrandId,
        webSurfaceId: resolvedWebSurfaceId,
        pageId: data.pageId || null,
        pageType: data.pageType || null,
        storeId: storeId || null,
        productId: productId || null,
        categoryId: categoryId || null,
        visitorId: visitorId || deviceFingerprint || null,
        sessionId: sessionId || null,
        eventType: canonicalEventType,
        currentPath: url,
        landingPath: landingPath || url,
        referrer,
        utmSource,
        utmMedium,
        utmCampaign,
        utmContent,
        utmTerm,
        gclid,
        devicePlatform: platform || null,
        browser: browser || (req.headers.get('user-agent') || '').substring(0, 40),
        metadata: metadata || null,
      });
    }

    // 6. Legacy Telemetry Event (Backward compatibility for existing test suite)
    let legacySession = null;
    if (deviceFingerprint) {
      legacySession = await VisitorService.recordEvent({
        tenantId: resolvedTenantId,
        tenantSlug: resolvedTenantSlug || 'tenant',
        micrositeId: micrositeId || null,
        deviceFingerprint,
        url,
        title: title || 'Page',
        platform,
        browser: browser || (req.headers.get('user-agent') || '').substring(0, 40),
        screenResolution,
        timezone,
        referrer,
        dwellTimeSeconds,
        eventType: (['page_view', 'whatsapp_click', 'phone_call', 'menu_view'].includes(rawEventType)
          ? rawEventType
          : 'page_view') as 'page_view' | 'whatsapp_click' | 'phone_call' | 'menu_view',
      });
    }

    return NextResponse.json({
      success: true,
      event: attrEvent ? { id: attrEvent.id, eventType: attrEvent.eventType } : null,
      session: legacySession,
    });
  } catch (error) {
    console.error('Error logging visitor pixel beacon:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
