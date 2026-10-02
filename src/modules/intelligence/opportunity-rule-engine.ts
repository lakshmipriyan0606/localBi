/**
 * Phase 10: Opportunity Rule Engine
 * Deterministic, versioned rules evaluating multi-source signals and producing
 * explainable recommendations with verified evidence and transparent priority scores.
 */

import { createHash } from 'crypto';
import {
  OpportunityType,
  OpportunityPriority,
  OpportunityConfidence,
  OpportunityActionType,
  OpportunityCandidate,
  OpportunityPriorityValue,
  SignalSource,
} from './opportunity-types';
import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/database/client';
import { AggregatedSignals } from './search-signal-service';
import { PageCoverageService } from './page-coverage-service';

export interface RuleEvaluationInput {
  tenantId: string;
  brandId: string;
  signals: AggregatedSignals;
  db?: Prisma.TransactionClient | typeof prisma;
}

export class OpportunityRuleEngine {
  /**
   * Generates a deterministic identity hash to prevent duplicate opportunities.
   */
  public static generateIdentityHash(
    tenantId: string,
    brandId: string,
    ruleId: string,
    entityKey: string,
    identifier: string
  ): string {
    const raw = `${tenantId}:${brandId}:${ruleId}:${entityKey}:${identifier.trim().toLowerCase()}`;
    return createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Translates a numeric priority score (0-100) into a transparent Priority Tier.
   */
  public static scoreToPriorityTier(score: number): OpportunityPriorityValue {
    if (score >= 80) return OpportunityPriority.CRITICAL;
    if (score >= 60) return OpportunityPriority.HIGH;
    if (score >= 35) return OpportunityPriority.MEDIUM;
    return OpportunityPriority.LOW;
  }

  /**
   * Evaluates all registered rules against factual aggregated signals.
   */
  public static async evaluateAll(input: RuleEvaluationInput): Promise<OpportunityCandidate[]> {
    const candidates: OpportunityCandidate[] = [];

    // Run each deterministic rule
    const r1 = await this.evaluateHighImpLowCtr(input);
    const r2 = await this.evaluateHighDemandLowRank(input);
    const r3 = await this.evaluateHighConversionLowVisibility(input);
    const r4 = await this.evaluatePageTrafficNoConversions(input);
    const r5 = await this.evaluateMissingLandingPage(input);
    const r6 = await this.evaluateGbpProfileIncomplete(input);
    const r7 = await this.evaluateUnansweredReviews(input);
    const r8 = await this.evaluateMerchantIssues(input);
    const r9 = await this.evaluateRankDecline(input);

    candidates.push(...r1, ...r2, ...r3, ...r4, ...r5, ...r6, ...r7, ...r8, ...r9);

    return candidates;
  }

  // ---------------------------------------------------------------------------
  // RULE 1: HIGH_IMPRESSIONS_LOW_CTR (v1.0.0)
  // ---------------------------------------------------------------------------
  public static async evaluateHighImpLowCtr(input: RuleEvaluationInput): Promise<OpportunityCandidate[]> {
    const results: OpportunityCandidate[] = [];
    const ruleId = 'RULE_HIGH_IMP_LOW_CTR';
    const ruleVersion = '1.0.0';

    for (const gsc of input.signals.gscSignals) {
      if (gsc.impressions < 100) continue;

      let isLowCtr = false;
      let benchmarkCtr = 0.02;

      if (gsc.averagePosition <= 3) {
        benchmarkCtr = 0.12;
        isLowCtr = gsc.ctr < 0.05;
      } else if (gsc.averagePosition <= 10) {
        benchmarkCtr = 0.035;
        isLowCtr = gsc.ctr < 0.018;
      } else if (gsc.impressions >= 250) {
        benchmarkCtr = 0.012;
        isLowCtr = gsc.ctr < 0.007;
      }

      if (isLowCtr) {
        const priorityScore = Math.min(95, Math.round(40 + (gsc.impressions / 150) * 10));
        const priority = this.scoreToPriorityTier(priorityScore);

        results.push({
          brandId: input.brandId,
          type: OpportunityType.HIGH_IMPRESSIONS_LOW_CTR,
          priority,
          priorityScore,
          confidence: OpportunityConfidence.MEDIUM,
          title: `Improve search CTR for "${gsc.queryText}"`,
          summary: `The search query "${gsc.queryText}" earned ${gsc.impressions.toLocaleString()} impressions with average position ${gsc.averagePosition.toFixed(1)}, but achieved only ${(gsc.ctr * 100).toFixed(2)}% CTR (typical benchmark: ${(benchmarkCtr * 100).toFixed(1)}%). Updating page meta titles and snippets will increase organic clicks.`,
          actionType: OpportunityActionType.UPDATE_METADATA,
          actionPayload: {
            queryText: gsc.queryText,
            impressions: gsc.impressions,
            clicks: gsc.clicks,
            ctr: gsc.ctr,
            averagePosition: gsc.averagePosition,
          },
          ruleId,
          ruleVersion,
          entityKey: `keyword:${gsc.normalizedTerm}`,
          evidence: [
            {
              source: SignalSource.GSC,
              metric: 'impressions',
              value: gsc.impressions,
              formattedValue: `${gsc.impressions.toLocaleString()} imp`,
              dateRange: gsc.dateRange,
              entityType: 'KEYWORD',
              entityLabel: `GSC query: "${gsc.queryText}"`,
            },
            {
              source: SignalSource.GSC,
              metric: 'ctr',
              value: gsc.ctr,
              comparisonValue: benchmarkCtr,
              formattedValue: `${(gsc.ctr * 100).toFixed(2)}% (benchmark: ${(benchmarkCtr * 100).toFixed(1)}%)`,
              dateRange: gsc.dateRange,
              entityType: 'KEYWORD',
            },
            {
              source: SignalSource.GSC,
              metric: 'average_position',
              value: gsc.averagePosition,
              formattedValue: `#${gsc.averagePosition.toFixed(1)} avg position`,
              dateRange: gsc.dateRange,
              entityType: 'KEYWORD',
            },
          ],
        });
      }
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // RULE 2: HIGH_DEMAND_LOW_RANK (v1.0.0)
  // ---------------------------------------------------------------------------
  public static async evaluateHighDemandLowRank(input: RuleEvaluationInput): Promise<OpportunityCandidate[]> {
    const results: OpportunityCandidate[] = [];
    const ruleId = 'RULE_HIGH_DEMAND_LOW_RANK';
    const ruleVersion = '1.0.0';

    for (const rank of input.signals.rankSignals) {
      // Find matching GBP or GSC search impressions for this keyword
      const gbpMatch = input.signals.gbpSignals.find(
        (s) => s.normalizedTerm === rank.normalizedTerm && s.locationId === rank.storeId
      );
      const gscMatch = input.signals.gscSignals.find(
        (s) => s.normalizedTerm === rank.normalizedTerm
      );

      const totalDemand = (gbpMatch?.impressions ?? 0) + (gscMatch?.impressions ?? 0);

      // Trigger condition: validated search demand >= 80, but weak local rank coverage
      if (totalDemand >= 80 && (rank.top3Coverage < 0.30 || rank.averageFoundRank > 7.0)) {
        const store = input.signals.storeSignals.find((s) => s.storeId === rank.storeId);
        const storeLabel = store?.storeName ?? 'Local Store';

        const priorityScore = Math.min(95, Math.round(50 + (totalDemand / 100) * 15 * (1 - rank.top3Coverage)));
        const priority = this.scoreToPriorityTier(priorityScore);

        const evidence = [];
        if (gbpMatch) {
          evidence.push({
            source: SignalSource.GBP,
            metric: 'search_impressions',
            value: gbpMatch.impressions,
            formattedValue: `${gbpMatch.impressions.toLocaleString()} GBP searches`,
            entityType: 'LOCATION',
            entityId: rank.storeId,
            entityLabel: storeLabel,
          });
        }
        if (gscMatch) {
          evidence.push({
            source: SignalSource.GSC,
            metric: 'impressions',
            value: gscMatch.impressions,
            formattedValue: `${gscMatch.impressions.toLocaleString()} GSC impressions`,
            entityType: 'KEYWORD',
            entityLabel: gscMatch.queryText,
          });
        }

        evidence.push(
          {
            source: SignalSource.LOCAL_RANK,
            metric: 'top3_coverage',
            value: rank.top3Coverage,
            comparisonValue: 0.70,
            formattedValue: `${(rank.top3Coverage * 100).toFixed(0)}% Top-3 grid coverage`,
            entityType: 'LOCATION',
            entityId: rank.storeId,
          },
          {
            source: SignalSource.LOCAL_RANK,
            metric: 'average_rank',
            value: rank.averageFoundRank,
            formattedValue: `#${rank.averageFoundRank.toFixed(1)} avg local rank`,
            entityType: 'LOCATION',
            entityId: rank.storeId,
          }
        );

        results.push({
          brandId: input.brandId,
          storeId: rank.storeId,
          keywordId: rank.keywordId,
          type: OpportunityType.HIGH_DEMAND_LOW_RANK,
          priority,
          priorityScore,
          confidence: gbpMatch && gscMatch ? OpportunityConfidence.HIGH : OpportunityConfidence.MEDIUM,
          title: `Capture local rank for "${rank.term}" in ${store?.city ?? 'market'}`,
          summary: `High customer demand (${totalDemand.toLocaleString()} searches) detected for "${rank.term}", but ${storeLabel} holds only ${(rank.top3Coverage * 100).toFixed(0)}% Top-3 geo-grid coverage with average rank #${rank.averageFoundRank.toFixed(1)}. Improving local landing page relevance and store citation profile will capture this local search volume.`,
          actionType: OpportunityActionType.IMPROVE_EXISTING_PAGE,
          actionPayload: {
            keyword: rank.term,
            storeId: rank.storeId,
            top3Coverage: rank.top3Coverage,
            averageRank: rank.averageFoundRank,
          },
          ruleId,
          ruleVersion,
          entityKey: `store_keyword:${rank.storeId}:${rank.normalizedTerm}`,
          evidence,
        });
      }
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // RULE 3: HIGH_CONVERSION_LOW_VISIBILITY (v1.0.0)
  // ---------------------------------------------------------------------------
  public static async evaluateHighConversionLowVisibility(input: RuleEvaluationInput): Promise<OpportunityCandidate[]> {
    const results: OpportunityCandidate[] = [];
    const ruleId = 'RULE_HIGH_CONVERSION_LOW_VISIBILITY';
    const ruleVersion = '1.0.0';

    for (const conv of input.signals.conversionSignals) {
      if (!conv.storeId || conv.totalConversions < 5) continue;

      const store = input.signals.storeSignals.find((s) => s.storeId === conv.storeId);
      if (!store) continue;

      // Find average rank for this store across keywords
      const storeRanks = input.signals.rankSignals.filter((r) => r.storeId === conv.storeId);
      const avgTop3 = storeRanks.length > 0
        ? storeRanks.reduce((sum, r) => sum + r.top3Coverage, 0) / storeRanks.length
        : 0.15;

      // If store is proving strong real-world conversion value but has low visibility
      if (avgTop3 < 0.35) {
        const priorityScore = Math.min(98, Math.round(65 + conv.totalConversions * 3));
        const priority = this.scoreToPriorityTier(priorityScore);

        results.push({
          brandId: input.brandId,
          storeId: conv.storeId,
          type: OpportunityType.HIGH_CONVERSION_LOW_VISIBILITY,
          priority,
          priorityScore,
          confidence: OpportunityConfidence.HIGH,
          title: `Amplify high-converting store: ${store.storeName}`,
          summary: `${store.storeName} generated ${conv.totalConversions} verified customer conversions (${conv.leadsCount} leads, ${conv.callsCount} calls) over the last ${conv.periodDays} days, yet average local grid Top-3 coverage is only ${(avgTop3 * 100).toFixed(0)}%. Expanding search visibility here provides high return.`,
          actionType: OpportunityActionType.IMPROVE_EXISTING_PAGE,
          actionPayload: {
            storeId: conv.storeId,
            conversions: conv.totalConversions,
            leads: conv.leadsCount,
            calls: conv.callsCount,
          },
          ruleId,
          ruleVersion,
          entityKey: `store_conversion:${conv.storeId}`,
          evidence: [
            {
              source: SignalSource.LOCALBI,
              metric: 'total_conversions',
              value: conv.totalConversions,
              formattedValue: `${conv.totalConversions} conversions (${conv.leadsCount} leads, ${conv.callsCount} calls)`,
              entityType: 'LOCATION',
              entityId: conv.storeId,
              entityLabel: store.storeName,
            },
            {
              source: SignalSource.LOCAL_RANK,
              metric: 'top3_coverage',
              value: avgTop3,
              comparisonValue: 0.60,
              formattedValue: `${(avgTop3 * 100).toFixed(0)}% avg Top-3 coverage`,
              entityType: 'LOCATION',
              entityId: conv.storeId,
            },
          ],
        });
      }
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // RULE 4: PAGE_WITH_TRAFFIC_NO_CONVERSIONS (v1.0.0)
  // ---------------------------------------------------------------------------
  public static async evaluatePageTrafficNoConversions(input: RuleEvaluationInput): Promise<OpportunityCandidate[]> {
    const results: OpportunityCandidate[] = [];
    const ruleId = 'RULE_PAGE_TRAFFIC_NO_CONVERSIONS';
    const ruleVersion = '1.0.0';

    // Group GSC queries with substantial clicks
    for (const gsc of input.signals.gscSignals) {
      if (gsc.clicks >= 25 && gsc.impressions >= 400) {
        // Check if conversions exist for this query/page
        // In localbi, if clicks are high but brand has zero recorded leads/calls in store
        const hasConversions = input.signals.conversionSignals.some((c) => c.totalConversions > 0);

        if (!hasConversions) {
          const priorityScore = Math.min(85, Math.round(35 + gsc.clicks * 1.5));
          const priority = this.scoreToPriorityTier(priorityScore);

          results.push({
            brandId: input.brandId,
            type: OpportunityType.PAGE_WITH_TRAFFIC_NO_CONVERSIONS,
            priority,
            priorityScore,
            confidence: OpportunityConfidence.MEDIUM,
            title: `Optimize CTA on landing page for "${gsc.queryText}"`,
            summary: `High search traffic received (${gsc.clicks} clicks from ${gsc.impressions.toLocaleString()} impressions), but zero calls or leads have been tracked. Review call-to-action buttons, store phone prominence, and inquiry forms.`,
            actionType: OpportunityActionType.IMPROVE_CTA,
            actionPayload: {
              queryText: gsc.queryText,
              clicks: gsc.clicks,
              impressions: gsc.impressions,
            },
            ruleId,
            ruleVersion,
            entityKey: `page_traffic:${gsc.normalizedTerm}`,
            evidence: [
              {
                source: SignalSource.GSC,
                metric: 'clicks',
                value: gsc.clicks,
                formattedValue: `${gsc.clicks} organic clicks`,
                entityType: 'KEYWORD',
                entityLabel: gsc.queryText,
              },
              {
                source: SignalSource.LOCALBI,
                metric: 'conversions',
                value: 0,
                comparisonValue: 5,
                formattedValue: '0 conversions',
                entityType: 'KEYWORD',
              },
            ],
          });
        }
      }
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // RULE 5: MISSING_LANDING_PAGE (v1.0.0)
  // ---------------------------------------------------------------------------
  public static async evaluateMissingLandingPage(input: RuleEvaluationInput): Promise<OpportunityCandidate[]> {
    const results: OpportunityCandidate[] = [];
    const ruleId = 'RULE_MISSING_LANDING_PAGE';
    const ruleVersion = '1.0.0';

    // Combine high demand queries across GSC and GBP
    const demandTerms = new Map<string, { term: string; impressions: number; storeId?: string }>();

    for (const g of input.signals.gscSignals) {
      if (g.impressions >= 150) {
        demandTerms.set(g.normalizedTerm, {
          term: g.queryText,
          impressions: g.impressions,
        });
      }
    }

    for (const st of input.signals.gbpSignals) {
      if (st.impressions >= 100) {
        const cur = demandTerms.get(st.normalizedTerm);
        demandTerms.set(st.normalizedTerm, {
          term: st.term,
          impressions: (cur?.impressions ?? 0) + st.impressions,
          storeId: st.locationId,
        });
      }
    }

    for (const [normTerm, item] of demandTerms.entries()) {
      const coverage = await PageCoverageService.evaluateCoverage(
        input.tenantId,
        input.brandId,
        {
          keywordTerm: item.term,
          storeId: item.storeId,
        },
        input.db
      );

      if (!coverage.hasCoverage) {
        const priorityScore = Math.min(92, Math.round(50 + item.impressions / 40));
        const priority = this.scoreToPriorityTier(priorityScore);

        results.push({
          brandId: input.brandId,
          storeId: item.storeId,
          type: OpportunityType.MISSING_LANDING_PAGE,
          priority,
          priorityScore,
          confidence: OpportunityConfidence.HIGH,
          title: `Create targeted landing page for "${item.term}"`,
          summary: `Factual customer search demand of ${item.impressions.toLocaleString()} impressions detected for "${item.term}", but no matching published landing page currently exists. Creating a dedicated category or store landing page will directly capture organic search traffic.`,
          actionType: OpportunityActionType.CREATE_PAGE,
          actionPayload: {
            keyword: item.term,
            impressions: item.impressions,
            storeId: item.storeId,
          },
          ruleId,
          ruleVersion,
          entityKey: `missing_page:${normTerm}`,
          evidence: [
            {
              source: SignalSource.GSC,
              metric: 'search_demand',
              value: item.impressions,
              formattedValue: `${item.impressions.toLocaleString()} search impressions`,
              entityType: 'KEYWORD',
              entityLabel: item.term,
            },
            {
              source: SignalSource.LOCALBI,
              metric: 'page_coverage',
              value: 0,
              comparisonValue: 1,
              formattedValue: 'No published landing page found',
              entityType: 'PAGE',
            },
          ],
        });
      }
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // RULE 6: GBP_PROFILE_INCOMPLETE (v1.0.0)
  // ---------------------------------------------------------------------------
  public static async evaluateGbpProfileIncomplete(input: RuleEvaluationInput): Promise<OpportunityCandidate[]> {
    const results: OpportunityCandidate[] = [];
    const ruleId = 'RULE_GBP_PROFILE_INCOMPLETE';
    const ruleVersion = '1.0.0';

    for (const store of input.signals.storeSignals) {
      const missingFields: string[] = [];
      if (!store.phone || store.phone.trim() === '') missingFields.push('Phone Number');
      if (!store.addressLine1 || store.addressLine1.trim() === '') missingFields.push('Street Address');
      if (!store.googlePlaceId) missingFields.push('Google Place ID');

      if (missingFields.length > 0 || store.gbpSyncStatus === 'ERROR') {
        const priorityScore = 85;
        const priority = this.scoreToPriorityTier(priorityScore);

        results.push({
          brandId: input.brandId,
          storeId: store.storeId,
          type: OpportunityType.GBP_PROFILE_INCOMPLETE,
          priority,
          priorityScore,
          confidence: OpportunityConfidence.HIGH,
          title: `Complete GBP profile details for ${store.storeName}`,
          summary: `${store.storeName} is missing essential profile fields (${missingFields.join(', ')}). Incomplete profiles suffer significant ranking penalties in Google Maps Local Pack.`,
          actionType: OpportunityActionType.FIX_GBP_PROFILE,
          actionPayload: {
            storeId: store.storeId,
            missingFields,
            syncStatus: store.gbpSyncStatus,
          },
          ruleId,
          ruleVersion,
          entityKey: `gbp_profile:${store.storeId}`,
          evidence: [
            {
              source: SignalSource.GBP,
              metric: 'missing_fields_count',
              value: missingFields.length,
              comparisonValue: 0,
              formattedValue: `${missingFields.length} missing fields (${missingFields.join(', ')})`,
              entityType: 'LOCATION',
              entityId: store.storeId,
              entityLabel: store.storeName,
            },
          ],
        });
      }
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // RULE 7: UNANSWERED_REVIEWS (v1.0.0)
  // ---------------------------------------------------------------------------
  public static async evaluateUnansweredReviews(input: RuleEvaluationInput): Promise<OpportunityCandidate[]> {
    const results: OpportunityCandidate[] = [];
    const ruleId = 'RULE_UNANSWERED_REVIEWS';
    const ruleVersion = '1.0.0';

    for (const store of input.signals.storeSignals) {
      if (store.unansweredReviewsCount > 0) {
        const isUrgent = store.lowestUnansweredRating !== undefined && store.lowestUnansweredRating <= 3;
        const priorityScore = Math.min(95, Math.round(50 + store.unansweredReviewsCount * 8 + (isUrgent ? 25 : 0)));
        const priority = this.scoreToPriorityTier(priorityScore);

        results.push({
          brandId: input.brandId,
          storeId: store.storeId,
          type: OpportunityType.UNANSWERED_REVIEWS,
          priority,
          priorityScore,
          confidence: OpportunityConfidence.HIGH,
          title: `Respond to ${store.unansweredReviewsCount} customer review${store.unansweredReviewsCount > 1 ? 's' : ''} at ${store.storeName}`,
          summary: `${store.storeName} has ${store.unansweredReviewsCount} unanswered customer reviews${isUrgent ? ` including a low rating (${store.lowestUnansweredRating} stars)` : ''}. Quick owner responses improve Google local ranking algorithms and customer trust.`,
          actionType: OpportunityActionType.RESPOND_TO_REVIEWS,
          actionPayload: {
            storeId: store.storeId,
            unansweredCount: store.unansweredReviewsCount,
            lowestRating: store.lowestUnansweredRating,
          },
          ruleId,
          ruleVersion,
          entityKey: `unanswered_reviews:${store.storeId}`,
          evidence: [
            {
              source: SignalSource.GBP,
              metric: 'unanswered_reviews_count',
              value: store.unansweredReviewsCount,
              comparisonValue: 0,
              formattedValue: `${store.unansweredReviewsCount} unreplied review${store.unansweredReviewsCount > 1 ? 's' : ''}`,
              entityType: 'LOCATION',
              entityId: store.storeId,
              entityLabel: store.storeName,
            },
            ...(store.lowestUnansweredRating !== undefined
              ? [
                  {
                    source: SignalSource.GBP,
                    metric: 'lowest_rating',
                    value: store.lowestUnansweredRating,
                    formattedValue: `${store.lowestUnansweredRating} stars lowest rating`,
                    entityType: 'LOCATION',
                    entityId: store.storeId,
                  },
                ]
              : []),
          ],
        });
      }
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // RULE 8: MERCHANT_PRODUCT_ISSUE (v1.0.0)
  // ---------------------------------------------------------------------------
  public static async evaluateMerchantIssues(input: RuleEvaluationInput): Promise<OpportunityCandidate[]> {
    const results: OpportunityCandidate[] = [];
    const ruleId = 'RULE_MERCHANT_PRODUCT_ISSUE';
    const ruleVersion = '1.0.0';

    for (const item of input.signals.merchantSignals) {
      const isError = item.severity === 'ERROR';
      const priorityScore = isError ? 90 : 60;
      const priority = this.scoreToPriorityTier(priorityScore);

      results.push({
        brandId: input.brandId,
        productId: item.productId,
        storeId: item.storeId,
        type: OpportunityType.MERCHANT_PRODUCT_ISSUE,
        priority,
        priorityScore,
        confidence: OpportunityConfidence.HIGH,
        title: `Resolve Google Merchant issue for "${item.productName}"`,
        summary: `Google Merchant Center flagged issue ${item.issueCode} (${item.severity}) on SKU ${item.sku}: "${item.description}". This issue blocks free Google local product listings.`,
        actionType: OpportunityActionType.FIX_MERCHANT_PRODUCT,
        actionPayload: {
          productId: item.productId,
          sku: item.sku,
          issueCode: item.issueCode,
          severity: item.severity,
        },
        ruleId,
        ruleVersion,
        entityKey: `merchant_issue:${item.productId}:${item.issueCode}`,
        evidence: [
          {
            source: SignalSource.MERCHANT,
            metric: 'merchant_issue',
            value: isError ? 1 : 0.5,
            formattedValue: `${item.severity}: ${item.issueCode}`,
            entityType: 'PRODUCT',
            entityId: item.productId,
            entityLabel: `${item.productName} (${item.sku})`,
          },
        ],
      });
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // RULE 9: LOCAL_RANK_DECLINE (v1.0.0)
  // ---------------------------------------------------------------------------
  public static async evaluateRankDecline(input: RuleEvaluationInput): Promise<OpportunityCandidate[]> {
    const results: OpportunityCandidate[] = [];
    const ruleId = 'RULE_LOCAL_RANK_DECLINE';
    const ruleVersion = '1.0.0';

    for (const rank of input.signals.rankSignals) {
      if (rank.priorTop3Coverage !== undefined) {
        const drop = rank.priorTop3Coverage - rank.top3Coverage;
        if (drop >= 0.15) {
          const priorityScore = Math.min(95, Math.round(70 + drop * 50));
          const priority = this.scoreToPriorityTier(priorityScore);

          results.push({
            brandId: input.brandId,
            storeId: rank.storeId,
            keywordId: rank.keywordId,
            type: OpportunityType.LOCAL_RANK_DECLINE,
            priority,
            priorityScore,
            confidence: OpportunityConfidence.HIGH,
            title: `Investigate local rank drop for "${rank.term}"`,
            summary: `Top-3 local grid coverage for "${rank.term}" dropped by ${(drop * 100).toFixed(0)}% (from ${(rank.priorTop3Coverage * 100).toFixed(0)}% down to ${(rank.top3Coverage * 100).toFixed(0)}%). Review competitor local actions and page indexation.`,
            actionType: OpportunityActionType.INVESTIGATE_RANK_DECLINE,
            actionPayload: {
              keywordId: rank.keywordId,
              currentTop3: rank.top3Coverage,
              priorTop3: rank.priorTop3Coverage,
              drop,
            },
            ruleId,
            ruleVersion,
            entityKey: `rank_decline:${rank.storeId}:${rank.keywordId}`,
            evidence: [
              {
                source: SignalSource.LOCAL_RANK,
                metric: 'top3_coverage_decline',
                value: rank.top3Coverage,
                comparisonValue: rank.priorTop3Coverage,
                formattedValue: `${(rank.top3Coverage * 100).toFixed(0)}% (was ${(rank.priorTop3Coverage * 100).toFixed(0)}%)`,
                entityType: 'KEYWORD',
                entityId: rank.keywordId,
                entityLabel: rank.term,
              },
            ],
          });
        }
      }
    }

    return results;
  }
}
