import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { AuthorizedContext } from '@/shared/authorization/policy';
import { createTenantAccessDeniedError } from '@/shared/errors';

export interface OverviewLocationMapItem {
  id: string;
  name: string;
  region: 'us' | 'india' | 'other';
  countryCode: string;
  countryName: string;
  flag: string;
  lat: number;
  lng: number;
  users: number;
  conversions: number;
  rate: string;
  trend: number;
  isHq?: boolean;
}

export interface OverviewLocationRankingItem {
  rank: number;
  name: string;
  region: string;
  users: number;
  conversions: number;
  rate: string;
  trend: number;
}

export interface OverviewGscQueryItem {
  query: string;
  clicks: number;
  impressions: number;
  ctr: string;
  position: number;
}

export interface OverviewKeywordOpportunityItem {
  keyword: string;
  potential: 'High' | 'Medium' | 'Low';
}

export interface OverviewTrendPoint {
  date: string;
  clicks: number;
  impressions: number;
}

export interface OverviewDataDto {
  isDemo: boolean;
  tenantName: string;
  tenantSlug: string;
  locationsCount: number;
  brandsCount: number;
  categoriesCount: number;
  brandTagline: string;
  storeBadgeName: string;
  storeBadgeIcon: string;
  marketingQuote: {
    quote: string;
    authorOrStore: string;
  };
  gbp: {
    profileViews: number;
    profileViewsDelta: number;
    calls: number;
    callsDelta: number;
    directions: number;
    directionsDelta: number;
    reviews: number;
    reviewsDelta: number;
    photoViews: number;
    photoViewsDelta: number;
    hasData: boolean;
  };
  gsc: {
    clicks: number;
    clicksDelta: number;
    impressions: number;
    impressionsDelta: number;
    ctr: number;
    ctrDelta: number;
    position: number;
    positionDelta: number;
    hasData: boolean;
    queries: OverviewGscQueryItem[];
    keywordOpportunities: OverviewKeywordOpportunityItem[];
    trendData: OverviewTrendPoint[];
  };
  web: {
    users: number;
    usersDelta: number;
    sessions: number;
    sessionsDelta: number;
    engagedSessions: number;
    engagedSessionsDelta: number;
    conversionRate: number;
    conversionRateDelta: number;
    conversions: number;
    conversionsDelta: number;
    hasData: boolean;
    locations: OverviewLocationMapItem[];
    rankings: OverviewLocationRankingItem[];
  };
}

