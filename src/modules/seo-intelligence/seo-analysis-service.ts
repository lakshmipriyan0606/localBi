import crypto from 'node:crypto';
import { prisma } from '@/shared/database/client';
import { logger } from '@/shared/observability/logger';
import { AuthorizedContext, AuthorizationService, Action } from '@/shared/authorization/policy';
import {
  SeoAnalysisRunParams,
  SeoAnalysisRunRecord,
  SeoAnalysisStage,
  SeoAnalysisState,
  SeoPageSignals,
} from './seo-types';
import { SeoAnalysisRepository } from './seo-analysis-repository';
import { SafePageCrawler } from './safe-page-crawler';
import { getSerpProvider } from './serp-provider';
import { CompetitorSelectionService } from './competitor-selection-service';
import { SeoGapEngine } from './seo-gap-engine';
import { SeoAiAdvisor } from './seo-ai-advisor';
import { GscEvidenceService } from './gsc-evidence-service';
import { SeoOpportunityBridge } from './seo-opportunity-bridge';

export class SeoAnalysisService {
  public static readonly ANALYSIS_VERSION = '1.0.0';

  /**
   * Generates deterministic fingerprint for active job deduplication.
   */
  public static generateFingerprint(params: SeoAnalysisRunParams): string {
    const raw = [
      params.tenantId,
      params.brandId,
      params.webSurfaceId,
      params.pageId || params.targetUrl.toLowerCase().trim(),
      params.keyword.toLowerCase().trim(),
      params.searchLocation.toLowerCase().trim(),
      params.country.toLowerCase().trim(),
      params.device,
      this.ANALYSIS_VERSION,
    ].join(':');

    return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
  }

  /**
   * Validates target ownership against Tenant, Brand, and WebSurface policies.
   */
  public static async validateTargetOwnership(
    params: SeoAnalysisRunParams,
    context: AuthorizedContext
  ): Promise<{ valid: boolean; error?: string; surfaceType: 'LOCALBI' | 'ORIGINAL' }> {
    AuthorizationService.assertCan(context, Action.SEO_ANALYZE);
    AuthorizationService.assertBrandAccess(context, params.brandId);

    // Verify WebSurface belongs to tenant and brand
    const surface = await prisma.webSurface.findFirst({
      where: {
        id: params.webSurfaceId,
        tenantId: params.tenantId,
        brandId: params.brandId,
      },
      include: {
        domainRel: true,
      },
    });

    if (!surface) {
      return { valid: false, error: 'WebSurface not found or does not belong to specified brand.', surfaceType: 'LOCALBI' };
    }

    const surfaceType = surface.type === 'LOCALBI' ? 'LOCALBI' : 'ORIGINAL';

    if (surfaceType === 'LOCALBI') {
      if (params.pageId) {
        const page = await prisma.page.findFirst({
          where: {
            id: params.pageId,
            tenantId: params.tenantId,
            brandId: params.brandId,
            webSurfaceId: params.webSurfaceId,
          },
        });
        if (!page) {
          return {
            valid: false,
            error: 'LocalBi Page does not belong to the selected Brand and WebSurface.',
            surfaceType,
          };
        }
      }
    } else {
      // ORIGINAL surface: Validate target URL hostname against registered domain
      try {
        const targetHost = new URL(params.targetUrl).hostname.replace(/^www\./, '').toLowerCase();
        const configuredHost = (surface.domainRel?.domain || surface.customDomain || '')
          .replace(/^www\./, '')
          .toLowerCase();

        if (configuredHost && targetHost !== configuredHost && !targetHost.endsWith(`.${configuredHost}`)) {
          return {
            valid: false,
            error: `Target URL "${params.targetUrl}" does not match verified domain "${configuredHost}" for this WebSurface.`,
            surfaceType,
          };
        }
      } catch {
        return { valid: false, error: 'Malformed target URL provided.', surfaceType };
      }
    }

    return { valid: true, surfaceType };
  }

