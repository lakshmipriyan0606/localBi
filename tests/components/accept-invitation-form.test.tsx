// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { AcceptInvitationForm } from '@/features/invitations/components/accept-invitation-form';
import { browserClient } from '@/lib/http/browser-client';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('AcceptInvitationForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockInvitation = {
    tenantName: 'Acme Global',
    email: 'newhire@acme.com',
    role: 'MANAGER',
  };

  it('renders verified tenant details and form fields', () => {
    render(<AcceptInvitationForm token="mock-valid-token-32-chars-long-1234" invitation={mockInvitation} />);

    expect(screen.getByText('Acme Global')).toBeInTheDocument();
    expect(screen.getByText('newhire@acme.com')).toBeInTheDocument();
    expect(screen.getByText(/manager/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^create password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^confirm password/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /accept invitation & continue/i })
    ).toBeInTheDocument();
  });

  it('validates password requirements and mismatches', async () => {
    const user = userEvent.setup();
    render(<AcceptInvitationForm token="mock-valid-token-32-chars-long-1234" invitation={mockInvitation} />);

    const nameInput = screen.getByLabelText(/full name/i);
    const pwdInput = screen.getByLabelText(/^create password/i);
    const confirmInput = screen.getByLabelText(/^confirm password/i);

    await user.type(nameInput, 'Alex');
    await user.type(pwdInput, 'short');
    await user.type(confirmInput, 'different');
    await user.click(screen.getByRole('button', { name: /accept invitation & continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/^Password must be at least 10 characters long$/i)).toBeInTheDocument();
      expect(screen.getByText(/^Passwords do not match$/i)).toBeInTheDocument();
    });
  });

  it('submits valid invitation acceptance and navigates to workspace', async () => {
    const user = userEvent.setup();
    vi.spyOn(browserClient, 'post').mockResolvedValueOnce({ data: { success: true } });

    render(<AcceptInvitationForm token="mock-valid-token-32-chars-long-1234" invitation={mockInvitation} />);

    const nameInput = screen.getByLabelText(/full name/i);
    const pwdInput = screen.getByLabelText(/^create password/i);
    const confirmInput = screen.getByLabelText(/^confirm password/i);

    await user.type(nameInput, 'Alex Morgan');
    await user.type(pwdInput, 'SecurePass1234!');
    await user.type(confirmInput, 'SecurePass1234!');
    await user.click(screen.getByRole('button', { name: /accept invitation & continue/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/tenants');
    });
  });
});
