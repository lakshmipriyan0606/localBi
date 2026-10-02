import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { InternalLinkService } from '@/modules/content/internal-link-service';
import { handleRouteError } from '@/shared/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
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

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'suggestions';
    const contentId = searchParams.get('contentId');

    if (action === 'broken') {
      const broken = await InternalLinkService.auditBrokenLinks(
        tenant.id,
        authorizedContext
      );
      return NextResponse.json({ brokenLinks: broken });
    }

    if (action === 'orphans') {
      const orphans = await InternalLinkService.findOrphanContent(
        tenant.id,
        authorizedContext
      );
      return NextResponse.json({ orphans });
    }

    if (action === 'suggestions') {
      if (!contentId) {
        return NextResponse.json({ error: 'contentId parameter is required for suggestions' }, { status: 400 });
      }
      const suggestions = await InternalLinkService.generateLinkSuggestions(
        tenant.id,
        contentId,
        authorizedContext
      );
      return NextResponse.json({ suggestions });
    }

    return NextResponse.json({ error: `Unknown action '${action}'` }, { status: 400 });
  } catch (error) {
    return handleRouteError(error, 'Failed to process internal links request');
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
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

    const relation = await InternalLinkService.createContentRelation(
      tenant.id,
      {
        contentItemId: body.contentItemId,
        targetType: body.targetType,
        targetId: body.targetId,
        sortOrder: body.sortOrder,
        notes: body.notes,
      },
      authorizedContext
    );

    return NextResponse.json({ relation }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, 'Failed to create content relation');
  }
}
