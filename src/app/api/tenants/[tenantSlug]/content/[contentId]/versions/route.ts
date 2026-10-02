import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { ContentService } from '@/modules/content/content-service';
import { handleRouteError } from '@/shared/errors';

export async function GET(
  _request: NextRequest,
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

    AuthorizationService.assertCan(authorizedContext, Action.CONTENT_VIEW);

    const versions = await ContentService.listVersions(
      tenant.id,
      contentId,
      authorizedContext
    );

    return NextResponse.json({ versions });
  } catch (error) {
    return handleRouteError(error, 'Failed to list content versions');
  }
}

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

    AuthorizationService.assertCan(authorizedContext, Action.CONTENT_EDIT);

    const body = await request.json();
    const targetVersionId = body.targetVersionId as string;

    const restored = await ContentService.rollbackToVersion(
      tenant.id,
      contentId,
      targetVersionId,
      authorizedContext.userId,
      authorizedContext
    );

    return NextResponse.json({ content: restored });
  } catch (error) {
    return handleRouteError(error, 'Failed to rollback version');
  }
}
