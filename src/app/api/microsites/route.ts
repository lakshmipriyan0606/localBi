import { NextRequest, NextResponse } from 'next/server';
import { MicrositeService, MicrositeConfig } from '@/modules/microsites/microsite-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantSlug = searchParams.get('tenantSlug') || 'lakshmi-food';

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
    const { subdomain, tenantSlug, brandName, address, phone, whatsapp, industry, customDomain } = body;

    if (!subdomain || !brandName) {
      return NextResponse.json({ error: 'Subdomain and Brand Name are required' }, { status: 400 });
    }

    const cleanSubdomain = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');

    const newConfig: MicrositeConfig = {
      subdomain: cleanSubdomain,
      tenantSlug: tenantSlug || 'lakshmi-food',
      brandName: brandName.trim(),
      tagline: body.tagline || 'Leading brand destination for quality and service.',
      aboutStory: body.aboutStory || `${brandName} brings premium products, trusted expertise, and dedicated customer support to our local community.`,
      primaryColor: '#4F46E5',
      phone: phone || '',
      whatsapp: whatsapp || '',
      address: address || '',
      city: body.city || 'Chennai',
      hours: body.hours || '9:00 AM - 9:00 PM',
      googleRating: 4.9,
      reviewCount: 1,
      googleMapsUrl: body.googleMapsUrl || `https://maps.google.com/?q=${encodeURIComponent(address || brandName)}`,
      heroImageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
      published: true,
      customDomain: customDomain ? customDomain.trim() : undefined,
      industry: industry || 'FOOD',
      menuItems: [],
    };

    const created = await MicrositeService.createMicrosite(newConfig);
    return NextResponse.json({ success: true, microsite: created });
  } catch (error) {
    console.error('Error creating microsite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
