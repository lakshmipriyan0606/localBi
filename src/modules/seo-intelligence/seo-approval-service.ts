import { prisma } from '@/shared/database/client';
import { logger } from '@/shared/observability/logger';
import { AuthorizedContext, AuthorizationService, Action } from '@/shared/authorization/policy';
import { SeoApprovalStatus, SeoApprovalStatusValue } from './seo-types';

export interface ReviewRecommendationParams {
  tenantId: string;
  opportunityId: string;
  decision: 'APPROVE' | 'EDIT' | 'REJECT';
  customValue?: string | null;
  notes?: string | null;
}

export class SeoApprovalService {
  /**
   * Reviews an AI recommendation.
   * GUARANTEE: Original AI suggestion is IMMUTABLE.
   * If user edits, originalSuggestion is preserved and approvedValue is saved separately.
   */
  public static async reviewRecommendation(
    params: ReviewRecommendationParams,
    context: AuthorizedContext
  ): Promise<{
    opportunityId: string;
    newStatus: string;
    originalSuggestion: string;
    approvedValue: string | null;
  }> {
    AuthorizationService.assertCan(context, Action.OPPORTUNITY_MANAGE);

    const opp = await prisma.opportunity.findFirst({
      where: {
        id: params.opportunityId,
        tenantId: params.tenantId,
      },
    });

    if (!opp) {
      throw new Error(`Opportunity "${params.opportunityId}" not found in current tenant.`);
    }

    const payload = (opp.actionPayload as Record<string, any>) || {};
    const originalSuggestion = payload['originalSuggestion'] || opp.title;

    let newStatus: string = opp.status;
    let approvedValue: string | null = null;
    let approvalState: SeoApprovalStatusValue = SeoApprovalStatus.PENDING_REVIEW;

    if (params.decision === 'APPROVE') {
      newStatus = 'ACCEPTED';
      approvalState = SeoApprovalStatus.APPROVED;
      approvedValue = originalSuggestion;
    } else if (params.decision === 'EDIT') {
      newStatus = 'ACCEPTED';
      approvalState = SeoApprovalStatus.EDITED;
      approvedValue = params.customValue?.trim() || originalSuggestion;
    } else if (params.decision === 'REJECT') {
      newStatus = 'DISMISSED';
      approvalState = SeoApprovalStatus.REJECTED;
      approvedValue = null;
    }

    const updatedPayload = {
      ...payload,
      originalSuggestion, // Kept completely intact!
      approvedValue,
      approvalState,
      reviewedBy: context.userId,
      reviewedAt: new Date().toISOString(),
      reviewNotes: params.notes ?? null,
    };

    await prisma.opportunity.update({
      where: { id: opp.id },
      data: {
        status: newStatus,
        actionPayload: updatedPayload as any,
        acceptedAt: params.decision !== 'REJECT' ? new Date() : null,
        acceptedBy: params.decision !== 'REJECT' ? context.userId : null,
        dismissedAt: params.decision === 'REJECT' ? new Date() : null,
        dismissedBy: params.decision === 'REJECT' ? context.userId : null,
        dismissalReason: params.decision === 'REJECT' ? params.notes || 'Human rejected recommendation' : null,
        updatedAt: new Date(),
      },
    });

    logger.info(
      { opportunityId: opp.id, decision: params.decision, approvedValue },
      '[SeoApprovalService] Recommendation reviewed'
    );

    return {
      opportunityId: opp.id,
      newStatus,
      originalSuggestion,
      approvedValue,
    };
  }
}
