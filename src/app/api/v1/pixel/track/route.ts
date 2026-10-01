import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { VisitorService } from '@/modules/visitors/visitor-service';
import { MicrositeService } from '@/modules/microsites/microsite-service';

const TrackPayloadSchema = z.object({
  subdomain: z.string().min(1).max(100).optional(),
  tenantSlug: z.string().min(1).max(100).optional(),
  deviceFingerprint: z.string().min(6).max(128),
  url: z.string().max(2048).default('/'),
  title: z.string().max(200).optional(),
  platform: z.string().max(100).optional(),
  browser: z.string().max(100).optional(),
  screenResolution: z.string().max(50).optional(),
  timezone: z.string().max(100).optional(),
  referrer: z.string().max(2048).optional(),
  dwellTimeSeconds: z.number().int().min(0).max(86400).optional(),
  eventType: z.enum(['page_view', 'whatsapp_click', 'phone_call', 'menu_view', 'identify']).default('page_view'),
  identifiedUser: z.object({
    phone: z.string().max(50).optional(),
    name: z.string().max(100).optional(),
    email: z.string().email().max(100).optional(),
  }).optional(),
});

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

    const {
      subdomain,
      tenantSlug,
      deviceFingerprint,
      url,
      title,
      platform,
      browser,
      screenResolution,
      timezone,
      referrer,
      dwellTimeSeconds,
      eventType,
      identifiedUser,
    } = parsed.data;

    // 3. Trusted Server-Side Resolution of Published Storefront
    // Derive tenant identity strictly from published website state, NOT client-supplied tenantId
    const siteKey = subdomain || tenantSlug || '';
    if (!siteKey) {
      return NextResponse.json(
        { error: 'A valid website identifier (subdomain) is required.' },
        { status: 400 }
      );
    }

    const publishedSite = await MicrositeService.resolvePublishedMicrosite(siteKey);
    if (!publishedSite) {
      return NextResponse.json(
        { error: 'Published storefront not found for the provided identifier.' },
        { status: 404 }
      );
    }

    const { tenantId, tenantSlug: resolvedTenantSlug, id: micrositeId } = publishedSite;

    // 4. Identity Stitching Event
    if (eventType === 'identify' && identifiedUser?.phone) {
      const session = await VisitorService.identifyVisitor({
        tenantId,
        deviceFingerprint,
        phone: identifiedUser.phone,
        name: identifiedUser.name,
        email: identifiedUser.email,
      });
      return NextResponse.json({ success: true, identified: true, session });
    }

    // 5. Standard Telemetry Event (Persisted under verified tenant context with RLS)
    const session = await VisitorService.recordEvent({
      tenantId,
      tenantSlug: resolvedTenantSlug,
      micrositeId,
      deviceFingerprint,
      url,
      title: title || 'Page',
      platform,
      browser: browser || (req.headers.get('user-agent') || '').substring(0, 40),
      screenResolution,
      timezone,
      referrer,
      dwellTimeSeconds,
      eventType: eventType as 'page_view' | 'whatsapp_click' | 'phone_call' | 'menu_view',
    });

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error('Error logging visitor pixel beacon:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
