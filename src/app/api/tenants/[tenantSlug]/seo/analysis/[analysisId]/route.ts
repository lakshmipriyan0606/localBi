import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/shared/database/client';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { SeoAnalysisRepository } from '@/modules/seo-intelligence/seo-analysis-repository';
import { handleRouteError } from '@/shared/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; analysisId: string }> }
) {
  try {
    const { tenantSlug, analysisId } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized');

    const analysis = await SeoAnalysisRepository.findById(authorizedContext.tenantId, analysisId);
    if (!analysis) {
      return NextResponse.json({ success: false, error: 'Analysis record not found' }, { status: 404 });
    }

    // Load related opportunities with their evidence
    const opportunities = await prisma.opportunity.findMany({
      where: {
        tenantId: authorizedContext.tenantId,
        id: { in: analysis.createdOpportunityIds },
      },
      include: {
        evidence: true,
      },
      orderBy: { priorityScore: 'desc' },
    });

    return NextResponse.json({
      success: true,
      analysis,
      opportunities,
    });
  } catch (error) {
    return handleRouteError(error, 'Failed to fetch SEO analysis details');
  }
}
