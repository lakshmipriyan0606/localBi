// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { TenantSidebar } from '@/components/layout/tenant-sidebar';
import { browserClient } from '@/lib/http/browser-client';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => '/client/acme-corp/brands',
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => new URLSearchParams(),
}));

describe('TenantSidebar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockTenant = {
    id: 't-123',
    name: 'Acme Coffee Co',
    slug: 'acme-corp',
    plan: 'STANDARD',
    tenantType: 'DIRECT_CLIENT',
    timezone: 'America/New_York',
  };

  const mockUser = {
    id: 'u-123',
    email: 'admin@acme.com',
    fullName: 'Jane Doe',
    role: 'CLIENT_OWNER',
  };

  it('renders tenant branding, user profile, and core direct client navigation links', () => {
    render(<TenantSidebar tenant={mockTenant} user={mockUser} />);

    expect(screen.getByText('local')).toBeInTheDocument();
    expect(screen.getByText('Bi')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText(/client owner/i)).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /^overview$/i })).toHaveAttribute(
      'href',
      '/client/acme-corp'
    );
    expect(screen.getByRole('link', { name: /brand management/i })).toHaveAttribute(
      'href',
      '/client/acme-corp/brands'
    );
    expect(screen.getByRole('link', { name: /^team members$/i })).toHaveAttribute(
      'href',
      '/client/acme-corp/team'
    );
    expect(screen.getByRole('link', { name: /general settings/i })).toHaveAttribute(
      'href',
      '/client/acme-corp/settings'
    );
    expect(screen.getByRole('link', { name: /connect google accounts/i })).toHaveAttribute(
      'href',
      '/client/acme-corp/integrations'
    );
  });

  it('omits Agency & White-Label for direct clients', () => {
    render(<TenantSidebar tenant={mockTenant} user={mockUser} />);

    expect(screen.queryByText('Agency & White-Label')).not.toBeInTheDocument();
    expect(screen.queryByText('Agency Portfolio')).not.toBeInTheDocument();
    expect(screen.queryByText('Client Accounts')).not.toBeInTheDocument();
  });

  it('includes Agency & White-Label for agency accounts', async () => {
    const user = userEvent.setup();
    const agencyTenant = { ...mockTenant, tenantType: 'AGENCY', plan: 'AGENCY' };
    const agencyUser = { ...mockUser, role: 'AGENCY_OWNER' };

    render(<TenantSidebar tenant={agencyTenant} user={agencyUser} />);

    const agencyGroupBtn = screen.getByRole('button', { name: /agency & white-label/i });
    expect(agencyGroupBtn).toBeInTheDocument();
    await user.click(agencyGroupBtn);

    expect(screen.getByRole('link', { name: /agency portfolio/i })).toHaveAttribute(
      'href',
      '/client/acme-corp/agency'
    );
  });

  it('highlights the active navigation link according to current pathname', () => {
    render(<TenantSidebar tenant={mockTenant} user={mockUser} />);

    const brandsLink = screen.getByRole('link', { name: /brand management/i });
    expect(brandsLink).toHaveAttribute('aria-current', 'page');

    const overviewLink = screen.getByRole('link', { name: /^overview$/i });
    expect(overviewLink).not.toHaveAttribute('aria-current');
  });

  it('signs out user when sign out button is clicked', async () => {
    const user = userEvent.setup();
    vi.spyOn(browserClient, 'post').mockResolvedValueOnce({ data: { success: true } });

    render(<TenantSidebar tenant={mockTenant} user={mockUser} />);

    const signOutBtn = screen.getByRole('button', { name: /sign out/i });
    await user.click(signOutBtn);

    await waitFor(() => {
      expect(browserClient.post).toHaveBeenCalledWith('/auth/logout');
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });
});
