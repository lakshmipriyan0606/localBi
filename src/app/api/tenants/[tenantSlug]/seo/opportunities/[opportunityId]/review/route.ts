import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { SeoApprovalService } from '@/modules/seo-intelligence/seo-approval-service';
import { handleRouteError } from '@/shared/errors';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; opportunityId: string }> }
) {
  try {
    const { tenantSlug, opportunityId } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized');

    const body = await request.json();
    const { decision, customValue, notes } = body;

    if (!decision || !['APPROVE', 'EDIT', 'REJECT'].includes(decision)) {
      return NextResponse.json(
        { success: false, error: 'Valid decision ("APPROVE", "EDIT", "REJECT") is required.' },
        { status: 400 }
      );
    }

    const result = await SeoApprovalService.reviewRecommendation(
      {
        tenantId: authorizedContext.tenantId,
        opportunityId,
        decision,
        customValue,
        notes,
      },
      authorizedContext
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return handleRouteError(error, 'Failed to review recommendation');
  }
}
