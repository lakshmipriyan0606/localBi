import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { MicrositeService, MicrositeConfig } from '@/modules/microsites/microsite-service';
import { TenantContextService } from '@/shared/database/tenant-context';
import { prisma } from '@/shared/database/client';
import { handleRouteError } from '@/shared/errors';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantSlug = searchParams.get('tenantSlug');
    if (!tenantSlug) {
      return NextResponse.json({ error: 'Missing tenantSlug query parameter' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);
    const { tenant, authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);

    if (!authorizedContext || !tenant) {
      return NextResponse.json({ error: 'Tenant context not found or access denied' }, { status: 403 });
    }

    AuthorizationService.assertCan(authorizedContext, Action.MICROSITE_VIEW);

    const sites = await MicrositeService.getAllMicrosites(tenant.id);
    return NextResponse.json({ microsites: sites });
  } catch (error) {
    return handleRouteError(error, 'Error fetching microsites');
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subdomain, tenantSlug, brandName } = body;

    if (!subdomain || !brandName || !tenantSlug) {
      return NextResponse.json({ error: 'Subdomain, Brand Name, and tenantSlug are required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);
    const { tenant, authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);

    if (!authorizedContext || !tenant) {
      return NextResponse.json({ error: 'Tenant context not found or access denied' }, { status: 403 });
    }

    AuthorizationService.assertCan(authorizedContext, Action.MICROSITE_CREATE);

    const cleanSubdomain = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');

    // Prevent duplicate subdomain registrations within tenant
    const existing = await TenantContextService.withTenantContext(
      prisma,
      tenant.id,
      async (tx) => {
        return tx.microsite.findFirst({
          where: { subdomain: cleanSubdomain },
        });
      }
    );
    if (existing) {
      return NextResponse.json({ error: `Subdomain "${cleanSubdomain}" is already registered` }, { status: 409 });
    }

    const newConfig: Partial<MicrositeConfig> & { subdomain: string; tenantSlug: string; brandName: string } = {
      subdomain: cleanSubdomain,
      tenantSlug: tenant.slug,
      brandId: body.brandId,
      brandName: brandName.trim(),
      locationId: body.locationId,
      locationName: body.locationName,
      tagline: body.tagline || 'Leading brand destination for quality, authenticity, and dedicated service.',
      aboutStory: body.aboutStory || `${brandName} brings premium products, trusted expertise, and dedicated customer support to our local community.`,
      primaryColor: body.primaryColor || '#4F46E5',
      secondaryColor: body.secondaryColor || '#059669',
      font: body.font || 'Inter',
      phone: body.phone || '',
      whatsapp: body.whatsapp || '',
      address: body.address || '',
      city: body.city || '',
      state: body.state || '',
      postalCode: body.postalCode || '',
      hours: body.hours || '9:00 AM - 9:00 PM',
      googleRating: body.googleRating ?? 4.9,
      reviewCount: body.reviewCount ?? 120,
      googleMapsUrl: body.googleMapsUrl || `https://maps.google.com/?q=${encodeURIComponent(body.address || brandName)}`,
      heroImageUrl: body.heroImageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
      published: body.published ?? true,
      status: body.published ? 'PUBLISHED' : 'DRAFT',
      customDomain: body.customDomain ? body.customDomain.trim() : undefined,
      industry: body.industry || 'FOOD',
      templateId: body.templateId || 'restaurant',
      theme: body.theme,
      pages: body.pages,
      menuItems: body.menuItems || [],
    };

    const created = await MicrositeService.createMicrosite(tenant.id, newConfig);
    return NextResponse.json({ success: true, microsite: created });
  } catch (error) {
    return handleRouteError(error, 'Error creating microsite');
  }
}
