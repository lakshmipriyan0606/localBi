import { prisma } from '@/shared/database/client';
import { logger } from '@/shared/observability/logger';
import { BacklinkProviderRegistry } from './providers/backlink-provider-registry';
import { BacklinkRepository } from './backlink-repository';
import { BacklinkRecord, BacklinkProviderState } from './authority-types';

export interface BacklinkSyncResult {
  success: boolean;
  state: BacklinkProviderState;
  upsertedCount: number;
  isPartial: boolean;
  error?: string;
}

export class BacklinkSyncService {
  /**
   * Performs an asynchronous, bounded provider backlink sync for a brand & WebSurface.
   * Ensures safe partial sync semantics: if an error occurs during pagination,
   * fetched records are preserved, existing links are NOT marked lost, and state is PARTIAL.
   */
  public static async syncBacklinksForSurface(
    tenantId: string,
    brandId: string,
    webSurfaceId: string
  ): Promise<BacklinkSyncResult> {
    const provider = BacklinkProviderRegistry.getProvider();
    const providerState = await provider.getState();

    if (providerState === 'NOT_CONFIGURED') {
      return {
        success: false,
        state: 'NOT_CONFIGURED',
        upsertedCount: 0,
        isPartial: false,
        error: 'Backlink data provider is not configured.',
      };
    }

    // Resolve surface domain
    const { TenantContextService } = await import('@/shared/database/tenant-context');
    const webSurface = await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      return tx.webSurface.findFirst({
        where: { id: webSurfaceId, tenantId },
        include: { domains: true },
      });
    });

    if (!webSurface) {
      return {
        success: false,
        state: 'UPSTREAM_ERROR',
        upsertedCount: 0,
        isPartial: false,
        error: 'WebSurface not found',
      };
    }

    const domain =
      webSurface.domains.find((d) => d.isPrimary)?.hostname ||
      webSurface.domains[0]?.hostname ||
      webSurface.name;

    if (!domain) {
      return {
        success: false,
        state: 'UPSTREAM_ERROR',
        upsertedCount: 0,
        isPartial: false,
        error: 'WebSurface has no domain configured',
      };
    }

    const cleanDomain = BacklinkRepository.canonicalizeUrl(domain).split('/')[0]!;

    let cursor: string | undefined = undefined;
    let totalUpserted = 0;
    let isPartial = false;
    const maxPages = 5; // Bounded to prevent memory blowout and API exhaustion
    let pagesFetched = 0;

    try {
      while (pagesFetched < maxPages) {
        pagesFetched++;
        const res = await provider.listBacklinks({
          domain: cleanDomain,
          limit: 100,
          cursor,
        });

        if (res.items.length === 0) break;

        const count = await BacklinkRepository.upsertBacklinks(
          tenantId,
          brandId,
          webSurfaceId,
          res.items
        );
        totalUpserted += count;

        if (!res.hasMore || !res.nextCursor) {
          break;
        }
        cursor = res.nextCursor;
      }
    } catch (err: any) {
      logger.error({ error: err.message, domain: cleanDomain }, 'Error during backlink sync pagination');
      isPartial = true;
    }

    return {
      success: !isPartial,
      state: isPartial ? 'PARTIAL' : 'CONFIGURED',
      upsertedCount: totalUpserted,
      isPartial,
    };
  }
}
