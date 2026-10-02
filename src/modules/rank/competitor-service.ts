import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { AuthorizedContext, AuthorizationService, Action } from '@/shared/authorization/policy';
import { Prisma } from '@prisma/client';
import { logger } from '@/shared/observability/logger';
import { CompetitorObservation } from './rank-provider';

export interface CompetitorDto {
  id: string;
  name: string;
  externalPlaceId: string | null;
  domain: string | null;
  category: string | null;
  observedFrequency: number;
  lastObservedAt: Date;
}

export class CompetitorService {
  /**
   * Ingests competitor observations from a rank scan under a single transaction.
   * Deduplicates competitors across observations using externalPlaceId.
   * Increments observedFrequency in StoreCompetitor mapping.
   */
  public static async recordCompetitors(
    tx: Prisma.TransactionClient,
    tenantId: string,
    storeId: string,
    observations: CompetitorObservation[]
  ): Promise<number> {
    const validCompetitors = observations.filter(
      (c) => c.name && c.name.trim().length > 0
    );

    let recorded = 0;

    for (const comp of validCompetitors) {
      const name = comp.name.trim();
      const placeId = comp.externalPlaceId?.trim() || null;

      try {
        let competitorId: string;

        if (placeId) {
          // Upsert competitor by stable Place ID
          const record = await tx.competitor.upsert({
            where: {
              uq_competitor_place_id: {
                tenantId,
                externalPlaceId: placeId,
              },
            },
            create: {
              tenantId,
              name,
              externalPlaceId: placeId,
              domain: comp.domain ?? null,
              source: 'OBSERVED',
            },
            update: {
              name,
              domain: comp.domain ?? null,
              updatedAt: new Date(),
            },
          });
          competitorId = record.id;
        } else {
          // Fallback: match by name if no placeId
          const existing = await tx.competitor.findFirst({
            where: { tenantId, name, externalPlaceId: null },
          });

          if (existing) {
            competitorId = existing.id;
          } else {
            const created = await tx.competitor.create({
              data: {
                tenantId,
                name,
                domain: comp.domain ?? null,
                source: 'OBSERVED',
              },
            });
            competitorId = created.id;
          }
        }

        // Upsert StoreCompetitor mapping
        await tx.storeCompetitor.upsert({
          where: {
            uq_store_competitor: {
              tenantId,
              storeId,
              competitorId,
            },
          },
          create: {
            tenantId,
            storeId,
            competitorId,
            observedFrequency: 1,
            lastObservedAt: new Date(),
          },
          update: {
            observedFrequency: { increment: 1 },
            lastObservedAt: new Date(),
          },
        });

        recorded++;
      } catch (err) {
        logger.warn(
          { tenantId, storeId, competitorName: name, err },
          '[CompetitorService] Failed to record competitor observation'
        );
      }
    }

    return recorded;
  }

  /**
   * Retrieves top competitors observed for a specific store.
   */
  public static async getStoreCompetitors(
    tenantId: string,
    storeId: string,
    context: AuthorizedContext,
    limit = 20
  ): Promise<CompetitorDto[]> {
    AuthorizationService.assertCan(context, Action.DASHBOARD_VIEW);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const store = await tx.location.findFirst({
        where: { id: storeId, tenantId, isArchived: false },
        select: { id: true },
      });
      if (!store) throw new Error(`Store ${storeId} not found`);

      const mappings = await tx.storeCompetitor.findMany({
        where: { tenantId, storeId },
        include: { competitor: true },
        orderBy: [{ observedFrequency: 'desc' }, { lastObservedAt: 'desc' }],
        take: limit,
      });

      return mappings.map((m) => ({
        id: m.competitor.id,
        name: m.competitor.name,
        externalPlaceId: m.competitor.externalPlaceId,
        domain: m.competitor.domain,
        category: m.competitor.category,
        observedFrequency: m.observedFrequency,
        lastObservedAt: m.lastObservedAt,
      }));
    });
  }
}