  /**
   * Enqueues an asynchronous analysis run with active job deduplication.
   */
  public static async startAnalysis(
    params: SeoAnalysisRunParams,
    context: AuthorizedContext
  ): Promise<{ analysisId: string; status: string; isReused: boolean; message: string }> {
    const ownership = await this.validateTargetOwnership(params, context);
    if (!ownership.valid) {
      throw new Error(ownership.error || 'Target ownership validation failed');
    }

    const fingerprint = this.generateFingerprint(params);

    // 1. Check for Active Job Deduplication (QUEUED or PROCESSING)
    const active = await SeoAnalysisRepository.findActiveByFingerprint(params.tenantId, fingerprint);
    if (active) {
      logger.info(
        { analysisId: active.id, fingerprint },
        '[SeoAnalysisService] Active analysis job deduplicated; returning existing run'
      );
      return {
        analysisId: active.id,
        status: active.status,
        isReused: true,
        message: 'Analysis already running for this target and keyword.',
      };
    }

    // 2. Attach or reuse canonical Keyword record
    let keywordId: string | null = null;
    try {
      const normalizedText = params.keyword.trim().toLowerCase();
      const existingKw = await prisma.keyword.findFirst({
        where: {
          tenantId: params.tenantId,
          term: normalizedText,
        },
      });

      if (existingKw) {
        keywordId = existingKw.id;
      } else {
        const createdKw = await prisma.keyword.create({
          data: {
            tenantId: params.tenantId,
            term: normalizedText,
            normalizedTerm: normalizedText,
            intent: 'COMMERCIAL',
            difficulty: 50,
          },
        });
        keywordId = createdKw.id;
      }
    } catch (err: any) {
      logger.warn({ error: err.message }, 'Failed to link canonical Keyword record');
    }

    // 3. Initialize Analysis Run Record in QUEUED state
    const analysisId = `seo_${crypto.randomUUID()}`;
    const record: SeoAnalysisRunRecord = {
      id: analysisId,
      tenantId: params.tenantId,
      brandId: params.brandId,
      webSurfaceId: params.webSurfaceId,
      pageId: params.pageId ?? null,
      targetUrl: params.targetUrl,
      keyword: params.keyword,
      keywordId,
      searchLocation: params.searchLocation,
      country: params.country,
      device: params.device,
      fingerprint,
      status: SeoAnalysisState.QUEUED,
      stage: SeoAnalysisStage.STAGE_1_GSC,
      progressPercent: 5,
      gscEvidence: null,
      serpResults: [],
      selectedCompetitors: [],
      clientSignals: null,
      competitorSignals: [],
      gaps: [],
      aiAnalysis: null,
      createdOpportunityIds: [],
      unavailableParts: [],
      executionTimesMs: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
    };

    await SeoAnalysisRepository.create(record);

    // 4. Trigger asynchronous execution in background
    setImmediate(async () => {
      try {
        await this.executeAnalysisJob(record, ownership.surfaceType);
      } catch (err: any) {
        logger.error({ analysisId, error: err.message }, '[SeoAnalysisService] Background job failed');
        await SeoAnalysisRepository.markFailed(params.tenantId, analysisId, err.message);
      }
    });

    return {
      analysisId,
      status: SeoAnalysisState.QUEUED,
      isReused: false,
      message: 'SEO analysis initiated successfully.',
    };
  }

