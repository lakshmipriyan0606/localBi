import { NextRequest, NextResponse } from 'next/server';
import { VisitorService } from '@/modules/visitors/visitor-service';

export async function POST(
  req: NextRequest,
  segmentData: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await segmentData.params;
    const body = await req.json();
    const { deviceFingerprint, phone, name, email } = body;

    if (!deviceFingerprint || !phone) {
      return NextResponse.json(
        { error: 'deviceFingerprint and phone are required.' },
        { status: 400 }
      );
    }

    const updated = await VisitorService.identifyVisitor({
      deviceFingerprint,
      phone,
      name,
      email,
    });

    if (!updated) {
      return NextResponse.json(
        { error: 'Device session not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      session: updated,
      message: `Phone ${phone} successfully stitched to device ${deviceFingerprint} for ${tenantSlug}`,
    });
  } catch (error) {
    console.error('Error identifying visitor:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
