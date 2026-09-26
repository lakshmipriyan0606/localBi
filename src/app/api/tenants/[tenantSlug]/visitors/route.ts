import { NextRequest, NextResponse } from 'next/server';
import { VisitorService } from '@/modules/visitors/visitor-service';

export async function GET(
  _req: NextRequest,
  segmentData: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await segmentData.params;

    const [visitors, stats] = await Promise.all([
      VisitorService.getTenantVisitors(tenantSlug),
      VisitorService.getTenantVisitorStats(tenantSlug),
    ]);

    return NextResponse.json({
      visitors,
      stats,
      realCount: visitors.length,
    });
  } catch (error) {
    console.error('Error fetching tenant visitors:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  segmentData: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await segmentData.params;
    await VisitorService.clearRealVisitors(tenantSlug);
    return NextResponse.json({ success: true, message: 'Visitor logs reset successfully.' });
  } catch (error) {
    console.error('Error resetting visitors:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
