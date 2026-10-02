import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { AiContentService } from '@/modules/content/ai-content-service';
import { handleRouteError } from '@/shared/errors';

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

    AuthorizationService.assertCan(authorizedContext, Action.AI_CONTENT_GENERATE);

    const body = await request.json();
    const {
      brandId,
      briefId,
      opportunityId,
      primaryKeyword,
      targetAudience,
      suggestedTitle,
      contentType = 'ARTICLE',
      saveAsDraft = false,
      customInstructions,
    } = body;

    if (!brandId) {
      return NextResponse.json({ error: 'brandId is required' }, { status: 400 });
    }
    if (!primaryKeyword) {
      return NextResponse.json({ error: 'primaryKeyword is required' }, { status: 400 });
    }

    const aiRequest = {
      tenantId: tenant.id,
      brandId,
      briefId,
      opportunityId,
      primaryKeyword,
      targetAudience,
      suggestedTitle,
      contentType,
      userId: authorizedContext.userId,
      customInstructions,
    };

    if (saveAsDraft) {
      // Generates and persists directly in DRAFT status with audit trail
      const item = await AiContentService.createDraftContentItem(
        aiRequest,
        authorizedContext
      );
      return NextResponse.json({ content: item }, { status: 201 });
    }

    // Only generates the draft result preview
    const draft = await AiContentService.generateDraft(
      aiRequest,
      authorizedContext
    );

    return NextResponse.json({ draft });
  } catch (error) {
    return handleRouteError(error, 'Failed to generate AI content draft');
  }
}
