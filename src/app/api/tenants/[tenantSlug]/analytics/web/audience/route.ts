import { NextRequest, NextResponse } from 'next/server';
import { resolveWebAnalyticsContext } from '../route-helper';
import { WebAnalyticsService } from '@/modules/analytics/web-analytics-service';
import { handleRouteError } from '@/shared/errors';

export async function GET(
  req: NextRequest,
  segmentData: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await segmentData.params;
    const { filter } = await resolveWebAnalyticsContext(req, tenantSlug);
    const audience = await WebAnalyticsService.getAudience(filter);
    return NextResponse.json(audience);
  } catch (error) {
    return handleRouteError(error, 'Error fetching audience analytics');
  }
}
