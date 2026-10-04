import { prisma } from '@/shared/database/client';
import { logger } from '@/shared/observability/logger';
import { AuthorizedContext, AuthorizationService, Action } from '@/shared/authorization/policy';
import { SeoApprovalStatus } from './seo-types';

export interface ApplyRecommendationParams {
  tenantId: string;
  opportunityId: string;
}

export interface ApplyResult {
  opportunityId: string;
  appliedMode: 'LOCALBI_DRAFT' | 'EXTERNAL_TASK';
  targetUrl: string;
  targetField: string;
  appliedValue: string;
  message: string;
}

export class SeoDraftApplier {
  /**
   * Applies an approved recommendation.
   * Mode A (LOCALBI): Safely writes to Page SEO draft. NEVER auto-publishes.
   * Mode B (ORIGINAL): Creates an implementation task with exact instructions.
   */
  public static async applyApprovedRecommendation(
    params: ApplyRecommendationParams,
    context: AuthorizedContext
  ): Promise<ApplyResult> {
    AuthorizationService.assertCan(context, Action.PAGE_UPDATE);

    const opp = await prisma.opportunity.findFirst({
      where: {
        id: params.opportunityId,
        tenantId: params.tenantId,
      },
      include: {
        webSurface: true,
        page: true,
      },
    });

    if (!opp) {
      throw new Error(`Opportunity "${params.opportunityId}" not found.`);
    }

    const payload = (opp.actionPayload as Record<string, any>) || {};
    const approvedValRaw = payload['approvedValue'] || payload['originalSuggestion'];
    if (!approvedValRaw) {
      throw new Error('Cannot apply recommendation: No approved value exists. Please approve or edit first.');
    }
    const approvedValue: string = String(approvedValRaw);

    const recommendationType = payload['recommendationType'] || opp.type;
    const surfaceType = opp.webSurface?.type === 'LOCALBI' ? 'LOCALBI' : 'ORIGINAL';

    // ── MODE A: LOCALBI PAGE BUILDER ─────────────────────────────────────────
    if (surfaceType === 'LOCALBI' && opp.pageId) {
      const page = await prisma.page.findFirst({
        where: { id: opp.pageId, tenantId: params.tenantId },
      });

      if (!page) {
        throw new Error(`Target LocalBi Page ${opp.pageId} was not found.`);
      }

      const updateData: Record<string, any> = { updatedAt: new Date() };
      let targetField = 'seoTitle';

      if (recommendationType === 'SEO_META_TITLE') {
        updateData['seoTitle'] = approvedValue;
        targetField = 'seoTitle';
      } else if (recommendationType === 'SEO_META_DESCRIPTION') {
        updateData['seoDescription'] = approvedValue;
        targetField = 'seoDescription';
      } else {
        targetField = 'content';
      }

      // Update Page SEO Draft without altering published runtime
      await prisma.page.update({
        where: { id: page.id },
        data: updateData,
      });

      // Update Opportunity status
      const updatedPayload = {
        ...payload,
        approvalState: SeoApprovalStatus.IMPLEMENTATION_PENDING,
        implementationDetails: {
          surface: 'LOCALBI',
          mode: 'PAGE_SEO_DRAFT',
          status: 'APPLIED_TO_DRAFT',
          appliedField: targetField,
          appliedValue: approvedValue,
          appliedAt: new Date().toISOString(),
          appliedBy: context.userId,
          notice: 'Applied to draft in Site Studio. Must be explicitly published to take effect live.',
        },
      };

      await prisma.opportunity.update({
        where: { id: opp.id },
        data: {
          actionPayload: updatedPayload as any,
          updatedAt: new Date(),
        },
      });

      logger.info(
        { pageId: page.id, targetField, approvedValue },
        '[SeoDraftApplier] Metadata applied to LocalBi Page draft'
      );

      return {
        opportunityId: opp.id,
        appliedMode: 'LOCALBI_DRAFT',
        targetUrl: opp.page?.slug || payload['targetUrl'],
        targetField,
        appliedValue: approvedValue,
        message: `Applied to draft in Site Studio. The change is saved and ready for Preview & Publish.`,
      };
    }

    // ── MODE B: ORIGINAL EXTERNAL WEBSITE ────────────────────────────────────
    const taskDetails = {
      taskType: 'MANUAL_SEO_IMPLEMENTATION',
      targetUrl: payload['targetUrl'],
      recommendationType,
      currentValue: payload['currentValue'],
      approvedValue,
      instructions:
        recommendationType === 'SEO_META_TITLE'
          ? `Update <title> tag on ${payload['targetUrl']} to: "${approvedValue}"`
          : `Update <meta name="description"> tag on ${payload['targetUrl']} to: "${approvedValue}"`,
      createdAt: new Date().toISOString(),
      assignedBy: context.userId,
    };

    const updatedPayload = {
      ...payload,
      approvalState: SeoApprovalStatus.IMPLEMENTATION_PENDING,
      implementationDetails: {
        surface: 'ORIGINAL',
        mode: 'EXTERNAL_TASK',
        status: 'TASK_CREATED',
        taskDetails,
      },
    };

    await prisma.opportunity.update({
      where: { id: opp.id },
      data: {
        actionPayload: updatedPayload as any,
        updatedAt: new Date(),
      },
    });

    return {
      opportunityId: opp.id,
      appliedMode: 'EXTERNAL_TASK',
      targetUrl: payload['targetUrl'],
      targetField: recommendationType === 'SEO_META_TITLE' ? 'title' : 'meta_description',
      appliedValue: approvedValue,
      message: `Implementation task created for external website (${payload['targetUrl']}). Apply on your CMS, then click Re-crawl to verify.`,
    };
  }
}
