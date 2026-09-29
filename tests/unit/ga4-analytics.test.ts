import { describe, it, expect } from 'vitest';
import { Ga4AnalyticsService } from '@/modules/analytics/ga4-service';
import { getNavGroups } from '@/components/layout/sidebar-nav-config';

describe('GA4 Analytics Service & Real Telemetry Pipeline', () => {
  const tenantSlug = 'unconfigured-test-tenant';

  it('returns clean unconfigured state with zero mock data for tenant without GA4 resource', async () => {
    const data = await Ga4AnalyticsService.getTenantGa4Data(tenantSlug);

    expect(data).toBeDefined();
    expect(data.isConfigured).toBe(false);
    expect(data.propertyName).toBe('Not Connected');
    expect(data.propertyId).toBe('');
    expect(data.activeUsers).toBe(0);
    expect(data.newUsers).toBe(0);
    expect(data.eventCount).toBe(0);
    expect(data.sessions).toBe(0);
    expect(data.avgEngagementTimeSeconds).toBe(0);
    expect(data.bounceRate).toBe(0);
    expect(data.engagementRate).toBe(0);
    expect(data.channels).toEqual([]);
    expect(data.devices).toEqual([]);
    expect(data.pages).toEqual([]);
    expect(data.events).toEqual([]);
    expect(data.pageScreens).toEqual([]);
    expect(data.trend).toEqual([]);
    expect(data.retention).toEqual([]);
    expect(data.eventTrend).toEqual([]);
  });

  it('provides getEmptyGa4Data factory returning zeroed telemetry without synthetic mocks', () => {
    const unconfigured = Ga4AnalyticsService.getEmptyGa4Data('test-tenant');

    expect(unconfigured.isConfigured).toBe(false);
    expect(unconfigured.propertyName).toBe('Not Connected');
    expect(unconfigured.propertyId).toBe('');
    expect(unconfigured.activeUsers).toBe(0);
    expect(unconfigured.newUsers).toBe(0);
    expect(unconfigured.sessions).toBe(0);
    expect(unconfigured.channels).toHaveLength(0);
    expect(unconfigured.pages).toHaveLength(0);
    expect(unconfigured.events).toHaveLength(0);
    expect(unconfigured.trend).toHaveLength(0);

    const configured = Ga4AnalyticsService.getEmptyGa4Data('test-tenant', '12345', 'My Property');
    expect(configured.isConfigured).toBe(true);
    expect(configured.propertyName).toBe('My Property');
    expect(configured.propertyId).toBe('properties/12345');
  });

  it('verifies sidebar navigation includes all 4 GA4 reporting sections', () => {
    const groups = getNavGroups('test-tenant');
    const ga4Group = groups.find((g) => g.heading === 'Google Analytics');

    expect(ga4Group).toBeDefined();
    expect(ga4Group?.sourceBadge).toBe('GA4');
    expect(ga4Group?.items).toHaveLength(4);

    const labels = ga4Group?.items.map((i) => i.label);
    expect(labels).toContain('Website analytics');
    expect(labels).toContain('User engagement & retention');
    expect(labels).toContain('Pages and screens');
    expect(labels).toContain('Events');

    const hrefs = ga4Group?.items.map((i) => i.href);
    expect(hrefs).toContain(`/client/test-tenant/reports/ga4`);
    expect(hrefs).toContain(`/client/test-tenant/reports/ga4/engagement`);
    expect(hrefs).toContain(`/client/test-tenant/reports/ga4/pages`);
    expect(hrefs).toContain(`/client/test-tenant/reports/ga4/events`);

    const websiteAnalyticsItem = ga4Group?.items.find((i) => i.label === 'Website analytics');
    expect(websiteAnalyticsItem?.exact).toBe(true);
  });
});
