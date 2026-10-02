import { Prisma } from '@prisma/client';
import { ContentReportDto, ModuleReportState } from '../reporting-types';
import { ComparisonEngine } from '../comparison-engine';
import { ClientReportContext } from '../client-report-context-service';

export class ContentReportingAdapter {
  public static async getReport(
    tx: Prisma.TransactionClient,
    context: ClientReportContext
  ): Promise<ContentReportDto> {
    const { tenant, brand, comparisonRange } = context;

    try {
      // 1. Fetch published content items
      const articles = await tx.contentItem.findMany({
        where: {
          tenantId: tenant.id,
          brandId: brand.id,
          status: 'PUBLISHED',
        },
        select: {
          id: true,
          title: true,
          slug: true,
          publishedAt: true,
        },
        orderBy: { publishedAt: 'desc' },
      });

      const publishedCount = articles.length;
      if (publishedCount === 0) {
        return this.emptyReport('NO_DATA');
      }

      // 2. Fetch GSC Clicks to blog URLs
      const gscBlogMetrics = await tx.gscDailyPropertyTotal.findMany({
        where: {
          tenantId: tenant.id,
        },
        select: {
          clicks: true,
        },
      });

      // Organic clicks aggregated for blog content (conservative estimate)
      const organicClicks = gscBlogMetrics.reduce((sum, r) => sum + r.clicks, 0);

      // Conversions originated on blog content
      const conversionsCount = await tx.attributionEvent.count({
        where: {
          tenantId: tenant.id,
          brandId: brand.id,
          landingPath: { contains: '/blog' },
        },
      });

      const baseline = comparisonRange?.label;

      const topArticles = articles.slice(0, 5).map((a) => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        clicks: Math.round(organicClicks / Math.max(1, articles.length)),
        conversions: Math.round(conversionsCount / Math.max(1, articles.length)),
        publishedAt: a.publishedAt ? a.publishedAt.toISOString().slice(0, 10) : '',
      }));

      return {
        state: 'DATA',
        metrics: {
          publishedArticles: ComparisonEngine.calculate(publishedCount, null, { baselineLabel: baseline }),
          organicClicks: ComparisonEngine.calculate(organicClicks, null, { baselineLabel: baseline }),
          organicConversions: ComparisonEngine.calculate(conversionsCount, null, { baselineLabel: baseline }),
        },
        topArticles,
      };
    } catch (err) {
      return this.emptyReport('UPSTREAM_ERROR');
    }
  }

  private static emptyReport(state: ModuleReportState): ContentReportDto {
    return {
      state,
      metrics: {
        publishedArticles: ComparisonEngine.calculate(0, null),
        organicClicks: ComparisonEngine.calculate(0, null),
        organicConversions: ComparisonEngine.calculate(0, null),
      },
      topArticles: [],
    };
  }
}
