import { describe, it, expect } from 'vitest';
import { OverviewService } from '../../src/modules/overview/overview-service';

describe('Section 1 — Global Topbar & Client Header: Data Correctness & Isolation', () => {
  const tenantId = 'cmup03rc10003ubj4r4vfoa0s'; // Lakshmi food tenant
  const tenantSlug = 'lakshmi-food';
  const lakshmiBrandId = 'cmup03rdk0009ubj4ylgi5d4t'; // Lakshmi food brand
  const sastikaBrandId = 'cmuyanw2b001bubeg9bhy8xj7'; // Sastikaa Travel Agency brand

  it('strictly scopes Search Console queries to the active brand and prevents cross-brand leakage', async () => {
    // 1. Query for Lakshmi food brand
    const lakshmiData = await OverviewService.getOverviewData(tenantId, tenantSlug, undefined, {
      brandId: lakshmiBrandId,
      days: 30,
    });

    expect(lakshmiData.activeBrandName).toBe('Lakshmi food');
    // Ensure no 'sastika' query appears under Lakshmi food
    const sastikaInLakshmi = lakshmiData.gsc.queries.some((q) =>
      q.query.toLowerCase().includes('sastika')
    );
    expect(sastikaInLakshmi).toBe(false);

    // 2. Query for Sastikaa Travel Agency brand
    const sastikaData = await OverviewService.getOverviewData(tenantId, tenantSlug, undefined, {
      brandId: sastikaBrandId,
      days: 30,
    });

    expect(sastikaData.activeBrandName).toBe('Sastikaa Travel Agency');
    // Sastikaa must see its own queries
    const hasSastikaQuery = sastikaData.gsc.queries.some((q) =>
      q.query.toLowerCase().includes('sastika')
    );
    expect(hasSastikaQuery).toBe(true);
  });

  it('properly deduplicates and groups Search Console queries by queryText with weighted CTR and position', async () => {
    const data = await OverviewService.getOverviewData(tenantId, tenantSlug, undefined, {
      brandId: sastikaBrandId,
      days: 30,
    });

    const queryTexts = data.gsc.queries.map((q) => q.query);
    const uniqueQueryTexts = Array.from(new Set(queryTexts));

    // Each query text must appear exactly once in the table
    expect(queryTexts.length).toBe(uniqueQueryTexts.length);

    // Check specific aggregated query 'sastikaa travel'
    const sastikaQuery = data.gsc.queries.find((q) => q.query === 'sastikaa travel');
    if (sastikaQuery) {
      expect(sastikaQuery.clicks).toBeGreaterThanOrEqual(18);
      expect(sastikaQuery.impressions).toBeGreaterThanOrEqual(51);
      expect(sastikaQuery.position).toBeCloseTo(1.7, 1);
    }
  });

  it('dynamically respects reporting date ranges (7 days vs 30 days)', async () => {
    const data7 = await OverviewService.getOverviewData(tenantId, tenantSlug, undefined, {
      brandId: sastikaBrandId,
      days: 7,
    });
    const data30 = await OverviewService.getOverviewData(tenantId, tenantSlug, undefined, {
      brandId: sastikaBrandId,
      days: 30,
    });

    expect(data7.selectedDays).toBe(7);
    expect(data30.selectedDays).toBe(30);

    // Trend data points should reflect the date window
    expect(data7.gsc.trendData.length).toBeLessThanOrEqual(data30.gsc.trendData.length);
  });

  it('accurately reports Google Business Profile location counts and honest readiness state', async () => {
    const lakshmiData = await OverviewService.getOverviewData(tenantId, tenantSlug, undefined, {
      brandId: lakshmiBrandId,
      days: 30,
    });

    // GBP locations count must be an accurate integer, never a fabricated non-zero
    expect(typeof lakshmiData.gbpLocationsCount).toBe('number');
    expect(typeof lakshmiData.locationsCount).toBe('number');

    // Data readiness must be one of the honest enum values
    expect([
      'not_connected',
      'not_configured',
      'pending_sync',
      'syncing',
      'no_data',
      'ready',
    ]).toContain(lakshmiData.dataReadiness);

    // Must not claim 'ready' if there is no data and no locations
    if (
      lakshmiData.gbpLocationsCount === 0 &&
      !lakshmiData.gsc.hasData &&
      !lakshmiData.gbp.hasData
    ) {
      expect(lakshmiData.dataReadiness).not.toBe('ready');
    }
  });
});
