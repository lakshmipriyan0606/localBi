import { NextRequest, NextResponse } from 'next/server';
import { MicrositeService } from '@/modules/microsites/microsite-service';

export async function GET(
  _req: NextRequest,
  segmentData: { params: Promise<{ subdomain: string }> }
) {
  try {
    const { subdomain } = await segmentData.params;
    const site = await MicrositeService.getMicrositeBySubdomain(subdomain);

    if (!site) {
      return NextResponse.json({ error: 'Microsite not found' }, { status: 404 });
    }

    return NextResponse.json({ microsite: site });
  } catch (error) {
    console.error('Error fetching microsite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  segmentData: { params: Promise<{ subdomain: string }> }
) {
  try {
    const { subdomain } = await segmentData.params;
    const body = await req.json();

    if (body.action === 'publish') {
      const published = await MicrositeService.publishMicrosite(subdomain);
      if (!published) {
        return NextResponse.json({ error: 'Microsite not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, microsite: published, message: 'Website published live!' });
    }

    if (body.action === 'unpublish') {
      const unpublished = await MicrositeService.unpublishMicrosite(subdomain);
      if (!unpublished) {
        return NextResponse.json({ error: 'Microsite not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, microsite: unpublished, message: 'Website set to draft.' });
    }

    if (body.action === 'connectDomain') {
      const withDomain = await MicrositeService.connectCustomDomain(subdomain, body.customDomain);
      if (!withDomain) {
        return NextResponse.json({ error: 'Microsite not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, microsite: withDomain, message: 'Custom domain connected!' });
    }

    const updated = await MicrositeService.updateMicrosite(subdomain, body);
    if (!updated) {
      return NextResponse.json({ error: 'Microsite not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, microsite: updated });
  } catch (error) {
    console.error('Error updating microsite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  segmentData: { params: Promise<{ subdomain: string }> }
) {
  try {
    const { subdomain } = await segmentData.params;
    const deleted = await MicrositeService.deleteMicrosite(subdomain);
    if (!deleted) {
      return NextResponse.json({ error: 'Microsite not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Microsite deleted successfully' });
  } catch (error) {
    console.error('Error deleting microsite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