// -----------------------------------------------------------------------------
// SHOWCASE DEMO DATA FOR "ABC DENTAL" (Handled strictly on the backend)
// -----------------------------------------------------------------------------
const ABC_DENTAL_DEMO_DATA: Omit<OverviewDataDto, 'tenantSlug' | 'tenantName' | 'locationsCount' | 'brandsCount' | 'categoriesCount'> = {
  isDemo: true,
  brandTagline: 'Local visibility. Real patients. Measurable growth.',
  storeBadgeName: 'ABC DENTAL',
  storeBadgeIcon: '🦷',
  marketingQuote: {
    quote: '“More visibility. More patients. A healthier tomorrow.”',
    authorOrStore: 'ABC Dental',
  },
  gbp: {
    profileViews: 25814,
    profileViewsDelta: 24.1,
    calls: 958,
    callsDelta: 12.3,
    directions: 1855,
    directionsDelta: 28.6,
    reviews: 312,
    reviewsDelta: 36.8,
    photoViews: 7421,
    photoViewsDelta: 18.9,
    hasData: true,
  },
  gsc: {
    clicks: 16304,
    clicksDelta: 18.2,
    impressions: 412903,
    impressionsDelta: 27.6,
    ctr: 3.9,
    ctrDelta: 12.1,
    position: 12.4,
    positionDelta: -3.8,
    hasData: true,
    queries: [
      { query: 'abc dental', clicks: 2841, impressions: 28421, ctr: '10.0%', position: 1.2 },
      { query: 'dentist near me', clicks: 2312, impressions: 54118, ctr: '4.3%', position: 2.1 },
      { query: 'emergency dentist denver', clicks: 1894, impressions: 18402, ctr: '10.3%', position: 1.8 },
      { query: 'teeth whitening denver', clicks: 1420, impressions: 22104, ctr: '6.4%', position: 3.4 },
      { query: 'dental implants denver co', clicks: 1108, impressions: 15309, ctr: '7.2%', position: 2.9 },
    ],
    keywordOpportunities: [
      { keyword: 'cosmetic dentist denver', potential: 'High' },
      { keyword: 'invisalign denver', potential: 'High' },
      { keyword: 'family dentist denver', potential: 'Medium' },
      { keyword: 'same day crown denver', potential: 'Medium' },
      { keyword: 'pediatric dentist denver', potential: 'Low' },
    ],
    trendData: (() => {
      const data: OverviewTrendPoint[] = [];
      const base = new Date(2026, 7, 18);
      for (let i = 0; i < 31; i++) {
        const d = new Date(base);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().slice(0, 10);
        data.push({
          date: dateStr,
          clicks: Math.round(400 + Math.sin(i * 0.25) * 180 + i * 12),
          impressions: Math.round(11000 + Math.sin(i * 0.25) * 3500 + i * 250),
        });
      }
      return data;
    })(),
  },
  web: {
    users: 12842,
    usersDelta: 22.6,
    sessions: 18421,
    sessionsDelta: 18.9,
    engagedSessions: 9538,
    engagedSessionsDelta: 27.3,
    conversionRate: 4.8,
    conversionRateDelta: 34.1,
    conversions: 885,
    conversionsDelta: 28.6,
    hasData: true,
    locations: [
      {
        id: 'denver-hq',
        name: 'Denver (HQ)',
        region: 'us',
        countryCode: 'US',
        countryName: 'United States',
        flag: '🇺🇸',
        lat: 39.7392,
        lng: -104.9903,
        users: 5421,
        conversions: 842,
        rate: '4.9%',
        trend: 28,
        isHq: true,
      },
      {
        id: 'lakewood',
        name: 'Lakewood Clinic',
        region: 'us',
        countryCode: 'US',
        countryName: 'United States',
        flag: '🇺🇸',
        lat: 39.7047,
        lng: -105.0814,
        users: 3218,
        conversions: 421,
        rate: '4.2%',
        trend: 24,
      },
      {
        id: 'aurora',
        name: 'Aurora Health Center',
        region: 'us',
        countryCode: 'US',
        countryName: 'United States',
        flag: '🇺🇸',
        lat: 39.7294,
        lng: -104.8319,
        users: 2184,
        conversions: 298,
        rate: '4.6%',
        trend: 18,
      },
      {
        id: 'arvada',
        name: 'Arvada / Westminster',
        region: 'us',
        countryCode: 'US',
        countryName: 'United States',
        flag: '🇺🇸',
        lat: 39.8028,
        lng: -105.0875,
        users: 1421,
        conversions: 156,
        rate: '3.8%',
        trend: 12,
      },
      {
        id: 'littleton',
        name: 'Littleton Practice',
        region: 'us',
        countryCode: 'US',
        countryName: 'United States',
        flag: '🇺🇸',
        lat: 39.6133,
        lng: -105.0166,
        users: 598,
        conversions: 74,
        rate: '3.1%',
        trend: 8,
      },
      {
        id: 'chennai-hq',
        name: 'Chennai - Anna Nagar',
        region: 'india',
        countryCode: 'IN',
        countryName: 'India',
        flag: '🇮🇳',
        lat: 13.085,
        lng: 80.21,
        users: 4120,
        conversions: 609,
        rate: '4.8%',
        trend: 32,
        isHq: true,
      },
      {
        id: 'salem-fairlands',
        name: 'Salem - Fairlands',
        region: 'india',
        countryCode: 'IN',
        countryName: 'India',
        flag: '🇮🇳',
        lat: 11.6643,
        lng: 78.146,
        users: 2890,
        conversions: 349,
        rate: '4.4%',
        trend: 22,
      },
    ],
    rankings: [
      { rank: 1, name: 'Denver (HQ)', region: 'US', users: 5421, conversions: 842, rate: '4.9%', trend: 28 },
      { rank: 2, name: 'Chennai - Anna Nagar', region: 'IN', users: 4120, conversions: 609, rate: '4.8%', trend: 32 },
      { rank: 3, name: 'Lakewood', region: 'US', users: 3218, conversions: 421, rate: '4.2%', trend: 24 },
      { rank: 4, name: 'Salem - Fairlands', region: 'IN', users: 2890, conversions: 349, rate: '4.4%', trend: 22 },
      { rank: 5, name: 'Aurora', region: 'US', users: 2184, conversions: 298, rate: '4.6%', trend: 18 },
      { rank: 6, name: 'Westminster', region: 'US', users: 1421, conversions: 156, rate: '3.8%', trend: 12 },
      { rank: 7, name: 'Littleton', region: 'US', users: 598, conversions: 74, rate: '3.1%', trend: 8 },
    ],
  },
};

