import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { SeoAnalysisRepository } from '@/modules/seo-intelligence/seo-analysis-repository';
import { STAGE_DESCRIPTIONS } from '@/modules/seo-intelligence/seo-types';
import { handleRouteError } from '@/shared/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; jobId: string }> }
) {
  try {
    const { tenantSlug, jobId } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized');

    const record = await SeoAnalysisRepository.findById(authorizedContext.tenantId, jobId);
    if (!record) {
      return NextResponse.json({ success: false, error: 'Analysis job not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      job: {
        id: record.id,
        status: record.status,
        stage: record.stage,
        stageDescription: STAGE_DESCRIPTIONS[record.stage] || record.stage,
        progressPercent: record.progressPercent,
        errorMessage: record.errorMessage,
        completedAt: record.completedAt,
        unavailableParts: record.unavailableParts,
      },
    });
  } catch (error) {
    return handleRouteError(error, 'Failed to poll SEO analysis job');
  }
}
