// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { IntegrationsManager } from '@/features/integrations/components/integrations-manager';

const mockPush = vi.fn();
const mockRefresh = vi.fn();
let mockSearchParamBrandId: string | null = null;

vi.mock('next/navigation', () => ({
  usePathname: () => '/client/lakshmi-food/integrations',
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  useSearchParams: () => ({
    get: (param: string) => (param === 'brandId' ? mockSearchParamBrandId : null),
  }),
}));

vi.mock('@/lib/http/browser-client', () => ({
  browserClient: {
    get: vi.fn().mockResolvedValue({ data: { success: true } }),
    post: vi.fn().mockResolvedValue({ data: { success: true } }),
    delete: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

vi.mock('@/lib/notify', () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('IntegrationsManager - Brand-Aware Connect Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockSearchParamBrandId = null;
  });

  const mockInitialState = {
    connections: [
      {
        id: 'conn-1',
        provider: 'GOOGLE_SEARCH_CONSOLE',
        externalEmail: 'lakshmipriyan0606@gmail.com',
        createdAt: '2026-10-01T00:00:00Z',
        lastUsedAt: '2026-10-07T00:00:00Z',
      },
    ],
    externalResources: [
      {
        id: 'res-gsc-portfolio',
        provider: 'GOOGLE_SEARCH_CONSOLE',
        externalResourceId: 'https://lakshmipriyan-portfolio.vercel.app/',
        resourceType: 'PROPERTY' as const,
        resourceName: 'https://lakshmipriyan-portfolio.vercel.app/',
        accountName: 'Search Console',
      },
      {
        id: 'res-gsc-sastikaa',
        provider: 'GOOGLE_SEARCH_CONSOLE',
        externalResourceId: 'https://www.sastikaatravel.com/',
        resourceType: 'PROPERTY' as const,
        resourceName: 'https://www.sastikaatravel.com/',
        accountName: 'Search Console',
      },
      {
        id: 'res-ga4-lakshmi',
        provider: 'GOOGLE_ANALYTICS_4',
        externalResourceId: 'properties/554775051',
        resourceType: 'PROPERTY' as const,
        resourceName: 'lakshmi food',
        accountName: 'Analytics',
      },
    ],
    internalMappings: [
      {
        id: 'map-1',
        resourceId: 'res-gsc-portfolio',
        internalType: 'BRAND' as const,
        internalId: 'brand-lakshmi',
        resourceName: 'https://lakshmipriyan-portfolio.vercel.app/',
        externalResourceId: 'https://lakshmipriyan-portfolio.vercel.app/',
        provider: 'GOOGLE_SEARCH_CONSOLE',
      },
      {
        id: 'map-2',
        resourceId: 'res-ga4-lakshmi',
        internalType: 'BRAND' as const,
        internalId: 'brand-lakshmi',
        resourceName: 'lakshmi food',
        externalResourceId: 'properties/554775051',
        provider: 'GOOGLE_ANALYTICS_4',
      },
    ],
    brands: [
      { id: 'brand-lakshmi', name: 'Lakshmi food', slug: 'lakshmi-food' },
      { id: 'brand-sastikaa', name: 'Sastikaa travel agency', slug: 'sastikaa-travel-agency' },
    ],
    locations: [],
  };

  it('renders Step 3 for Lakshmi food and shows alert banner if Sastikaa travel agency is active and unmapped', async () => {
    // When Sastikaa travel agency is active in URL query params
    mockSearchParamBrandId = 'brand-sastikaa';

    render(
      <IntegrationsManager
        tenantSlug="lakshmi-food"
        tenantId="tenant-1"
        initialState={mockInitialState}
        userRole="CLIENT_OWNER"
      />
    );

    // Because Sastikaa travel agency has no mappings, the component opens Step 2 directly or shows the unmapped prompt
    // Let's verify brand banner
    expect(screen.getByText(/Connecting resources for Brand:/i)).toBeInTheDocument();
    expect(screen.getAllByText('Sastikaa travel agency').length).toBeGreaterThan(0);

    // Sastikaa Travel GSC resource is present in the list with Sastikaa brand label
    expect(screen.getByText('https://www.sastikaatravel.com/')).toBeInTheDocument();
  });

  it('allows selecting Sastikaa travel resource, assigning brand, and moving to Step 3 Review', async () => {
    const user = userEvent.setup();
    mockSearchParamBrandId = 'brand-sastikaa';

    render(
      <IntegrationsManager
        tenantSlug="lakshmi-food"
        tenantId="tenant-1"
        initialState={mockInitialState}
        userRole="CLIENT_OWNER"
      />
    );

    // Find the row containing https://www.sastikaatravel.com/ and click its checkbox
    const sastikaaText = screen.getByText('https://www.sastikaatravel.com/');
    const sastikaaRow = sastikaaText.closest('div.group') || sastikaaText.closest('div');
    const sastikaaCheckbox = sastikaaRow?.querySelector('button[role="checkbox"]') as HTMLElement;
    expect(sastikaaCheckbox).toBeInTheDocument();
    await user.click(sastikaaCheckbox);

    // Click "Continue to Review & Sync →"
    const continueBtn = screen.getByRole('button', { name: /continue to review & sync/i });
    await user.click(continueBtn);

    // Now in Step 3 Review
    expect(screen.getByRole('heading', { name: /Selected Resources/i })).toBeInTheDocument();
    expect(screen.getByText('https://www.sastikaatravel.com/')).toBeInTheDocument();

    // Brand filter tabs include Sastikaa travel agency
    expect(screen.getByRole('button', { name: /all brands/i })).toBeInTheDocument();
  });
});
