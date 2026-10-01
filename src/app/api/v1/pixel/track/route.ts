import { NextRequest, NextResponse } from 'next/server';
import { VisitorService } from '@/modules/visitors/visitor-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userAgentHeader = req.headers.get('user-agent') || '';
    const {
      tenantSlug,
      deviceFingerprint,
      url = '/',
      title = 'Page',
      platform,
      browser = userAgentHeader.substring(0, 40),
      screenResolution,
      timezone,
      referrer,
      dwellTimeSeconds,
      eventType = 'page_view',
      identifiedUser,
    } = body;

    if (!tenantSlug) {
      return NextResponse.json(
        { error: 'Missing tenantSlug in telemetry payload.' },
        { status: 400 }
      );
    }

    if (!deviceFingerprint) {
      return NextResponse.json(
        { error: 'Missing deviceFingerprint in telemetry payload.' },
        { status: 400 }
      );
    }

    if (eventType === 'identify' && identifiedUser?.phone) {
      const session = await VisitorService.identifyVisitor({
        deviceFingerprint,
        phone: identifiedUser.phone,
        name: identifiedUser.name,
        email: identifiedUser.email,
      });
      return NextResponse.json({ success: true, identified: true, session });
    }

    const session = await VisitorService.recordEvent({
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
      eventType: eventType as 'page_view' | 'whatsapp_click' | 'phone_call' | 'menu_view',
    });

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error('Error logging visitor pixel beacon:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