  /**
   * Executes the 9-stage asynchronous analysis pipeline.
   */
  public static async executeAnalysisJob(
    record: SeoAnalysisRunRecord,
    surfaceType: 'LOCALBI' | 'ORIGINAL'
  ): Promise<void> {
    const startTime = Date.now();
    const executionTimesMs: Record<string, number> = {};
    const unavailableParts: string[] = [];

    // Stage 1: Collecting Search Console data
    await SeoAnalysisRepository.updateStage(
      record.tenantId,
      record.id,
      SeoAnalysisStage.STAGE_1_GSC,
      10
    );
    const gscStart = Date.now();
    const gscEvidence = await GscEvidenceService.getEvidence({
      tenantId: record.tenantId,
      brandId: record.brandId,
      webSurfaceId: record.webSurfaceId,
      targetUrl: record.targetUrl,
      keyword: record.keyword,
    });
    executionTimesMs['gscMs'] = Date.now() - gscStart;

    if (!gscEvidence.available) {
      unavailableParts.push(`Search Console data (${gscEvidence.status})`);
    }

    // Stage 2: Fetching SERP search results
    await SeoAnalysisRepository.updateStage(
      record.tenantId,
      record.id,
      SeoAnalysisStage.STAGE_2_SERP,
      25
    );
    const serpStart = Date.now();
    const serpProvider = getSerpProvider();
    const serpQueryResult = await serpProvider.search({
      keyword: record.keyword,
      location: record.searchLocation,
      country: record.country,
      device: record.device as 'DESKTOP' | 'MOBILE',
    });
    executionTimesMs['serpMs'] = Date.now() - serpStart;

    if (serpQueryResult.status !== 'COMPLETED') {
      unavailableParts.push(`SERP search (${serpQueryResult.errorCode || serpQueryResult.status})`);
    }

    // Stage 3: Selecting Competitors
    await SeoAnalysisRepository.updateStage(
      record.tenantId,
      record.id,
      SeoAnalysisStage.STAGE_3_COMPETITORS,
      35
    );
    const competitorSelection = CompetitorSelectionService.selectCompetitors({
      serpResults: serpQueryResult.results,
      clientTargetUrl: record.targetUrl,
      keyword: record.keyword,
      location: record.searchLocation,
    });
    const selectedCompetitors = competitorSelection.finalSelection;

    // Sync canonical competitors
    await CompetitorSelectionService.syncCanonicalCompetitors({
      tenantId: record.tenantId,
      brandId: record.brandId,
      competitors: selectedCompetitors,
    });

    // Stage 4: Analyzing client page
    await SeoAnalysisRepository.updateStage(
      record.tenantId,
      record.id,
      SeoAnalysisStage.STAGE_4_CLIENT_PAGE,
      50
    );
    const clientCrawlStart = Date.now();
    const clientCrawl = await SafePageCrawler.crawlPage(record.targetUrl, {
      keywordContext: record.keyword,
      locationContext: record.searchLocation,
    });
    executionTimesMs['clientCrawlMs'] = Date.now() - clientCrawlStart;

    const clientSignals = clientCrawl.signals || SafePageCrawler.extractSeoSignals(
      '<html><head><title>Offline Analysis</title></head><body><p>Client page could not be fetched.</p></body></html>',
      record.targetUrl,
      record.targetUrl,
      clientCrawl.httpStatus || 0,
      record.keyword,
      record.searchLocation
    );

    if (!clientCrawl.success) {
      unavailableParts.push(`Client page fetch (${clientCrawl.error || 'HTTP error'})`);
    }

    // Stage 5: Analyzing competitor pages (bounded concurrency, max 3)
    await SeoAnalysisRepository.updateStage(
      record.tenantId,
      record.id,
      SeoAnalysisStage.STAGE_5_COMPETITOR_PAGES,
      70
    );
    const compCrawlStart = Date.now();
    const competitorSignals: Array<{ competitorUrl: string; domain: string; signals: SeoPageSignals }> = [];
    const competitorInputsForAi: Array<{ candidate: any; signals: SeoPageSignals }> = [];

    const crawlPromises = selectedCompetitors.map(async (candidate) => {
      const res = await SafePageCrawler.crawlPage(candidate.url, {
        keywordContext: record.keyword,
        locationContext: record.searchLocation,
      });
      return { candidate, res };
    });

    const settledResults = await Promise.allSettled(crawlPromises);
    for (const settled of settledResults) {
      if (settled.status === 'fulfilled') {
        const { candidate, res } = settled.value;
        if (res.success && res.signals) {
          competitorSignals.push({
            competitorUrl: candidate.url,
            domain: candidate.domain,
            signals: res.signals,
          });
          competitorInputsForAi.push({
            candidate,
            signals: res.signals,
          });
        } else {
          unavailableParts.push(`Competitor ${candidate.domain} crawl (${res.error || 'Failed'})`);
        }
      }
    }
    executionTimesMs['competitorCrawlMs'] = Date.now() - compCrawlStart;

    // Stage 6: Comparing SEO signals & deterministic gaps
    await SeoAnalysisRepository.updateStage(
      record.tenantId,
      record.id,
      SeoAnalysisStage.STAGE_6_SIGNAL_COMPARISON,
      80
    );
    const gapStart = Date.now();
    const gaps = SeoGapEngine.evaluateGaps({
      clientSignals,
      competitorSignals,
      keyword: record.keyword,
      location: record.searchLocation,
    });
    executionTimesMs['gapEngineMs'] = Date.now() - gapStart;

    // Stage 7: Generating AI recommendations
    await SeoAnalysisRepository.updateStage(
      record.tenantId,
      record.id,
      SeoAnalysisStage.STAGE_7_AI_RECOMMENDATIONS,
      90
    );
    const aiStart = Date.now();

    // Load brand name and existing pages for internal link suggestions
    const brand = await prisma.brand.findFirst({
      where: { id: record.brandId, tenantId: record.tenantId },
      select: { name: true },
    });
    const brandName = brand?.name || 'Local Business';

    const localPages = await prisma.page.findMany({
      where: { tenantId: record.tenantId, brandId: record.brandId },
      select: { title: true, slug: true },
      take: 5,
    });

    const aiAnalysis = await SeoAiAdvisor.generateRecommendations({
      brandName,
      targetUrl: record.targetUrl,
      keyword: record.keyword,
      location: record.searchLocation,
      gscEvidence,
      clientSignals,
      competitors: competitorInputsForAi,
      deterministicGaps: gaps,
      availableLocalBiPages: localPages,
    });
    executionTimesMs['aiMs'] = Date.now() - aiStart;

    // Stage 8: Saving Opportunities into database
    await SeoAnalysisRepository.updateStage(
      record.tenantId,
      record.id,
      SeoAnalysisStage.STAGE_8_SAVING_OPPORTUNITIES,
      95
    );
    const createdOpportunityIds = await SeoOpportunityBridge.createOpportunitiesFromAnalysis({
      analysisId: record.id,
      tenantId: record.tenantId,
      brandId: record.brandId,
      webSurfaceId: record.webSurfaceId,
      pageId: record.pageId,
      targetUrl: record.targetUrl,
      keyword: record.keyword,
      keywordId: record.keywordId,
      surfaceType,
      gscEvidence,
      clientSignals,
      competitors: competitorInputsForAi,
      deterministicGaps: gaps,
      aiAnalysis,
    });

    // Final Stage 9: Completed / Partial
    executionTimesMs['totalMs'] = Date.now() - startTime;
    const finalStatus =
      unavailableParts.length > 0 ? SeoAnalysisState.PARTIAL : SeoAnalysisState.COMPLETED;

    const completedRecord: SeoAnalysisRunRecord = {
      ...record,
      status: finalStatus,
      stage: SeoAnalysisStage.STAGE_9_COMPLETED,
      progressPercent: 100,
      gscEvidence,
      serpResults: serpQueryResult.results,
      selectedCompetitors,
      clientSignals,
      competitorSignals,
      gaps,
      aiAnalysis,
      createdOpportunityIds,
      unavailableParts,
      executionTimesMs,
      completedAt: new Date(),
    };

    await SeoAnalysisRepository.saveCompleted(completedRecord);
    logger.info(
      { analysisId: record.id, status: finalStatus, executionTimesMs },
      '[SeoAnalysisService] Analysis run completed'
    );
  }
}
