// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { TenantsDashboard } from '@/features/tenancy/components/tenants-dashboard';
import { browserClient } from '@/lib/http/browser-client';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('TenantsDashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockUser = {
    email: 'admin@acme.com',
    fullName: 'Jane Doe',
  };

  const mockTenants = [
    {
      id: 't-1',
      name: 'Acme Retailers',
      slug: 'acme-retailers',
      role: 'OWNER',
      plan: 'ENTERPRISE',
      timezone: 'America/New_York',
    },
    {
      id: 't-2',
      name: 'Apex Brands',
      slug: 'apex-brands',
      role: 'ADMIN',
      plan: 'PRO',
      timezone: 'UTC',
    },
  ];

  it('renders user details and organization list cards', () => {
    render(<TenantsDashboard initialTenants={mockTenants} user={mockUser} />);

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('admin@acme.com')).toBeInTheDocument();
    expect(screen.getByText('Acme Retailers')).toBeInTheDocument();
    expect(screen.getByText('Apex Brands')).toBeInTheDocument();
    expect(screen.getByText('owner')).toBeInTheDocument();
  });

  it('filters organizations dynamically with search bar', async () => {
    const user = userEvent.setup();
    render(<TenantsDashboard initialTenants={mockTenants} user={mockUser} />);

    const searchInput = screen.getByPlaceholderText(/search organizations/i);
    await user.type(searchInput, 'Apex');

    expect(screen.getByText('Apex Brands')).toBeInTheDocument();
    expect(screen.queryByText('Acme Retailers')).not.toBeInTheDocument();
  });

  it('renders empty state when user belongs to zero organizations', () => {
    render(<TenantsDashboard initialTenants={[]} user={mockUser} />);

    expect(screen.getByText(/no organizations found/i)).toBeInTheDocument();
  });

  it('opens create tenant dialog and validates slug format', async () => {
    const user = userEvent.setup();
    render(<TenantsDashboard initialTenants={mockTenants} user={mockUser} />);

    const createBtn = screen.getByRole('button', { name: /new organization/i });
    await user.click(createBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /new organization/i })).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/organization name/i);
    await user.type(nameInput, 'New Corp Inc');

    // Auto-generated slug
    const slugInput = screen.getByLabelText(/workspace url slug/i) as HTMLInputElement;
    expect(slugInput.value).toBe('new-corp-inc');
  });

  it('submits new organization and navigates to its workspace', async () => {
    const user = userEvent.setup();
    vi.spyOn(browserClient, 'post').mockResolvedValueOnce({
      data: { tenant: { slug: 'acme-fresh' } },
    });

    render(<TenantsDashboard initialTenants={mockTenants} user={mockUser} />);

    const createBtn = screen.getByRole('button', { name: /new organization/i });
    await user.click(createBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /new organization/i })).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/organization name/i);
    await user.type(nameInput, 'Acme Fresh');

    const submitBtn = screen.getByRole('button', { name: /^create organization$/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/t/acme-fresh');
    });
  });
});
