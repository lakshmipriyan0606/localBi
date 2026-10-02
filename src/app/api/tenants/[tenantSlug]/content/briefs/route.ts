import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { ContentBriefService } from '@/modules/content/content-brief-service';
import { handleRouteError } from '@/shared/errors';
import { ContentBriefStatusValue } from '@/modules/content/content-types';

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
    const brandId = searchParams.get('brandId');
    const status = (searchParams.get('status') as ContentBriefStatusValue) || undefined;

    if (!brandId) {
      return NextResponse.json({ error: 'brandId query parameter is required' }, { status: 400 });
    }

    const briefs = await ContentBriefService.listBriefs(
      tenant.id,
      brandId,
      status,
      authorizedContext
    );

    return NextResponse.json({ briefs });
  } catch (error) {
    return handleRouteError(error, 'Failed to list content briefs');
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

    // If opportunityId provided, bridge directly from Opportunity Engine!
    if (body.opportunityId) {
      const brief = await ContentBriefService.createBriefFromOpportunity(
        tenant.id,
        body.opportunityId,
        authorizedContext.userId,
        authorizedContext
      );
      return NextResponse.json({ brief }, { status: 201 });
    }

    const created = await ContentBriefService.createBrief(
      {
        tenantId: tenant.id,
        brandId: body.brandId,
        opportunityId: body.opportunityId,
        keywordId: body.keywordId,
        workingTitle: body.workingTitle,
        primaryTopic: body.primaryTopic,
        primaryKeyword: body.primaryKeyword,
        secondaryKeywords: body.secondaryKeywords,
        intent: body.intent,
        targetAudience: body.targetAudience,
        relatedProductIds: body.relatedProductIds,
        relatedStoreIds: body.relatedStoreIds,
        relatedCategoryIds: body.relatedCategoryIds,
        requiredTopics: body.requiredTopics,
        notes: body.notes,
        userId: authorizedContext.userId,
      },
      authorizedContext
    );

    return NextResponse.json({ brief: created }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, 'Failed to create content brief');
  }
}
