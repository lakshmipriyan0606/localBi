import { NextRequest, NextResponse } from 'next/server';
import { MicrositeService, MicrositeConfig } from '@/modules/microsites/microsite-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantSlug = searchParams.get('tenantSlug');
    if (!tenantSlug) {
      return NextResponse.json({ error: 'Missing tenantSlug query parameter' }, { status: 400 });
    }

    const sites = await MicrositeService.getAllMicrosites(tenantSlug);
    return NextResponse.json({ microsites: sites });
  } catch (error) {
    console.error('Error fetching all microsites:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subdomain, tenantSlug, brandName } = body;

    if (!subdomain || !brandName || !tenantSlug) {
      return NextResponse.json({ error: 'Subdomain, Brand Name, and tenantSlug are required' }, { status: 400 });
    }

    const cleanSubdomain = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');

    const newConfig: Partial<MicrositeConfig> & { subdomain: string; tenantSlug: string; brandName: string } = {
      subdomain: cleanSubdomain,
      tenantSlug,
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

    const created = await MicrositeService.createMicrosite(newConfig);
    return NextResponse.json({ success: true, microsite: created });
  } catch (error) {
    console.error('Error creating microsite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
