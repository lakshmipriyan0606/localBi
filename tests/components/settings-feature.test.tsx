// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OrganizationSettingsForm } from '@/features/settings/components/organization-settings-form';
import { ActiveSessionsCard } from '@/features/settings/components/active-sessions-card';
import { TenantSettingsDto } from '@/features/settings/types/settings-dto';
import { browserClient } from '@/lib/http/browser-client';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('Settings Feature Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockTenant: TenantSettingsDto = {
    id: 't-123',
    name: 'Acme Enterprises',
    slug: 'acme-enterprises',
    timezone: 'America/New_York',
    plan: 'ENTERPRISE',
    version: 4,
  };

  it('renders organization preferences with version and immutable fields', () => {
    renderWithQueryClient(<OrganizationSettingsForm tenant={mockTenant} />);

    expect(screen.getByDisplayValue('Acme Enterprises')).toBeInTheDocument();
    expect(screen.getByDisplayValue('acme-enterprises')).toBeDisabled();
    expect(screen.getByDisplayValue('America/New_York')).toBeInTheDocument();
    expect(screen.getByDisplayValue('ENTERPRISE')).toBeDisabled();
    expect(screen.getByText(/v4/i)).toBeInTheDocument();
  });

  it('submits updated preferences with current version', async () => {
    const user = userEvent.setup();
    vi.spyOn(browserClient, 'put').mockResolvedValueOnce({
      data: {
        tenant: {
          ...mockTenant,
          name: 'Acme Global Corp',
          version: 5,
        },
      },
    });

    renderWithQueryClient(<OrganizationSettingsForm tenant={mockTenant} />);

    const nameInput = screen.getByLabelText(/organization name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Acme Global Corp');

    const saveBtn = screen.getByRole('button', { name: /save settings/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(browserClient.put).toHaveBeenCalledWith(
        '/tenants/acme-enterprises/settings',
        expect.objectContaining({
          name: 'Acme Global Corp',
          version: 4,
        })
      );
      expect(screen.getByText(/updated successfully/i)).toBeInTheDocument();
    });
  });

  it('renders active sessions with current device identification', async () => {
    vi.spyOn(browserClient, 'get').mockResolvedValueOnce({
      data: {
        sessions: [
          {
            id: 'sess-1',
            userAgent: 'Mozilla/5.0 Mac OS',
            ipAddress: '192.168.1.1',
            lastActiveAt: '2026-02-01T12:00:00.000Z',
            createdAt: '2026-02-01T08:00:00.000Z',
            expiresAt: '2026-02-08T08:00:00.000Z',
            isCurrent: true,
          },
          {
            id: 'sess-2',
            userAgent: 'Chrome Windows',
            ipAddress: '192.168.1.50',
            lastActiveAt: '2026-02-01T10:00:00.000Z',
            createdAt: '2026-02-01T06:00:00.000Z',
            expiresAt: '2026-02-08T06:00:00.000Z',
            isCurrent: false,
          },
        ],
      },
    });

    renderWithQueryClient(<ActiveSessionsCard />);

    await waitFor(() => {
      expect(screen.getByText(/current session/i)).toBeInTheDocument();
      expect(screen.getByText('Mozilla/5.0 Mac OS')).toBeInTheDocument();
      expect(screen.getByText('Chrome Windows')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /revoke/i })).toBeInTheDocument();
    });
  });
});
