// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TenantTopNav } from '@/components/layout/tenant-top-nav';

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => '/client/lakshmi-food/brands',
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/features/brands/hooks/use-brands', () => ({
  useBrandsQuery: () => ({
    data: {
      items: [
        { id: 'b-1', name: 'Lakshmi food', slug: 'lakshmi-food' },
        { id: 'b-2', name: 'Sastikaa travel agency', slug: 'sastikaa-travel-agency' },
      ],
      total: 2,
    },
    isLoading: false,
  }),
  useCreateBrandMutation: () => ({
    mutateAsync: vi.fn(),
  }),
}));

describe('TenantTopNav - Brand and Business Selectors', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockTenant = {
    id: 't-1',
    name: 'Lakshmi food',
    slug: 'lakshmi-food',
    plan: 'STANDARD',
    tenantType: 'DIRECT_CLIENT',
    timezone: 'UTC',
  };

  const mockUser = {
    id: 'u-1',
    email: 'admin@localbi.com',
    fullName: 'LocalBi Admin',
    role: 'CLIENT_OWNER',
  };

  const mockBrands = [
    { id: 'b-1', name: 'Lakshmi food', slug: 'lakshmi-food' },
    { id: 'b-2', name: 'Sastikaa travel agency', slug: 'sastikaa-travel-agency' },
  ];

  it('renders Brand selector and displays all brands including Sastikaa travel agency in dropdown', async () => {
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <TenantTopNav
          tenant={mockTenant}
          user={mockUser}
          brands={mockBrands}
        />
      </QueryClientProvider>
    );

    // Find and click the Brand dropdown button
    const brandButton = screen.getByRole('button', { name: /brand:/i });
    expect(brandButton).toBeInTheDocument();
    await user.click(brandButton);

    // Both brands must be listed
    expect(screen.getByText('Sastikaa travel agency')).toBeInTheDocument();
    expect(screen.getAllByText('Lakshmi food').length).toBeGreaterThan(0);

    // The Add New Brand button must be present in the brand dropdown
    expect(screen.getByRole('button', { name: /add new brand/i })).toBeInTheDocument();
  });

  it('does NOT render Business dropdown in top nav per client feedback, only rendering Brand selector', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TenantTopNav
          tenant={mockTenant}
          user={mockUser}
          brands={mockBrands}
        />
      </QueryClientProvider>
    );

    // Business dropdown button must NOT be present in top nav
    expect(screen.queryByRole('button', { name: /business:/i })).not.toBeInTheDocument();

    // Brand dropdown button MUST be present
    expect(screen.getByRole('button', { name: /brand:/i })).toBeInTheDocument();
  });

  it('selects a brand, updates URL query params, and persists selection to localStorage and cookies', async () => {
    const user = userEvent.setup();
    const eventSpy = vi.fn();
    window.addEventListener('localbi-brand-changed', eventSpy);

    render(
      <QueryClientProvider client={queryClient}>
        <TenantTopNav
          tenant={mockTenant}
          user={mockUser}
          brands={mockBrands}
        />
      </QueryClientProvider>
    );

    // Open brand selector
    const brandButton = screen.getByRole('button', { name: /brand:/i });
    await user.click(brandButton);

    // Click "Sastikaa travel agency"
    const sastikaaOption = screen.getByText('Sastikaa travel agency');
    await user.click(sastikaaOption);

    // Must navigate with brandId query param
    expect(mockPush).toHaveBeenCalledWith('/client/lakshmi-food/brands?brandId=b-2');

    // Must persist brandId to localStorage
    expect(localStorage.getItem('localbi_active_brand_lakshmi-food')).toBe('b-2');

    // Must persist brandId to cookies
    expect(document.cookie).toContain('localbi_active_brand_lakshmi-food=b-2');

    // Must dispatch localbi-brand-changed event
    expect(eventSpy).toHaveBeenCalled();
    const eventDetail = eventSpy.mock.calls[0]?.[0]?.detail;
    expect(eventDetail?.brandId).toBe('b-2');

    window.removeEventListener('localbi-brand-changed', eventSpy);
  });
});
