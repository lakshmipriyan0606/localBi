import { describe, it, expect } from 'vitest';
import { Ga4AnalyticsService } from '@/modules/analytics/ga4-service';
import { getNavGroups } from '@/components/layout/sidebar-nav-config';

describe('GA4 Analytics Service & Real Telemetry Pipeline', () => {
  const tenantSlug = 'lakshmi-food';

  it('loads verified real GA4 property data for tenant with accurate KPIs', async () => {
    const data = await Ga4AnalyticsService.getTenantGa4Data(tenantSlug);

    expect(data).toBeDefined();
    expect(data.propertyName).toBe('Lakshmi Priyan - Portfolio');
    expect(data.propertyId).toBe('properties/460392819');
    expect(data.activeUsers).toBe(14);
    expect(data.newUsers).toBe(15);
    expect(data.eventCount).toBe(127);
    expect(data.sessions).toBe(22);
    expect(data.avgEngagementTimeSeconds).toBe(6);
    expect(data.bounceRate).toBe(83.3);
    expect(data.engagementRate).toBe(16.7);
  });

  it('provides real first user primary channel group breakdown matching screenshots', async () => {
    const data = await Ga4AnalyticsService.getTenantGa4Data(tenantSlug);

    expect(data.channels).toHaveLength(3);

    const direct = data.channels.find((c) => c.channel === 'Direct');
    expect(direct).toBeDefined();
    expect(direct?.newUsers).toBe(11);
    expect(direct?.sessions).toBe(16);
    expect(direct?.percentage).toBe(73.3);

    const organicSearch = data.channels.find((c) => c.channel === 'Organic Search');
    expect(organicSearch).toBeDefined();
    expect(organicSearch?.newUsers).toBe(3);
    expect(organicSearch?.sessions).toBe(4);
    expect(organicSearch?.percentage).toBe(20.0);

    const organicSocial = data.channels.find((c) => c.channel === 'Organic Social');
    expect(organicSocial).toBeDefined();
    expect(organicSocial?.newUsers).toBe(1);
    expect(organicSocial?.sessions).toBe(2);
    expect(organicSocial?.percentage).toBe(6.7);
  });

  it('provides real top pages data matching user portfolio screen', async () => {
    const data = await Ga4AnalyticsService.getTenantGa4Data(tenantSlug);

    expect(data.pages.length).toBeGreaterThanOrEqual(1);
    const topPage = data.pages[0];
    expect(topPage?.pageTitle).toBe('Lakshmi Priyan - Portfolio');
    expect(topPage?.views).toBe(34);
    expect(topPage?.activeUsers).toBe(14);
    expect(topPage?.eventCount).toBe(127);
    expect(topPage?.bounceRate).toBe(83.3);
    expect(topPage?.avgEngagementTimeSeconds).toBe(6);
  });

  it('provides real events table matching Screenshot 4 with exact 6 events and 127 total', async () => {
    const data = await Ga4AnalyticsService.getTenantGa4Data(tenantSlug);

    expect(data.events).toHaveLength(6);
    const totalEvents = data.events.reduce((acc, e) => acc + e.eventCount, 0);
    expect(totalEvents).toBe(127);

    const pageView = data.events.find((e) => e.eventName === 'page_view');
    expect(pageView).toBeDefined();
    expect(pageView?.eventCount).toBe(34);
    expect(pageView?.totalUsers).toBe(14);
    expect(pageView?.eventCountPerActiveUser).toBe(2.43);

    const scroll = data.events.find((e) => e.eventName === 'scroll');
    expect(scroll).toBeDefined();
    expect(scroll?.eventCount).toBe(32);
    expect(scroll?.totalUsers).toBe(14);
    expect(scroll?.eventCountPerActiveUser).toBe(2.29);

    const sessionStart = data.events.find((e) => e.eventName === 'session_start');
    expect(sessionStart).toBeDefined();
    expect(sessionStart?.eventCount).toBe(31);
    expect(sessionStart?.totalUsers).toBe(14);
    expect(sessionStart?.eventCountPerActiveUser).toBe(2.21);

    const firstVisit = data.events.find((e) => e.eventName === 'first_visit');
    expect(firstVisit).toBeDefined();
    expect(firstVisit?.eventCount).toBe(15);
    expect(firstVisit?.totalUsers).toBe(14);
    expect(firstVisit?.eventCountPerActiveUser).toBe(1.07);

    const userEngagement = data.events.find((e) => e.eventName === 'user_engagement');
    expect(userEngagement).toBeDefined();
    expect(userEngagement?.eventCount).toBe(14);
    expect(userEngagement?.totalUsers).toBe(6);
    expect(userEngagement?.eventCountPerActiveUser).toBe(2.33);

    const fileDownload = data.events.find((e) => e.eventName === 'file_download');
    expect(fileDownload).toBeDefined();
    expect(fileDownload?.eventCount).toBe(1);
    expect(fileDownload?.totalUsers).toBe(1);
    expect(fileDownload?.eventCountPerActiveUser).toBe(1.00);
  });

  it('provides real page screens matching Screenshot 5 with / path and 34 views', async () => {
    const data = await Ga4AnalyticsService.getTenantGa4Data(tenantSlug);

    expect(data.pageScreens).toBeDefined();
    expect(data.pageScreens.length).toBeGreaterThanOrEqual(1);

    const home = data.pageScreens[0];
    expect(home?.pagePath).toBe('/');
    expect(home?.pageTitle).toBe('Lakshmi Priyan - Portfolio');
    expect(home?.views).toBe(34);
    expect(home?.activeUsers).toBe(14);
    expect(home?.viewsPerActiveUser).toBe(2.43);
    expect(home?.avgEngagementTimeSeconds).toBe(6);
    expect(home?.eventCount).toBe(127);
    expect(home?.keyEvents).toBe(0.00);
  });

  it('contains daily trend points with peer median food & drink benchmark', async () => {
    const data = await Ga4AnalyticsService.getTenantGa4Data(tenantSlug);

    expect(data.trend.length).toBeGreaterThan(10);

    // Peak active users on Sep 17
    const sep17 = data.trend.find((t) => t.date === '2026-09-17');
    expect(sep17).toBeDefined();
    expect(sep17?.activeUsers).toBe(3);
    expect(sep17?.eventCount).toBe(28);
    expect(sep17?.peerBenchmark).toBe(3.8);

    // Flat baseline before Sep 16
    const sep05 = data.trend.find((t) => t.date === '2026-09-05');
    expect(sep05).toBeDefined();
    expect(sep05?.activeUsers).toBe(0);
    expect(sep05?.eventCount).toBe(0);
  });

  it('contains user engagement and retention curves with Sep 18 peak', async () => {
    const data = await Ga4AnalyticsService.getTenantGa4Data(tenantSlug);

    expect(data.retention.length).toBeGreaterThan(5);

    const sep18 = data.retention.find((r) => r.date === '2026-09-18');
    expect(sep18).toBeDefined();
    expect(sep18?.retentionRate).toBe(70.0);
    expect(sep18?.engagementTimeSeconds).toBe(12);

    const sep19 = data.retention.find((r) => r.date === '2026-09-19');
    expect(sep19).toBeDefined();
    expect(sep19?.retentionRate).toBe(60.0);
    expect(sep19?.benchmarkRetentionRate).toBe(52.0);
    expect(sep19?.engagementTimeSeconds).toBe(10);
    expect(sep19?.benchmarkEngagementTimeSeconds).toBe(6);
  });

  it('provides real hardware platform breakdown matching desktop 69% and mobile 31%', async () => {
    const data = await Ga4AnalyticsService.getTenantGa4Data(tenantSlug);

    expect(data.devices).toBeDefined();
    const desktop = data.devices.find((d) => d.device === 'Desktop');
    expect(desktop?.percentage).toBe(69);

    const mobile = data.devices.find((d) => d.device === 'Mobile');
    expect(mobile?.percentage).toBe(31);
  });

  it('verifies sidebar navigation includes all 4 GA4 reporting sections', () => {
    const groups = getNavGroups(tenantSlug);
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
    expect(hrefs).toContain(`/client/${tenantSlug}/reports/ga4`);
    expect(hrefs).toContain(`/client/${tenantSlug}/reports/ga4/engagement`);
    expect(hrefs).toContain(`/client/${tenantSlug}/reports/ga4/pages`);
    expect(hrefs).toContain(`/client/${tenantSlug}/reports/ga4/events`);

    const websiteAnalyticsItem = ga4Group?.items.find((i) => i.label === 'Website analytics');
    expect(websiteAnalyticsItem?.exact).toBe(true);
  });
});
