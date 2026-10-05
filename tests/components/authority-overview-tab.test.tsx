// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { AuthorityOverviewTab } from '@/modules/seo-authority/components/authority-overview-tab';

describe('AuthorityOverviewTab Component', () => {
  it('renders overview tab and navigation buttons without errors', () => {
    const mockOverview: any = {
      providerState: 'ACTIVE',
      providerMessage: null,
      domain: 'sastikaatravel.com',
      freshness: { lastAuditedAt: new Date().toISOString() },
      backlinks: {
        totalBacklinks: 120,
        referringDomains: 45,
        newLinksLast30Days: 8,
        lostLinksLast30Days: 2,
        activeOpportunities: 14,
      },
      citations: {
        totalManaged: 35,
        perfectNapProfiles: 30,
        confirmedMissingDirectories: 5,
        criticalNapMismatches: 2,
        overallNapAccuracyScore: 92,
      },
      topReferringDomains: [
        {
          id: '1',
          domain: 'lonelyplanet.com',
          providerAuthorityMetric: 88,
          providerAuthorityMetricName: 'DR',
          activeLinksCount: 4,
        },
      ],
      topCompetitorGaps: [
        {
          domain: 'tripadvisor.in',
          competitorCount: 3,
          relevance: { overall: 'HIGH' },
        },
      ],
    };

    const handleTabChange = vi.fn();
    const handleSync = vi.fn();

    render(
      <AuthorityOverviewTab
        overview={mockOverview}
        onTabChange={handleTabChange}
        onSync={handleSync}
        isSyncing={false}
      />
    );

    expect(screen.getByText('Top Referring Domains')).toBeDefined();
    expect(screen.getByText('lonelyplanet.com')).toBeDefined();
    expect(screen.getByText('Competitor Backlink Gaps')).toBeDefined();
    expect(screen.getByText('tripadvisor.in')).toBeDefined();
  });
});
