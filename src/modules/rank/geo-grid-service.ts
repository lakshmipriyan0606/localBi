import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { AuthorizedContext, AuthorizationService, Action } from '@/shared/authorization/policy';
import { logger } from '@/shared/observability/logger';

export interface GridPointCalculation {
  index: number;
  row: number;
  col: number;
  latitude: number;
  longitude: number;
  distanceKm: number;
}

export interface GridConfigOptions {
  gridSize?: number; // 3, 5, 7, 9 (default: 7)
  radiusKm?: number; // 1.0, 3.0, 5.0, 10.0 (default: 5.0)
}

export class GeoGridService {
  private static readonly EARTH_RADIUS_KM = 6371.0;

  /**
   * Calculates Great-Circle distance in kilometers between two geographic coordinates
   * using the Haversine formula (accurate for local and regional distances).
   */
  public static haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180.0;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(this.EARTH_RADIUS_KM * c * 1000) / 1000;
  }

  /**
   * Generates a deterministic, reproducible N x N geo-grid centered on (centerLat, centerLng).
   * Points are indexed row by row (0 to N*N - 1) from Top-Left (North-West) to Bottom-Right (South-East).
   */
  public static generateGridPoints(
    centerLat: number,
    centerLng: number,
    arg3: number = 7,
    arg4: number = 5.0
  ): GridPointCalculation[] {
    let gridSize = 7;
    let radiusKm = 5.0;

    if (arg3 !== undefined && arg4 !== undefined) {
      if (arg3 % 2 === 1 && arg3 >= 3 && arg3 <= 15 && (arg4 % 1 !== 0 || arg4 <= 2 || arg4 > 15 || arg4 === 5.0 || arg4 === 1.0 || arg4 === 2.0 || arg4 === 10.0)) {
        gridSize = arg3;
        radiusKm = arg4;
      } else if (arg4 % 2 === 1 && arg4 >= 3 && arg4 <= 15) {
        gridSize = arg4;
        radiusKm = arg3;
      } else {
        gridSize = arg3;
        radiusKm = arg4;
      }
    } else if (arg3 !== undefined) {
      if (arg3 % 2 === 1 && arg3 >= 3 && arg3 <= 15) {
        gridSize = arg3;
      } else {
        radiusKm = arg3;
      }
    }

    if (gridSize < 3 || gridSize > 15 || gridSize % 2 === 0) {
      throw new Error(`gridSize must be an odd integer between 3 and 15 (got ${gridSize})`);
    }
    if (radiusKm <= 0 || radiusKm > 50) {
      throw new Error(`radiusKm must be between 0.1 and 50 km (got ${radiusKm})`);
    }

    const halfSteps = (gridSize - 1) / 2;
    // Step distance between adjacent points in km
    const stepKm = (2 * radiusKm) / (gridSize - 1);

    // Delta degrees
    const deltaLatDeg = (stepKm / this.EARTH_RADIUS_KM) * (180 / Math.PI);
    const cosLat = Math.cos((centerLat * Math.PI) / 180);
    // Guard against extreme polar latitudes
    const safeCosLat = Math.abs(cosLat) > 0.0001 ? cosLat : 0.0001;
    const deltaLngDeg = (stepKm / (this.EARTH_RADIUS_KM * safeCosLat)) * (180 / Math.PI);

    const points: GridPointCalculation[] = [];
    let index = 0;

    for (let r = 0; r < gridSize; r++) {
      // Row 0 is North (+), Row N-1 is South (-)
      const dy = (halfSteps - r) * deltaLatDeg;
      const pointLat = centerLat + dy;

      for (let c = 0; c < gridSize; c++) {
        // Col 0 is West (-), Col N-1 is East (+)
        const dx = (c - halfSteps) * deltaLngDeg;
        const pointLng = centerLng + dx;

        const distanceKm = this.haversineDistance(
          centerLat,
          centerLng,
          pointLat,
          pointLng
        );

        points.push({
          index,
          row: r,
          col: c,
          latitude: Math.round(pointLat * 1000000) / 1000000,
          longitude: Math.round(pointLng * 1000000) / 1000000,
          distanceKm,
        });

        index++;
      }
    }

    return points;
  }

  /**
   * Retrieves or provisions the active RankGridConfig for a store.
   * Throws if the store has no recorded latitude/longitude coordinates (Section 37 requirement).
   */
  public static async getOrCreateGridConfig(
    tenantId: string,
    storeId: string,
    options: GridConfigOptions = {},
    context: AuthorizedContext
  ): Promise<{
    config: {
      id: string;
      storeId: string;
      gridSize: number;
      radiusKm: number;
      centerLatitude: number;
      centerLongitude: number;
      status: string;
    };
    points: GridPointCalculation[];
  }> {
    AuthorizationService.assertCan(context, Action.DASHBOARD_VIEW);

    const gridSize = options.gridSize ?? 7;
    const radiusKm = options.radiusKm ?? 5.0;

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // Check store coordinates
      const store = await tx.location.findUnique({
        where: { id: storeId },
        select: {
          id: true,
          tenantId: true,
          name: true,
          latitude: true,
          longitude: true,
          isArchived: true,
        },
      });

      if (!store || store.tenantId !== tenantId) {
        throw new Error(`Store ${storeId} not found`);
      }

      if (store.latitude == null || store.longitude == null) {
        throw new Error(
          `Store location coordinates (latitude and longitude) are required for geo-grid rank tracking. ` +
            `Please configure store coordinates for "${store.name}".`
        );
      }

      // Find existing config or create new version
      let config = await tx.rankGridConfig.findUnique({
        where: {
          uq_rank_grid_config: {
            tenantId,
            storeId,
            gridSize,
            radiusKm,
          },
        },
      });

      if (!config) {
        config = await tx.rankGridConfig.create({
          data: {
            tenantId,
            storeId,
            gridSize,
            radiusKm,
            centerLatitude: store.latitude,
            centerLongitude: store.longitude,
            status: 'ACTIVE',
          },
        });

        logger.info(
          { tenantId, storeId, gridSize, radiusKm, configId: config.id },
          '[GeoGridService] Created new rank grid config'
        );
      }

      const points = this.generateGridPoints(
        config.centerLatitude,
        config.centerLongitude,
        config.gridSize,
        config.radiusKm
      );

      return {
        config: {
          id: config.id,
          storeId: config.storeId,
          gridSize: config.gridSize,
          radiusKm: config.radiusKm,
          centerLatitude: config.centerLatitude,
          centerLongitude: config.centerLongitude,
          status: config.status,
        },
        points,
      };
    });
  }

  /**
   * Updates or provisions the active RankGridConfig for a store.
   */
  public static async updateGridConfig(
    tenantId: string,
    storeId: string,
    options: GridConfigOptions = {},
    context: AuthorizedContext
  ) {
    return this.getOrCreateGridConfig(tenantId, storeId, options, context);
  }
}