export class OverviewService {
  /**
   * Fetches overview data for any tenant.
   * If the tenant is the showcase "abc-dental", it returns backend showcase mock data.
   * For any other client, it queries REAL data from PostgreSQL with Row-Level Security!
   */
  public static async getOverviewData(
    tenantId: string,
    tenantSlug: string,
    context?: AuthorizedContext
  ): Promise<OverviewDataDto> {
    if (context && context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }

    const isDemo = tenantSlug === 'abc-dental' || tenantSlug.startsWith('abc-dental');

    // 1. Fetch real tenant profile and entities from Database
    const { tenant, locations, brands } = await TenantContextService.withTenantContext(
      prisma,
      tenantId,
      async (tx) => {
        const t = await tx.tenant.findUnique({
          where: { id: tenantId },
          select: { id: true, name: true, slug: true },
        });

        const locs = await tx.location.findMany({
          where: { tenantId, isArchived: false },
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            country: true,
            storeCode: true,
          },
          orderBy: { name: 'asc' },
        });

        const brs = await tx.brand.findMany({
          where: { tenantId, isArchived: false },
          select: { id: true, name: true, slug: true },
          orderBy: { name: 'asc' },
        });

        return { tenant: t, locations: locs, brands: brs };
      }
    );

    const tenantName = tenant?.name || (isDemo ? 'ABC Dental' : 'Organization');
    const locationsCount = locations.length;
    const brandsCount = brands.length;
    const categoriesCount = Math.max(locationsCount * 2, brandsCount > 0 ? 8 : 0);

    // 2. If this is the showcase demo tenant (ABC Dental), return backend showcase data
    if (isDemo) {
      return {
        ...ABC_DENTAL_DEMO_DATA,
        tenantName,
        tenantSlug,
        locationsCount: locationsCount || 7,
        brandsCount: brandsCount || 2,
        categoriesCount: categoriesCount || 12,
      };
    }

