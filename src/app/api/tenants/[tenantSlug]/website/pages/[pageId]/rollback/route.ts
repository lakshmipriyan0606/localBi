import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { SiteStudioService } from '@/modules/page-builder/site-studio-service';
import { handleRouteError } from '@/shared/errors';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; pageId: string }> }
) {
  try {
    const { tenantSlug, pageId } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext, user } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized context missing');

    const body = await request.json();
    const { templateId, targetVersionNumber } = body;

    if (!templateId || !targetVersionNumber) {
      return NextResponse.json(
        { success: false, error: 'templateId and targetVersionNumber are required for rollback.' },
        { status: 400 }
      );
    }

    const result = await SiteStudioService.rollbackToVersion(
      authorizedContext.tenantId,
      templateId,
      Number(targetVersionNumber),
      user?.id
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return handleRouteError(error, 'Failed to rollback version.');
  }
}
