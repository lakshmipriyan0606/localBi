import { prisma } from '@/shared/database/client';
import { logger } from '@/shared/observability/logger';
import { BacklinkRecord, ReferringDomainRecord, FollowState, BacklinkStatus } from './authority-types';

export class BacklinkRepository {
  private static schemaInitialized = false;

  /**
   * Canonicalizes URLs for reliable target and link comparison:
   * - standardizes protocol & www
   * - removes trailing slashes
   * - strips tracking query params (utm_*, gclid, fbclid, etc.)
   */
  public static canonicalizeUrl(rawUrl: string): string {
    try {
      let parsed = rawUrl.trim();
      if (!parsed.startsWith('http://') && !parsed.startsWith('https://')) {
        parsed = `https://${parsed}`;
      }
      const url = new URL(parsed);
      const searchParams = new URLSearchParams(url.search);
      const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'ref'];
      for (const p of trackingParams) {
        searchParams.delete(p);
      }

      let host = url.hostname.toLowerCase();
      if (host.startsWith('www.')) {
        host = host.slice(4);
      }

      let pathname = url.pathname.replace(/\/+$/, '');
      if (!pathname) pathname = '/';

      const searchStr = searchParams.toString();
      return `${host}${pathname}${searchStr ? `?${searchStr}` : ''}`;
    } catch {
      return rawUrl.trim().toLowerCase().replace(/\/+$/, '');
    }
  }

  /**
   * Idempotently ensures the backlink_records and referring_domains tables and RLS policies exist.
   */
  public static async ensureSchema(): Promise<void> {
    if (this.schemaInitialized) return;

    try {
      const statements = [
        `CREATE TABLE IF NOT EXISTS backlink_records (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          brand_id TEXT NOT NULL,
          web_surface_id TEXT NOT NULL,
          provider TEXT NOT NULL,
          external_id TEXT,
          referring_domain TEXT NOT NULL,
          linking_url TEXT NOT NULL,
          target_url TEXT NOT NULL,
          target_page_id TEXT,
          anchor_text TEXT,
          follow_state TEXT NOT NULL DEFAULT 'UNKNOWN',
          first_seen_at TIMESTAMPTZ,
          last_seen_at TIMESTAMPTZ,
          status TEXT NOT NULL DEFAULT 'ACTIVE',
          provider_authority_metric FLOAT,
          provider_authority_metric_name TEXT,
          discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`,
        `CREATE TABLE IF NOT EXISTS referring_domains (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          brand_id TEXT NOT NULL,
          web_surface_id TEXT NOT NULL,
          domain TEXT NOT NULL,
          active_links_count INT NOT NULL DEFAULT 1,
          linked_pages_count INT NOT NULL DEFAULT 1,
          provider_authority_metric FLOAT,
          provider_authority_metric_name TEXT,
          first_seen_at TIMESTAMPTZ,
          last_seen_at TIMESTAMPTZ,
          competitor_overlap_count INT NOT NULL DEFAULT 0,
          opportunity_state TEXT NOT NULL DEFAULT 'NONE',
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`,
        `CREATE UNIQUE INDEX IF NOT EXISTS uq_backlink_tenant_url_pair ON backlink_records (tenant_id, linking_url, target_url)`,
        `CREATE INDEX IF NOT EXISTS idx_backlink_tenant_brand_surface ON backlink_records (tenant_id, brand_id, web_surface_id)`,
        `CREATE INDEX IF NOT EXISTS idx_backlink_tenant_ref_domain ON backlink_records (tenant_id, referring_domain)`,
        `CREATE INDEX IF NOT EXISTS idx_backlink_tenant_status ON backlink_records (tenant_id, status)`,
        `CREATE UNIQUE INDEX IF NOT EXISTS uq_referring_domain_tenant_brand_domain ON referring_domains (tenant_id, brand_id, web_surface_id, domain)`,
        `CREATE INDEX IF NOT EXISTS idx_referring_domains_tenant_brand ON referring_domains (tenant_id, brand_id, updated_at DESC)`,
        `ALTER TABLE backlink_records ENABLE ROW LEVEL SECURITY`,
        `ALTER TABLE backlink_records FORCE ROW LEVEL SECURITY`,
        `ALTER TABLE referring_domains ENABLE ROW LEVEL SECURITY`,
        `ALTER TABLE referring_domains FORCE ROW LEVEL SECURITY`,
        `DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'backlink_records' AND policyname = 'tenant_isolation_policy'
          ) THEN
            CREATE POLICY tenant_isolation_policy ON backlink_records
              FOR ALL
              TO localbi_app
              USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text);
          END IF;

          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'referring_domains' AND policyname = 'tenant_isolation_policy'
          ) THEN
            CREATE POLICY tenant_isolation_policy ON referring_domains
              FOR ALL
              TO localbi_app
              USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text);
          END IF;
        END $$;`,
        `DO $$
        BEGIN
          EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON backlink_records TO localbi_app';
          EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON referring_domains TO localbi_app';
        EXCEPTION
          WHEN OTHERS THEN NULL;
        END $$;`,
      ];

      const migratorUrl = process.env.DIRECT_URL || process.env.MIGRATOR_DATABASE_URL;
      const { PrismaClient } = await import('@prisma/client');
      const ddlClient = migratorUrl
        ? new PrismaClient({ datasources: { db: { url: migratorUrl } } })
        : prisma;

      for (const stmt of statements) {
        try {
          await ddlClient.$executeRawUnsafe(stmt);
        } catch (e: any) {
          console.error('Failed on stmt:\n', stmt, '\nError:', e.message);
          throw e;
        }
      }

      if (migratorUrl) {
        await ddlClient.$disconnect();
      }

      this.schemaInitialized = true;
    } catch (err: any) {
      logger.warn({ error: err.message }, 'Notice during BacklinkRepository.ensureSchema execution');
    }
  }

  /**
   * Batch upserts normalized backlink records with safe reconciliation.
   */
  public static async upsertBacklinks(
    tenantId: string,
    brandId: string,
    webSurfaceId: string,
    records: Omit<BacklinkRecord, 'id' | 'tenantId' | 'brandId' | 'webSurfaceId'>[]
  ): Promise<number> {
    await this.ensureSchema();
    if (records.length === 0) return 0;

    const { TenantContextService } = await import('@/shared/database/tenant-context');
    let upserted = 0;

    await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      for (const r of records) {
        const id = `blk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        await tx.$executeRawUnsafe(
          `
          INSERT INTO backlink_records (
            id, tenant_id, brand_id, web_surface_id, provider, external_id,
            referring_domain, linking_url, target_url, target_page_id,
            anchor_text, follow_state, first_seen_at, last_seen_at,
            status, provider_authority_metric, provider_authority_metric_name,
            discovered_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10,
            $11, $12, $13, $14,
            $15, $16, $17,
            NOW(), NOW()
          )
          ON CONFLICT (tenant_id, linking_url, target_url)
          DO UPDATE SET
            anchor_text = EXCLUDED.anchor_text,
            follow_state = EXCLUDED.follow_state,
            last_seen_at = EXCLUDED.last_seen_at,
            status = EXCLUDED.status,
            provider_authority_metric = EXCLUDED.provider_authority_metric,
            updated_at = NOW();
        `,
          id,
          tenantId,
          brandId,
          webSurfaceId,
          r.provider,
          r.externalId ?? null,
          r.referringDomain,
          r.linkingUrl,
          r.targetUrl,
          r.targetPageId ?? null,
          r.anchorText ?? null,
          r.followState,
          r.firstSeenAt ?? null,
          r.lastSeenAt ?? null,
          r.status,
          r.providerAuthorityMetric ?? null,
          r.providerAuthorityMetricName ?? null
        );
        upserted++;
      }

      await this.refreshReferringDomains(tenantId, brandId, webSurfaceId, tx);
    });

    return upserted;
  }

  /**
   * Recomputes and updates referring_domains table from backlink_records for this tenant/brand/surface.
   */
  public static async refreshReferringDomains(
    tenantId: string,
    brandId: string,
    webSurfaceId: string,
    existingTx?: any
  ): Promise<void> {
    await this.ensureSchema();

    const run = async (client: any) => {
      await client.$executeRawUnsafe(
        `
        INSERT INTO referring_domains (
          id, tenant_id, brand_id, web_surface_id, domain,
          active_links_count, linked_pages_count, provider_authority_metric,
          provider_authority_metric_name, first_seen_at, last_seen_at, updated_at
        )
        SELECT
          'ref_' || md5($1 || $2 || $3 || referring_domain),
          $1, $2, $3, referring_domain,
          COUNT(*)::int as active_links_count,
          COUNT(DISTINCT target_url)::int as linked_pages_count,
          MAX(provider_authority_metric) as provider_authority_metric,
          MAX(provider_authority_metric_name) as provider_authority_metric_name,
          MIN(first_seen_at) as first_seen_at,
          MAX(last_seen_at) as last_seen_at,
          NOW()
        FROM backlink_records
        WHERE tenant_id = $1 AND brand_id = $2 AND web_surface_id = $3 AND status = 'ACTIVE'
        GROUP BY referring_domain
        ON CONFLICT (tenant_id, brand_id, web_surface_id, domain)
        DO UPDATE SET
          active_links_count = EXCLUDED.active_links_count,
          linked_pages_count = EXCLUDED.linked_pages_count,
          provider_authority_metric = EXCLUDED.provider_authority_metric,
          first_seen_at = EXCLUDED.first_seen_at,
          last_seen_at = EXCLUDED.last_seen_at,
          updated_at = NOW();
      `,
        tenantId,
        brandId,
        webSurfaceId
      );
    };

    if (existingTx) {
      await run(existingTx);
    } else {
      const { TenantContextService } = await import('@/shared/database/tenant-context');
      await TenantContextService.withTenantContext(prisma, tenantId, run);
    }
  }

  /**
   * Paginated retrieval of backlinks.
   */
  public static async listBacklinks(
    tenantId: string,
    brandId: string,
    webSurfaceId: string,
    options: {
      page?: number;
      limit?: number;
      followState?: FollowState;
      status?: BacklinkStatus;
      search?: string;
    }
  ): Promise<{ items: BacklinkRecord[]; totalCount: number }> {
    await this.ensureSchema();
    const { TenantContextService } = await import('@/shared/database/tenant-context');

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const limit = Math.min(options.limit || 25, 100);
      const page = Math.max(options.page || 1, 1);
      const offset = (page - 1) * limit;

      let whereClause = `WHERE tenant_id = $1 AND brand_id = $2 AND web_surface_id = $3`;
      const params: any[] = [tenantId, brandId, webSurfaceId];

      if (options.followState) {
        params.push(options.followState);
        whereClause += ` AND follow_state = $${params.length}`;
      }

      if (options.status) {
        params.push(options.status);
        whereClause += ` AND status = $${params.length}`;
      }

      if (options.search) {
        params.push(`%${options.search}%`);
        whereClause += ` AND (referring_domain ILIKE $${params.length} OR anchor_text ILIKE $${params.length} OR linking_url ILIKE $${params.length})`;
      }

      const countRes: any = await tx.$queryRawUnsafe(
        `SELECT COUNT(*)::int as count FROM backlink_records ${whereClause}`,
        ...params
      );
      const totalCount = countRes[0]?.count || 0;

      const rows: any = await tx.$queryRawUnsafe(
        `
        SELECT
          id, tenant_id as "tenantId", brand_id as "brandId", web_surface_id as "webSurfaceId",
          provider, external_id as "externalId", referring_domain as "referringDomain",
          linking_url as "linkingUrl", target_url as "targetUrl", target_page_id as "targetPageId",
          anchor_text as "anchorText", follow_state as "followState",
          first_seen_at as "firstSeenAt", last_seen_at as "lastSeenAt", status,
          provider_authority_metric as "providerAuthorityMetric",
          provider_authority_metric_name as "providerAuthorityMetricName",
          discovered_at as "discoveredAt", updated_at as "updatedAt"
        FROM backlink_records
        ${whereClause}
        ORDER BY last_seen_at DESC NULLS LAST, discovered_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `,
        ...params,
        limit,
        offset
      );

      return { items: rows, totalCount };
    });
  }

  /**
   * Paginated retrieval of referring domains.
   */
  public static async listReferringDomains(
    tenantId: string,
    brandId: string,
    webSurfaceId: string,
    options: {
      page?: number;
      limit?: number;
      search?: string;
    }
  ): Promise<{ items: ReferringDomainRecord[]; totalCount: number }> {
    await this.ensureSchema();
    const { TenantContextService } = await import('@/shared/database/tenant-context');

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const limit = Math.min(options.limit || 25, 100);
      const page = Math.max(options.page || 1, 1);
      const offset = (page - 1) * limit;

      let whereClause = `WHERE tenant_id = $1 AND brand_id = $2 AND web_surface_id = $3`;
      const params: any[] = [tenantId, brandId, webSurfaceId];

      if (options.search) {
        params.push(`%${options.search}%`);
        whereClause += ` AND domain ILIKE $${params.length}`;
      }

      const countRes: any = await tx.$queryRawUnsafe(
        `SELECT COUNT(*)::int as count FROM referring_domains ${whereClause}`,
        ...params
      );
      const totalCount = countRes[0]?.count || 0;

      const rows: any = await tx.$queryRawUnsafe(
        `
        SELECT
          id, tenant_id as "tenantId", brand_id as "brandId", web_surface_id as "webSurfaceId",
          domain, active_links_count as "activeLinksCount", linked_pages_count as "linkedPagesCount",
          provider_authority_metric as "providerAuthorityMetric",
          provider_authority_metric_name as "providerAuthorityMetricName",
          first_seen_at as "firstSeenAt", last_seen_at as "lastSeenAt",
          competitor_overlap_count as "competitorOverlapCount",
          opportunity_state as "opportunityState", updated_at as "updatedAt"
        FROM referring_domains
        ${whereClause}
        ORDER BY active_links_count DESC, provider_authority_metric DESC NULLS LAST
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `,
        ...params,
        limit,
        offset
      );

      return { items: rows, totalCount };
    });
  }

  /**
   * Retrieves summary counts for backlinks & referring domains.
   */
  public static async getSummaryMetrics(
    tenantId: string,
    brandId: string,
    webSurfaceId: string
  ): Promise<{
    totalBacklinks: number;
    referringDomains: number;
    newLinksLast30Days: number;
    lostLinksLast30Days: number;
  }> {
    await this.ensureSchema();
    const { TenantContextService } = await import('@/shared/database/tenant-context');

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [activeRes, lostRes, newRes, refRes]: any = await Promise.all([
        tx.$queryRawUnsafe(
          `SELECT COUNT(*)::int as count FROM backlink_records WHERE tenant_id = $1 AND brand_id = $2 AND web_surface_id = $3 AND status = 'ACTIVE'`,
          tenantId,
          brandId,
          webSurfaceId
        ),
        tx.$queryRawUnsafe(
          `SELECT COUNT(*)::int as count FROM backlink_records WHERE tenant_id = $1 AND brand_id = $2 AND web_surface_id = $3 AND status = 'LOST' AND updated_at >= $4`,
          tenantId,
          brandId,
          webSurfaceId,
          thirtyDaysAgo
        ),
        tx.$queryRawUnsafe(
          `SELECT COUNT(*)::int as count FROM backlink_records WHERE tenant_id = $1 AND brand_id = $2 AND web_surface_id = $3 AND first_seen_at >= $4`,
          tenantId,
          brandId,
          webSurfaceId,
          thirtyDaysAgo
        ),
        tx.$queryRawUnsafe(
          `SELECT COUNT(*)::int as count FROM referring_domains WHERE tenant_id = $1 AND brand_id = $2 AND web_surface_id = $3`,
          tenantId,
          brandId,
          webSurfaceId
        ),
      ]);

      return {
        totalBacklinks: activeRes[0]?.count || 0,
        lostLinksLast30Days: lostRes[0]?.count || 0,
        newLinksLast30Days: newRes[0]?.count || 0,
        referringDomains: refRes[0]?.count || 0,
      };
    });
  }

  /**
   * Marks specific links as LOST only when confirmed by provider or full reconciliation.
   * Partial sync NEVER calls this!
   */
  public static async markLinksLost(
    tenantId: string,
    brandId: string,
    webSurfaceId: string,
    lostLinkingUrls: string[]
  ): Promise<number> {
    await this.ensureSchema();
    if (lostLinkingUrls.length === 0) return 0;

    const { TenantContextService } = await import('@/shared/database/tenant-context');

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const res: any = await tx.$executeRawUnsafe(
        `
        UPDATE backlink_records
        SET status = 'LOST', updated_at = NOW()
        WHERE tenant_id = $1 AND brand_id = $2 AND web_surface_id = $3 AND linking_url = ANY($4::text[])
      `,
        tenantId,
        brandId,
        webSurfaceId,
        lostLinkingUrls
      );

      await this.refreshReferringDomains(tenantId, brandId, webSurfaceId, tx);
      return res;
    });
  }
}