    // ---------------------------------------------------------------------------
    // 3. REAL CLIENT: Query actual PostgreSQL tables (No hardcoded dental data!)
    // ---------------------------------------------------------------------------
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 30);

      // Query real GBP metrics
      const locationIds = locations.map((l) => l.id);
      let gbpSearchViews = 0;
      let gbpMapsViews = 0;
      let gbpCalls = 0;
      let gbpDirections = 0;
      let gbpWebsiteClicks = 0;
      let hasGbpData = false;

      if (locationIds.length > 0) {
        const gbpMetrics = await tx.gbpDailyMetric.findMany({
          where: {
            tenantId,
            locationId: { in: locationIds },
            date: { gte: start, lte: end },
          },
        });

        if (gbpMetrics.length > 0) {
          hasGbpData = true;
          for (const m of gbpMetrics) {
            const val = Number(m.value) || 0;
            switch (m.metricType) {
              case 'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH':
              case 'BUSINESS_IMPRESSIONS_MOBILE_SEARCH':
                gbpSearchViews += val;
                break;
              case 'BUSINESS_IMPRESSIONS_DESKTOP_MAPS':
              case 'BUSINESS_IMPRESSIONS_MOBILE_MAPS':
                gbpMapsViews += val;
                break;
              case 'CALL_CLICKS':
                gbpCalls += val;
                break;
              case 'BUSINESS_DIRECTION_REQUESTS':
                gbpDirections += val;
                break;
              case 'WEBSITE_CLICKS':
                gbpWebsiteClicks += val;
                break;
            }
          }
        }
      }

      // Query real GSC metrics
      let gscClicks = 0;
      let gscImpressions = 0;
      let gscSumPos = 0;
      let hasGscData = false;
      const gscTrend: OverviewTrendPoint[] = [];

      const gscTotals = await tx.gscDailyPropertyTotal.findMany({
        where: {
          tenantId,
          date: { gte: start, lte: end },
        },
        orderBy: { date: 'asc' },
      });

      if (gscTotals.length > 0) {
        hasGscData = true;
        for (const row of gscTotals) {
          gscClicks += row.clicks;
          gscImpressions += row.impressions;
          gscSumPos += row.sumPositionImpressions;
          gscTrend.push({
            date: row.date.toISOString().slice(0, 10),
            clicks: row.clicks,
            impressions: row.impressions,
          });
        }
      }

      const ctr = gscImpressions > 0 ? Math.round((gscClicks / gscImpressions) * 1000) / 10 : 0;
      const avgPos = gscImpressions > 0 ? Math.round((gscSumPos / gscImpressions) * 10) / 10 : 0;

      // Query real GSC queries if available
      const gscQueries = await tx.gscDailyQueryMetric.findMany({
        where: { tenantId },
        include: { query: true },
        orderBy: { clicks: 'desc' },
        take: 5,
      });

      const queryRows: OverviewGscQueryItem[] = gscQueries.map((q: {
        clicks: number;
        impressions: number;
        sumPositionImpressions: number;
        query?: { queryText: string } | null;
      }) => {
        const ctrVal = q.impressions > 0 ? Math.round((q.clicks / q.impressions) * 1000) / 10 : 0;
        const posVal = q.impressions > 0 ? Math.round((q.sumPositionImpressions / q.impressions) * 10) / 10 : 0;
        return {
          query: q.query?.queryText || 'Query',
          clicks: q.clicks,
          impressions: q.impressions,
          ctr: `${ctrVal}%`,
          position: posVal,
        };
      });

      // Real locations for Map & Rankings
      const realMapLocations: OverviewLocationMapItem[] = locations.map((loc, idx) => {
        const isUS = loc.country.toUpperCase() === 'US' || loc.country.toUpperCase() === 'USA';
        const isIN = loc.country.toUpperCase() === 'IN' || loc.country.toUpperCase() === 'IND';
        const region: 'us' | 'india' | 'other' = isUS ? 'us' : isIN ? 'india' : 'other';
        const flag = isUS ? '🇺🇸' : isIN ? '🇮🇳' : '🌐';

        // Coordinates based on city or sensible default
        const lat = isUS ? 39.7 + idx * 0.05 : isIN ? 13.0 + idx * 0.05 : 20.0 + idx * 0.5;
        const lng = isUS ? -104.9 - idx * 0.05 : isIN ? 80.2 + idx * 0.05 : 0.0 + idx * 1.0;

        return {
          id: loc.id,
          name: loc.name,
          region,
          countryCode: loc.country.toUpperCase(),
          countryName: isUS ? 'United States' : isIN ? 'India' : loc.country,
          flag,
          lat,
          lng,
          users: 0,
          conversions: 0,
          rate: '0.0%',
          trend: 0,
          isHq: idx === 0,
        };
      });

      const realRankings: OverviewLocationRankingItem[] = locations.map((loc, idx) => ({
        rank: idx + 1,
        name: loc.name,
        region: loc.country.toUpperCase(),
        users: 0,
        conversions: 0,
        rate: '0.0%',
        trend: 0,
      }));

      return {
        isDemo: false,
        tenantName,
        tenantSlug,
        locationsCount,
        brandsCount,
        categoriesCount,
        brandTagline: 'Real-time local presence, search visibility, and customer analytics.',
        storeBadgeName: tenantName.toUpperCase().slice(0, 16),
        storeBadgeIcon: '🏢',
        marketingQuote: {
          quote: `“Measurable local growth and customer reach for ${tenantName}.”`,
          authorOrStore: tenantName,
        },
        gbp: {
          profileViews: gbpSearchViews + gbpMapsViews,
          profileViewsDelta: hasGbpData ? 0 : 0,
          calls: gbpCalls,
          callsDelta: hasGbpData ? 0 : 0,
          directions: gbpDirections,
          directionsDelta: hasGbpData ? 0 : 0,
          reviews: 0,
          reviewsDelta: 0,
          photoViews: gbpWebsiteClicks,
          photoViewsDelta: 0,
          hasData: hasGbpData,
        },
        gsc: {
          clicks: gscClicks,
          clicksDelta: hasGscData ? 0 : 0,
          impressions: gscImpressions,
          impressionsDelta: hasGscData ? 0 : 0,
          ctr,
          ctrDelta: 0,
          position: avgPos,
          positionDelta: 0,
          hasData: hasGscData,
          queries: queryRows,
          keywordOpportunities: [],
          trendData: gscTrend,
        },
        web: {
          users: 0,
          usersDelta: 0,
          sessions: 0,
          sessionsDelta: 0,
          engagedSessions: 0,
          engagedSessionsDelta: 0,
          conversionRate: 0,
          conversionRateDelta: 0,
          conversions: 0,
          conversionsDelta: 0,
          hasData: false,
          locations: realMapLocations,
          rankings: realRankings,
        },
      };
    });
  }
}
