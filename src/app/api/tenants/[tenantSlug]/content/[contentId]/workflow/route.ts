import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { ContentService } from '@/modules/content/content-service';
import { handleRouteError } from '@/shared/errors';
import { ContentStatusValue } from '@/modules/content/content-types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; contentId: string }> }
) {
  try {
    const { tenantSlug, contentId } = await params;
    const cookieStore = await cookies();
    const token = SessionCookieManager.getSessionToken(cookieStore);

    const { tenant, authorizedContext } = await ContextResolver.resolveTenantContext(
      token,
      tenantSlug
    );

    if (!tenant || !authorizedContext) {
      return NextResponse.json({ error: 'Tenant context not found' }, { status: 404 });
    }

    const body = await request.json();
    const newStatus = body.status as ContentStatusValue;
    const rejectionReason = body.rejectionReason as string | undefined;

    const updated = await ContentService.transitionWorkflow(
      {
        tenantId: tenant.id,
        contentId,
        newStatus,
        userId: authorizedContext.userId,
        rejectionReason,
      },
      authorizedContext
    );

    return NextResponse.json({ content: updated });
  } catch (error) {
    return handleRouteError(error, 'Failed to transition workflow status');
  }
}
