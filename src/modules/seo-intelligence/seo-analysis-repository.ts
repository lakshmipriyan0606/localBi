import { prisma } from '@/shared/database/client';
import { logger } from '@/shared/observability/logger';
import {
  SeoAnalysisRunRecord,
  SeoAnalysisStage,
  SeoAnalysisStageValue,
  SeoAnalysisState,
  SeoAnalysisStateValue,
} from './seo-types';

export class SeoAnalysisRepository {
  private static tableInitialized = false;

  /**
   * Idempotently initializes the seo_analyses table and dual-role RLS policies if not present.
   */
  public static async ensureSchema(): Promise<void> {
    if (this.tableInitialized) return;

    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS seo_analyses (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          brand_id TEXT NOT NULL,
          web_surface_id TEXT NOT NULL,
          page_id TEXT,
          target_url TEXT NOT NULL,
          keyword TEXT NOT NULL,
          keyword_id TEXT,
          search_location TEXT NOT NULL,
          country TEXT NOT NULL,
          device TEXT NOT NULL,
          fingerprint TEXT NOT NULL,
          status TEXT NOT NULL,
          stage TEXT NOT NULL,
          progress_percent INT NOT NULL DEFAULT 0,
          gsc_evidence JSONB,
          serp_results JSONB,
          selected_competitors JSONB,
          client_signals JSONB,
          competitor_signals JSONB,
          gaps JSONB,
          ai_analysis JSONB,
          created_opportunity_ids JSONB,
          unavailable_parts JSONB,
          execution_times_ms JSONB,
          error_message TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          completed_at TIMESTAMPTZ,
          CONSTRAINT fk_seo_analyses_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
        );

        CREATE UNIQUE INDEX IF NOT EXISTS uq_seo_analyses_tenant_id ON seo_analyses (tenant_id, id);
        CREATE INDEX IF NOT EXISTS idx_seo_analyses_tenant_fp_status ON seo_analyses (tenant_id, fingerprint, status);
        CREATE INDEX IF NOT EXISTS idx_seo_analyses_tenant_brand ON seo_analyses (tenant_id, brand_id, created_at DESC);

        ALTER TABLE seo_analyses ENABLE ROW LEVEL SECURITY;
        ALTER TABLE seo_analyses FORCE ROW LEVEL SECURITY;

        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'seo_analyses' AND policyname = 'tenant_isolation_policy'
          ) THEN
            CREATE POLICY tenant_isolation_policy ON seo_analyses
              FOR ALL
              TO localbi_app
              USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text);
          END IF;
        END $$;

        DO $$
        BEGIN
          EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON seo_analyses TO localbi_app';
        EXCEPTION
          WHEN OTHERS THEN NULL;
        END $$;
      `);

      this.tableInitialized = true;
    } catch (err: any) {
      logger.warn({ error: err.message }, 'Notice during SeoAnalysisRepository.ensureSchema execution');
    }
  }

  public static async create(record: SeoAnalysisRunRecord): Promise<void> {
    await this.ensureSchema();

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO seo_analyses (
        id, tenant_id, brand_id, web_surface_id, page_id,
        target_url, keyword, keyword_id, search_location, country,
        device, fingerprint, status, stage, progress_percent,
        gsc_evidence, serp_results, selected_competitors, client_signals,
        competitor_signals, gaps, ai_analysis, created_opportunity_ids,
        unavailable_parts, execution_times_ms, error_message, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16::jsonb, $17::jsonb, $18::jsonb, $19::jsonb,
        $20::jsonb, $21::jsonb, $22::jsonb, $23::jsonb,
        $24::jsonb, $25::jsonb, $26, $27, $28
      )
    `,
      record.id,
      record.tenantId,
      record.brandId,
      record.webSurfaceId,
      record.pageId,
      record.targetUrl,
      record.keyword,
      record.keywordId,
      record.searchLocation,
      record.country,
      record.device,
      record.fingerprint,
      record.status,
      record.stage,
      record.progressPercent,
      JSON.stringify(record.gscEvidence),
      JSON.stringify(record.serpResults),
      JSON.stringify(record.selectedCompetitors),
      JSON.stringify(record.clientSignals),
      JSON.stringify(record.competitorSignals),
      JSON.stringify(record.gaps),
      JSON.stringify(record.aiAnalysis),
      JSON.stringify(record.createdOpportunityIds),
      JSON.stringify(record.unavailableParts),
      JSON.stringify(record.executionTimesMs),
      record.errorMessage ?? null,
      record.createdAt,
      record.updatedAt
    );
  }

  public static async updateStage(
    tenantId: string,
    id: string,
    stage: SeoAnalysisStageValue,
    progressPercent: number
  ): Promise<void> {
    await this.ensureSchema();
    await prisma.$executeRawUnsafe(
      `
      UPDATE seo_analyses
      SET stage = $1, progress_percent = $2, updated_at = NOW()
      WHERE tenant_id = $3 AND id = $4
    `,
      stage,
      progressPercent,
      tenantId,
      id
    );
  }

  public static async saveCompleted(record: SeoAnalysisRunRecord): Promise<void> {
    await this.ensureSchema();
    await prisma.$executeRawUnsafe(
      `
      UPDATE seo_analyses
      SET
        status = $1,
        stage = $2,
        progress_percent = $3,
        gsc_evidence = $4::jsonb,
        serp_results = $5::jsonb,
        selected_competitors = $6::jsonb,
        client_signals = $7::jsonb,
        competitor_signals = $8::jsonb,
        gaps = $9::jsonb,
        ai_analysis = $10::jsonb,
        created_opportunity_ids = $11::jsonb,
        unavailable_parts = $12::jsonb,
        execution_times_ms = $13::jsonb,
        error_message = $14,
        updated_at = NOW(),
        completed_at = $15
      WHERE tenant_id = $16 AND id = $17
    `,
      record.status,
      record.stage,
      record.progressPercent,
      JSON.stringify(record.gscEvidence),
      JSON.stringify(record.serpResults),
      JSON.stringify(record.selectedCompetitors),
      JSON.stringify(record.clientSignals),
      JSON.stringify(record.competitorSignals),
      JSON.stringify(record.gaps),
      JSON.stringify(record.aiAnalysis),
      JSON.stringify(record.createdOpportunityIds),
      JSON.stringify(record.unavailableParts),
      JSON.stringify(record.executionTimesMs),
      record.errorMessage ?? null,
      record.completedAt || new Date(),
      record.tenantId,
      record.id
    );
  }

  public static async markFailed(tenantId: string, id: string, error: string): Promise<void> {
    await this.ensureSchema();
    await prisma.$executeRawUnsafe(
      `
      UPDATE seo_analyses
      SET status = $1, error_message = $2, updated_at = NOW()
      WHERE tenant_id = $3 AND id = $4
    `,
      SeoAnalysisState.FAILED,
      error,
      tenantId,
      id
    );
  }

  public static async findActiveByFingerprint(
    tenantId: string,
    fingerprint: string
  ): Promise<SeoAnalysisRunRecord | null> {
    await this.ensureSchema();
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `
      SELECT * FROM seo_analyses
      WHERE tenant_id = $1 AND fingerprint = $2 AND status IN ('QUEUED', 'PROCESSING')
      ORDER BY created_at DESC
      LIMIT 1
    `,
      tenantId,
      fingerprint
    );

    return rows.length > 0 ? this.mapRowToRecord(rows[0]) : null;
  }

  public static async findRecentCompleted(
    tenantId: string,
    fingerprint: string,
    maxAgeHours = 24
  ): Promise<SeoAnalysisRunRecord | null> {
    await this.ensureSchema();
    const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `
      SELECT * FROM seo_analyses
      WHERE tenant_id = $1 AND fingerprint = $2 AND status IN ('COMPLETED', 'PARTIAL') AND completed_at >= $3
      ORDER BY completed_at DESC
      LIMIT 1
    `,
      tenantId,
      fingerprint,
      cutoff
    );

    return rows.length > 0 ? this.mapRowToRecord(rows[0]) : null;
  }

  public static async findById(tenantId: string, id: string): Promise<SeoAnalysisRunRecord | null> {
    await this.ensureSchema();
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `
      SELECT * FROM seo_analyses
      WHERE tenant_id = $1 AND id = $2
      LIMIT 1
    `,
      tenantId,
      id
    );

    return rows.length > 0 ? this.mapRowToRecord(rows[0]) : null;
  }

  public static async listByTenant(
    tenantId: string,
    brandId?: string,
    limit = 20
  ): Promise<SeoAnalysisRunRecord[]> {
    await this.ensureSchema();
    let query = `SELECT * FROM seo_analyses WHERE tenant_id = $1`;
    const params: any[] = [tenantId];

    if (brandId) {
      query += ` AND brand_id = $2`;
      params.push(brandId);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const rows = await prisma.$queryRawUnsafe<any[]>(query, ...params);
    return rows.map((r) => this.mapRowToRecord(r));
  }

  private static mapRowToRecord(row: any): SeoAnalysisRunRecord {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      brandId: row.brand_id,
      webSurfaceId: row.web_surface_id,
      pageId: row.page_id,
      targetUrl: row.target_url,
      keyword: row.keyword,
      keywordId: row.keyword_id,
      searchLocation: row.search_location,
      country: row.country,
      device: row.device,
      fingerprint: row.fingerprint,
      status: row.status as SeoAnalysisStateValue,
      stage: row.stage as SeoAnalysisStageValue,
      progressPercent: row.progress_percent,
      gscEvidence: typeof row.gsc_evidence === 'string' ? JSON.parse(row.gsc_evidence) : row.gsc_evidence,
      serpResults: typeof row.serp_results === 'string' ? JSON.parse(row.serp_results) : row.serp_results || [],
      selectedCompetitors:
        typeof row.selected_competitors === 'string'
          ? JSON.parse(row.selected_competitors)
          : row.selected_competitors || [],
      clientSignals:
        typeof row.client_signals === 'string' ? JSON.parse(row.client_signals) : row.client_signals,
      competitorSignals:
        typeof row.competitor_signals === 'string'
          ? JSON.parse(row.competitor_signals)
          : row.competitor_signals || [],
      gaps: typeof row.gaps === 'string' ? JSON.parse(row.gaps) : row.gaps || [],
      aiAnalysis: typeof row.ai_analysis === 'string' ? JSON.parse(row.ai_analysis) : row.ai_analysis,
      createdOpportunityIds:
        typeof row.created_opportunity_ids === 'string'
          ? JSON.parse(row.created_opportunity_ids)
          : row.created_opportunity_ids || [],
      unavailableParts:
        typeof row.unavailable_parts === 'string'
          ? JSON.parse(row.unavailable_parts)
          : row.unavailable_parts || [],
      executionTimesMs:
        typeof row.execution_times_ms === 'string'
          ? JSON.parse(row.execution_times_ms)
          : row.execution_times_ms || {},
      errorMessage: row.error_message,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
    };
  }
}
