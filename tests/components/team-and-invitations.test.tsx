// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TeamTable } from '@/features/team/components/team-table';
import { TeamEditModal } from '@/features/team/components/team-edit-modal';
import { InvitationTable } from '@/features/invitations/tenant/components/invitation-table';
import { InvitationDialog } from '@/features/invitations/tenant/components/invitation-dialog';
import { TeamMemberDto } from '@/features/team/types/team-dto';
import { TenantInvitationDto } from '@/features/invitations/tenant/types/invitation-dto';
import { browserClient } from '@/lib/http/browser-client';

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

describe('Team and Invitations Feature Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockBrands = [
    { id: 'b-1', name: 'Acme Coffee' },
    { id: 'b-2', name: 'Acme Roastery' },
  ];

  const mockMembers: TeamMemberDto[] = [
    {
      id: 'm-1',
      userId: 'u-1',
      email: 'owner@acme.com',
      fullName: 'Alice Owner',
      role: 'OWNER',
      scopeMode: 'ALL_BRANDS',
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'm-2',
      userId: 'u-2',
      email: 'analyst@acme.com',
      fullName: 'Bob Analyst',
      role: 'ANALYST',
      scopeMode: 'RESTRICTED',
      status: 'ACTIVE',
      createdAt: '2026-01-10T00:00:00.000Z',
      brandAccessScopes: [{ brandId: 'b-1', brand: { name: 'Acme Coffee' } }],
    },
  ];

  const mockInvitations: TenantInvitationDto[] = [
    {
      id: 'inv-1',
      email: 'invitee@acme.com',
      role: 'MANAGER',
      scopeMode: 'ALL_BRANDS',
      expiresAt: '2026-12-31T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  it('renders team table with members, role badges, and scopes', () => {
    renderWithQueryClient(
      <TeamTable
        tenantSlug="acme-corp"
        members={mockMembers}
        brands={mockBrands}
        isLoading={false}
      />
    );

    expect(screen.getByText('Alice Owner')).toBeInTheDocument();
    expect(screen.getByText('owner@acme.com')).toBeInTheDocument();
    expect(screen.getByText('owner')).toBeInTheDocument();
    expect(screen.getByText(/all brands & locations/i)).toBeInTheDocument();

    expect(screen.getByText('Bob Analyst')).toBeInTheDocument();
    expect(screen.getByText('analyst')).toBeInTheDocument();
    expect(screen.getByText(/restricted \(1 brands\)/i)).toBeInTheDocument();
  });

  it('opens edit modal and changes member role', async () => {
    const memberToEdit = mockMembers[1]!;
    const mockOnOpenChange = vi.fn();

    renderWithQueryClient(
      <TeamEditModal
        tenantSlug="acme-corp"
        member={memberToEdit}
        brands={mockBrands}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    expect(screen.getByRole('heading', { name: /edit member role & scope/i })).toBeInTheDocument();
    expect(screen.getByText('Bob Analyst')).toBeInTheDocument();
  });

  it('renders invitation table and revoke action', () => {
    renderWithQueryClient(
      <InvitationTable
        tenantSlug="acme-corp"
        invitations={mockInvitations}
        isLoading={false}
      />
    );

    expect(screen.getByText('invitee@acme.com')).toBeInTheDocument();
    expect(screen.getByText('manager')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /revoke/i })).toBeInTheDocument();
  });

  it('generates invitation and exposes copyable link', async () => {
    const user = userEvent.setup();
    vi.spyOn(browserClient, 'post').mockResolvedValueOnce({
      data: { rawToken: 'sample-invitation-token-123456789' },
    });

    renderWithQueryClient(
      <InvitationDialog tenantSlug="acme-corp" brands={mockBrands} />
    );

    const openBtn = screen.getByRole('button', { name: /invite member/i });
    await user.click(openBtn);

    const emailInput = screen.getByLabelText(/recipient email/i);
    await user.type(emailInput, 'candidate@acme.com');

    const submitBtn = screen.getByRole('button', { name: /^generate invitation$/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/invitation created successfully/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
    });
  });
});
