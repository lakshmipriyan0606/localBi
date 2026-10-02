import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { LeadService } from '@/modules/leads/lead-service';
import { MicrositeService } from '@/modules/microsites/microsite-service';
import { prisma } from '@/shared/database/client';

const CreateLeadSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  phone: z.string().min(6, 'Valid phone number is required').max(50),
  email: z.string().email().max(100).optional().or(z.literal('')),
  message: z.string().max(2000).optional().or(z.literal('')),
  storeId: z.string().max(100).optional().or(z.literal('')),
  productId: z.string().max(100).optional().or(z.literal('')),
  idempotencyKey: z.string().max(128).optional(),
  visitorId: z.string().max(128).optional(),
  sessionId: z.string().max(128).optional(),
  subdomain: z.string().max(100).optional(),
  tenantSlug: z.string().max(100).optional(),
  brandId: z.string().max(100).optional(),
  webSurfaceId: z.string().max(100).optional(),
  currentPath: z.string().max(2048).optional(),
  landingPath: z.string().max(2048).optional(),
  referrer: z.string().max(2048).optional(),
  utmSource: z.string().max(100).optional(),
  utmMedium: z.string().max(100).optional(),
  utmCampaign: z.string().max(100).optional(),
  utmContent: z.string().max(100).optional(),
  utmTerm: z.string().max(100).optional(),
  gclid: z.string().max(200).optional(),
  _hp_company: z.string().max(100).optional(), // Honeypot field
});

// Simple in-memory rate-limiter for public lead submission abuse prevention
const leadRateLimitMap = new Map<string, { count: number; expiresAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = leadRateLimitMap.get(ip);
  if (!entry || entry.expiresAt < now) {
    leadRateLimitMap.set(ip, { count: 1, expiresAt: now + 300_000 }); // 5 min window
    return true;
  }
  if (entry.count >= 15) {
    return false; // Exceeded limit
  }
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many submissions. Please wait a few minutes before trying again.' },
        { status: 429 }
      );
    }

    const rawBody = await req.text();
    if (rawBody.length > 32768) {
      return NextResponse.json({ error: 'Payload size exceeded' }, { status: 413 });
    }

    let json: unknown;
    try {
      json = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const parsed = CreateLeadSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Honeypot spam check: if _hp_company has any value, bot detected
    const isSpam = Boolean(data._hp_company && data._hp_company.trim().length > 0);

    // Trusted Server-Side Resolution of Tenant, Brand, and WebSurface
    let resolvedTenantId: string | null = null;
    let resolvedBrandId: string | null = null;
    let resolvedWebSurfaceId: string | null = null;

    if (data.webSurfaceId && data.brandId) {
      const surface = await prisma.webSurface.findFirst({
        where: { id: data.webSurfaceId, brandId: data.brandId },
      });
      if (surface) {
        resolvedTenantId = surface.tenantId;
        resolvedBrandId = surface.brandId;
        resolvedWebSurfaceId = surface.id;
      }
    }

    if (!resolvedTenantId) {
      const siteKey = data.subdomain || data.tenantSlug || '';
      if (!siteKey) {
        return NextResponse.json(
          { error: 'A valid website identifier is required.' },
          { status: 400 }
        );
      }

      const publishedSite = await MicrositeService.resolvePublishedMicrosite(siteKey);
      if (publishedSite) {
        resolvedTenantId = publishedSite.tenantId;

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

    if (!resolvedTenantId || !resolvedBrandId || !resolvedWebSurfaceId) {
      return NextResponse.json(
        { error: 'Unable to resolve tenant storefront context for lead submission.' },
        { status: 404 }
      );
    }

    // Verify Store & Product belong to resolved tenant to prevent cross-tenant tampering
    let verifiedStoreId: string | null = null;
    if (data.storeId && data.storeId.trim().length > 0) {
      const store = await prisma.location.findFirst({
        where: { id: data.storeId, tenantId: resolvedTenantId },
        select: { id: true },
      });
      if (store) {
        verifiedStoreId = store.id;
      }
    }

    let verifiedProductId: string | null = null;
    if (data.productId && data.productId.trim().length > 0) {
      const prod = await prisma.product.findFirst({
        where: { id: data.productId, tenantId: resolvedTenantId },
        select: { id: true },
      });
      if (prod) {
        verifiedProductId = prod.id;
      }
    }

    const lead = await LeadService.createLead({
      tenantId: resolvedTenantId,
      brandId: resolvedBrandId,
      webSurfaceId: resolvedWebSurfaceId,
      storeId: verifiedStoreId,
      productId: verifiedProductId,
      visitorId: data.visitorId || null,
      sessionId: data.sessionId || null,
      type: 'FORM',
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      message: data.message || null,
      idempotencyKey: data.idempotencyKey || null,
      referrer: data.referrer,
      currentPath: data.currentPath,
      landingPath: data.landingPath,
      utmSource: data.utmSource,
      utmMedium: data.utmMedium,
      utmCampaign: data.utmCampaign,
      utmContent: data.utmContent,
      utmTerm: data.utmTerm,
      gclid: data.gclid,
      isSpam,
    });

    return NextResponse.json({
      success: true,
      lead: {
        id: lead.id,
        status: lead.status,
        createdAt: lead.createdAt,
      },
    });
  } catch (error) {
    console.error('Error in lead submission API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
