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

    const item = await ContentService.getContentItemById(
      tenant.id,
      contentId,
      authorizedContext
    );

    return NextResponse.json({ content: item });
  } catch (error) {
    return handleRouteError(error, 'Failed to fetch content item');
  }
}

export async function PUT(
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

    const updated = await ContentService.updateContentItem(
      tenant.id,
      contentId,
      {
        title: body.title,
        slug: body.slug,
        excerpt: body.excerpt,
        contentMarkdown: body.contentMarkdown,
        contentBlocks: body.contentBlocks,
        seoTitle: body.seoTitle,
        seoDescription: body.seoDescription,
        canonicalUrl: body.canonicalUrl,
        ogImageUrl: body.ogImageUrl,
        featuredImageUrl: body.featuredImageUrl,
        featuredImageAlt: body.featuredImageAlt,
        authorId: body.authorId,
        categoryId: body.categoryId,
        webSurfaceId: body.webSurfaceId,
        briefId: body.briefId,
        type: body.type,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        changeSummary: body.changeSummary,
        origin: body.origin,
        userId: authorizedContext.userId,
        expectedVersionNumber: body.expectedVersionNumber,
      },
      authorizedContext
    );

    return NextResponse.json({ content: updated });
  } catch (error) {
    return handleRouteError(error, 'Failed to update content item');
  }
}
