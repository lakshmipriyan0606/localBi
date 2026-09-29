import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { GbpReviewsService } from '@/modules/reports/gbp-reviews-service';
import { handleRouteError } from '@/shared/errors';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; reviewId: string }> }
) {
  try {
    const { tenantSlug, reviewId } = await params;
    const cookieStore = await cookies();
    const token = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext, tenant } = await ContextResolver.resolveTenantContext(
      token,
      tenantSlug
    );

    if (!tenant || !authorizedContext) {
      return NextResponse.json({ error: 'Tenant context not found' }, { status: 404 });
    }

    const body = await request.json();
    const { comment } = body;

    const data = await GbpReviewsService.replyToReview(
      tenant.id,
      reviewId,
      comment,
      authorizedContext
    );

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; reviewId: string }> }
) {
  try {
    const { tenantSlug, reviewId } = await params;
    const cookieStore = await cookies();
    const token = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext, tenant } = await ContextResolver.resolveTenantContext(
      token,
      tenantSlug
    );

    if (!tenant || !authorizedContext) {
      return NextResponse.json({ error: 'Tenant context not found' }, { status: 404 });
    }

    const data = await GbpReviewsService.deleteReply(
      tenant.id,
      reviewId,
      authorizedContext
    );

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleRouteError(error);
  }
}
