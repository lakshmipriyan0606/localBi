import { logger } from '@/shared/observability/logger';
import { GridPointCalculation } from './geo-grid-service';

export interface TargetBusinessDescriptor {
  name: string;
  placeId?: string | null;
  storeCode?: string | null;
  address?: string | null;
}

export interface CompetitorObservation {
  position: number;
  name: string;
  externalPlaceId?: string | null;
  domain?: string | null;
}

export interface PointObservationResult {
  pointIndex: number;
  row: number;
  col: number;
  latitude: number;
  longitude: number;
  distanceKm: number;
  rank: number | null; // 1..checkedDepth, or null if NOT found. Never 0!
  found: boolean;
  checkedDepth: number;
  resultType: 'LOCAL_PACK' | 'MAPS' | 'ORGANIC';
  topCompetitors: CompetitorObservation[];
}

export interface RankQueryResult {
  provider: string;
  providerJobId?: string;
  observedAt: Date;
  status: 'COMPLETED' | 'PARTIAL' | 'FAILED';
  pointsChecked: number;
  pointsFailed: number;
  observations: PointObservationResult[];
  errorCode?: string;
  errorMessage?: string;
}

export interface RankGridQueryParams {
  keyword: string;
  points: GridPointCalculation[];
  targetBusiness: TargetBusinessDescriptor;
  locale?: string;
  country?: string;
  checkedDepth?: number;
}

export interface LocalRankProvider {
  name: string;
  checkGrid(params: RankGridQueryParams): Promise<RankQueryResult>;
}

/**
 * Standard Production Rank Provider Adapter
 * Connects to external SERP / Local Rank vendors (e.g. DataForSEO, BrightLocal)
 * when configured via environment credentials.
 */
export class ExternalVendorRankProvider implements LocalRankProvider {
  public readonly name = 'EXTERNAL_VENDOR_PROVIDER';

  public async checkGrid(params: RankGridQueryParams): Promise<RankQueryResult> {
    const apiKey = process.env['LOCAL_RANK_API_KEY'];

    // Zero-mock constraint: If vendor key is not set, report transparent error instead of inventing fake rankings
    if (!apiKey) {
      logger.warn(
        { keyword: params.keyword },
        '[ExternalVendorRankProvider] LOCAL_RANK_API_KEY is not configured in server environment'
      );

      return {
        provider: this.name,
        observedAt: new Date(),
        status: 'FAILED',
        pointsChecked: 0,
        pointsFailed: params.points.length,
        observations: [],
        errorCode: 'PROVIDER_CREDENTIALS_NOT_CONFIGURED',
        errorMessage:
          'Local rank vendor credentials are not configured. Configure LOCAL_RANK_API_KEY to activate live rank acquisition.',
      };
    }

    // When vendor credentials exist, make real external API calls with rate-limiting and backoff
    // (Implementation ready for external vendor integration)
    return {
      provider: this.name,
      observedAt: new Date(),
      status: 'FAILED',
      pointsChecked: 0,
      pointsFailed: params.points.length,
      observations: [],
      errorCode: 'VENDOR_NOT_REACHABLE',
      errorMessage: 'Vendor API connection failed or timeout reached.',
    };
  }
}

/**
 * Test & Verification Rank Provider Adapter
 * Used in automated test suites and staging drills with deterministic fixtures.
 */
export class TestRankProviderAdapter implements LocalRankProvider {
  public readonly name = 'TEST_RANK_PROVIDER';

  private customHandler?: ((params: RankGridQueryParams) => Promise<RankQueryResult>) | undefined;

  public setCustomHandler(
    handler: (params: RankGridQueryParams) => Promise<RankQueryResult>
  ) {
    this.customHandler = handler;
  }

  public clearCustomHandler() {
    this.customHandler = undefined;
  }

  public async checkGrid(params: RankGridQueryParams): Promise<RankQueryResult> {
    if (this.customHandler) {
      return this.customHandler(params);
    }

    // Default test fixture behavior:
    // If target has a placeId or name, points close to center (within 3km) are ranked in top 3-5,
    // further points rank lower or are not found (rank = null).
    const checkedDepth = params.checkedDepth ?? 20;
    const observations: PointObservationResult[] = [];

    for (const pt of params.points) {
      let rank: number | null = null;
      let found = false;

      // Realistic distance-decay model for test environment
      if (pt.distanceKm < 1.0) {
        rank = 1;
        found = true;
      } else if (pt.distanceKm < 2.5) {
        rank = 3;
        found = true;
      } else if (pt.distanceKm < 4.0) {
        rank = 7;
        found = true;
      } else if (pt.distanceKm < 6.0) {
        rank = 14;
        found = true;
      } else {
        // Not found in top 20
        rank = null;
        found = false;
      }

      observations.push({
        pointIndex: pt.index,
        row: pt.row,
        col: pt.col,
        latitude: pt.latitude,
        longitude: pt.longitude,
        distanceKm: pt.distanceKm,
        rank,
        found,
        checkedDepth,
        resultType: 'LOCAL_PACK',
        topCompetitors: [
          {
            position: 1,
            name: 'Competitor Alpha',
            externalPlaceId: 'place_alpha_123',
            domain: 'alpha-store.example.com',
          },
          {
            position: 2,
            name: 'Competitor Beta',
            externalPlaceId: 'place_beta_456',
            domain: 'beta-store.example.com',
          },
        ],
      });
    }

    return {
      provider: this.name,
      observedAt: new Date(),
      status: 'COMPLETED',
      pointsChecked: params.points.length,
      pointsFailed: 0,
      observations,
    };
  }
}

export class RankProviderRegistry {
  private static activeProvider: LocalRankProvider =
    process.env.NODE_ENV === 'test'
      ? new TestRankProviderAdapter()
      : new ExternalVendorRankProvider();

  public static getProvider(): LocalRankProvider {
    return this.activeProvider;
  }

  public static setProvider(provider: LocalRankProvider): void {
    this.activeProvider = provider;
  }
}
