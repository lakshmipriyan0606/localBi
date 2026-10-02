import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { ContentService } from '@/modules/content/content-service';
import { handleRouteError } from '@/shared/errors';
import {
  ContentTypeValue,
  ContentStatusValue,
} from '@/modules/content/content-types';

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
    const brandId = searchParams.get('brandId') || undefined;
    const webSurfaceId = searchParams.get('webSurfaceId') || undefined;
    const type = (searchParams.get('type') as ContentTypeValue) || undefined;
    const status = (searchParams.get('status') as ContentStatusValue) || undefined;
    const categoryId = searchParams.get('categoryId') || undefined;
    const authorId = searchParams.get('authorId') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const result = await ContentService.listContentItems(
      {
        tenantId: tenant.id,
        brandId,
        webSurfaceId,
        type,
        status,
        categoryId,
        authorId,
        search,
        page,
        limit,
      },
      authorizedContext
    );

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error, 'Failed to list content items');
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

    AuthorizationService.assertCan(authorizedContext, Action.CONTENT_CREATE);

    const body = await request.json();

    const created = await ContentService.createContentItem(
      {
        tenantId: tenant.id,
        brandId: body.brandId,
        webSurfaceId: body.webSurfaceId,
        briefId: body.briefId,
        authorId: body.authorId,
        categoryId: body.categoryId,
        type: body.type || 'ARTICLE',
        title: body.title,
        slug: body.slug,
        excerpt: body.excerpt,
        contentMarkdown: body.contentMarkdown,
        contentBlocks: body.contentBlocks,
        seoTitle: body.seoTitle || body.metaTitle,
        seoDescription: body.seoDescription || body.metaDescription,
        canonicalUrl: body.canonicalUrl,
        ogImageUrl: body.ogImageUrl,
        featuredImageUrl: body.featuredImageUrl,
        origin: body.origin,
        userId: authorizedContext.userId,
        changeSummary: body.changeSummary,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      },
      authorizedContext
    );

    return NextResponse.json({ content: created }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, 'Failed to create content item');
  }
}
