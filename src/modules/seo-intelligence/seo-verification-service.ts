import { prisma } from '@/shared/database/client';
import { logger } from '@/shared/observability/logger';
import { AuthorizedContext, AuthorizationService, Action } from '@/shared/authorization/policy';
import { SafePageCrawler } from './safe-page-crawler';
import { SeoApprovalStatus } from './seo-types';

export interface VerifyRecommendationParams {
  tenantId: string;
  opportunityId: string;
}

export interface VerificationResult {
  opportunityId: string;
  isVerified: boolean;
  status: 'VERIFIED' | 'VERIFICATION_FAILED';
  expectedValue: string;
  observedLiveValue: string | null;
  pageHttpStatus: number;
  isIndexable: boolean;
  message: string;
  verifiedAt: Date;
}

export class SeoVerificationService {
  /**
   * Re-crawls the live target page to technically verify if the approved metadata change is in effect.
   * GUARANTEE: Never marks VERIFIED unless technical crawl explicitly matches expected approved value.
   */
  public static async verifyImplementation(
    params: VerifyRecommendationParams,
    context: AuthorizedContext
  ): Promise<VerificationResult> {
    AuthorizationService.assertCan(context, Action.SEO_ANALYZE);

    const opp = await prisma.opportunity.findFirst({
      where: {
        id: params.opportunityId,
        tenantId: params.tenantId,
      },
    });

    if (!opp) {
      throw new Error(`Opportunity "${params.opportunityId}" not found.`);
    }

    const payload = (opp.actionPayload as Record<string, any>) || {};
    const targetUrl = payload['targetUrl'];
    const expectedValue = payload['approvedValue'] || payload['originalSuggestion'];
    const recommendationType = payload['recommendationType'] || opp.type;

    if (!targetUrl || !expectedValue) {
      throw new Error('Cannot verify: Missing target URL or expected value in opportunity payload.');
    }

    logger.info({ opportunityId: opp.id, targetUrl, expectedValue }, '[SeoVerificationService] Re-crawling target page for verification');

    // 1. Live re-crawl with SSRF safety
    const crawlResult = await SafePageCrawler.crawlPage(targetUrl);

    if (!crawlResult.success || !crawlResult.signals) {
      const failMsg = `Verification re-crawl failed: ${crawlResult.error || 'Could not fetch page'}`;
      await this.recordVerificationOutcome(opp.id, payload, {
        status: SeoApprovalStatus.VERIFICATION_FAILED,
        observedValue: null,
        message: failMsg,
      });

      return {
        opportunityId: opp.id,
        isVerified: false,
        status: 'VERIFICATION_FAILED',
        expectedValue,
        observedLiveValue: null,
        pageHttpStatus: crawlResult.httpStatus || 0,
        isIndexable: false,
        message: failMsg,
        verifiedAt: new Date(),
      };
    }

    const signals = crawlResult.signals;
    let observedValue: string | null = null;
    let matches = false;

    if (recommendationType === 'SEO_META_TITLE') {
      observedValue = signals.title;
      // Normalizing whitespace and case-insensitive check
      matches = Boolean(
        observedValue &&
          observedValue.trim().toLowerCase() === expectedValue.trim().toLowerCase()
      );
    } else if (recommendationType === 'SEO_META_DESCRIPTION') {
      observedValue = signals.metaDescription;
      matches = Boolean(
        observedValue &&
          observedValue.trim().toLowerCase() === expectedValue.trim().toLowerCase()
      );
    } else {
      // Content / Section verification
      observedValue = signals.mainContentSummary;
      matches = Boolean(
        observedValue && observedValue.toLowerCase().includes(expectedValue.toLowerCase())
      );
    }

    const finalStatus = matches ? SeoApprovalStatus.VERIFIED : SeoApprovalStatus.VERIFICATION_FAILED;
    const message = matches
      ? `Technical verification succeeded! Live ${recommendationType === 'SEO_META_TITLE' ? '<title>' : 'meta description'} on ${targetUrl} matches approved recommendation.`
      : `Verification re-crawl did not match. Expected: "${expectedValue.slice(0, 50)}...", but live page returned: "${(observedValue || 'NONE').slice(0, 50)}...". Please ensure the page is published or your CMS cache is cleared.`;

    await this.recordVerificationOutcome(opp.id, payload, {
      status: finalStatus,
      observedValue,
      message,
    });

    return {
      opportunityId: opp.id,
      isVerified: matches,
      status: matches ? 'VERIFIED' : 'VERIFICATION_FAILED',
      expectedValue,
      observedLiveValue: observedValue,
      pageHttpStatus: crawlResult.httpStatus,
      isIndexable: signals.indexability.isIndexable,
      message,
      verifiedAt: new Date(),
    };
  }

  private static async recordVerificationOutcome(
    opportunityId: string,
    existingPayload: Record<string, any>,
    outcome: { status: string; observedValue: string | null; message: string }
  ): Promise<void> {
    const updatedPayload = {
      ...existingPayload,
      approvalState: outcome.status,
      verificationState: {
        status: outcome.status,
        observedValue: outcome.observedValue,
        message: outcome.message,
        checkedAt: new Date().toISOString(),
      },
    };

    await prisma.opportunity.update({
      where: { id: opportunityId },
      data: {
        status: outcome.status === SeoApprovalStatus.VERIFIED ? 'COMPLETED' : 'OPEN',
        actionPayload: updatedPayload as any,
        resolvedAt: outcome.status === SeoApprovalStatus.VERIFIED ? new Date() : null,
        updatedAt: new Date(),
      },
    });
  }
}
