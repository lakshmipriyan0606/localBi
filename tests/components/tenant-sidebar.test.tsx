// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { TenantSidebar } from '@/components/layout/tenant-sidebar';
import { browserClient } from '@/lib/http/browser-client';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => '/t/acme-corp/brands',
  useRouter: () => ({
    push: mockPush,
  }),
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
    plan: 'ENTERPRISE',
    timezone: 'America/New_York',
  };

  const mockUser = {
    id: 'u-123',
    email: 'admin@acme.com',
    fullName: 'Jane Doe',
    role: 'OWNER',
  };

  it('renders tenant name, slug, user profile, and navigation links', () => {
    render(<TenantSidebar tenant={mockTenant} user={mockUser} />);

    expect(screen.getByText('Acme Coffee Co')).toBeInTheDocument();
    expect(screen.getByText('/t/acme-corp')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('admin@acme.com')).toBeInTheDocument();
    expect(screen.getByText('owner')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /overview/i })).toHaveAttribute(
      'href',
      '/t/acme-corp'
    );
    expect(screen.getByRole('link', { name: /brands/i })).toHaveAttribute(
      'href',
      '/t/acme-corp/brands'
    );
    expect(screen.getByRole('link', { name: /locations/i })).toHaveAttribute(
      'href',
      '/t/acme-corp/locations'
    );
    expect(screen.getByRole('link', { name: /team members/i })).toHaveAttribute(
      'href',
      '/t/acme-corp/team'
    );
    expect(screen.getByRole('link', { name: /invitations/i })).toHaveAttribute(
      'href',
      '/t/acme-corp/invitations'
    );
    expect(screen.getByRole('link', { name: /settings & sessions/i })).toHaveAttribute(
      'href',
      '/t/acme-corp/settings'
    );
  });

  it('highlights the active navigation link according to current pathname', () => {
    render(<TenantSidebar tenant={mockTenant} user={mockUser} />);

    const brandsLink = screen.getByRole('link', { name: /brands/i });
    expect(brandsLink).toHaveAttribute('aria-current', 'page');

    const overviewLink = screen.getByRole('link', { name: /overview/i });
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
