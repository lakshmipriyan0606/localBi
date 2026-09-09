// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form';
import { ResetPasswordForm } from '@/features/auth/components/reset-password-form';
import { browserClient } from '@/lib/http/browser-client';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe('ForgotPasswordForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders input, label, and submit button', () => {
    render(<ForgotPasswordForm />);
    expect(screen.getByLabelText(/work email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send recovery link/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to sign in/i })).toHaveAttribute('href', '/login');
  });

  it('validates invalid email format', async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    const input = screen.getByLabelText(/work email/i);
    await user.type(input, 'not-an-email');
    await user.click(screen.getByRole('button', { name: /send recovery link/i }));

    await waitFor(() => {
      expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
    });
  });

  it('submits successfully and displays non-enumerating confirmation', async () => {
    const user = userEvent.setup();
    vi.spyOn(browserClient, 'post').mockResolvedValueOnce({ data: { success: true } });

    render(<ForgotPasswordForm />);

    const input = screen.getByLabelText(/work email/i);
    await user.type(input, 'user@enterprise.com');
    await user.click(screen.getByRole('button', { name: /send recovery link/i }));

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      expect(screen.getByText(/user@enterprise.com/i)).toBeInTheDocument();
    });
  });
});

describe('ResetPasswordForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders invalid link alert when token is missing', () => {
    render(<ResetPasswordForm token={undefined} />);
    expect(screen.getByText(/invalid recovery link/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /request new recovery link/i })).toHaveAttribute(
      'href',
      '/forgot-password'
    );
  });

  it('validates password mismatch and length requirements', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm token="valid-test-token-12345678901234567890" />);

    const pwdInput = screen.getByLabelText(/^new password/i);
    const confirmInput = screen.getByLabelText(/^confirm new password/i);

    await user.type(pwdInput, 'short');
    await user.type(confirmInput, 'mismatch');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText(/^Password must be at least 10 characters long$/i)).toBeInTheDocument();
      expect(screen.getByText(/^Passwords do not match$/i)).toBeInTheDocument();
    });
  });

  it('submits password reset and renders success confirmation', async () => {
    const user = userEvent.setup();
    vi.spyOn(browserClient, 'post').mockResolvedValueOnce({ data: { success: true } });

    render(<ResetPasswordForm token="valid-test-token-12345678901234567890" />);

    const pwdInput = screen.getByLabelText(/^new password/i);
    const confirmInput = screen.getByLabelText(/^confirm new password/i);

    await user.type(pwdInput, 'SuperSecretPass123!');
    await user.type(confirmInput, 'SuperSecretPass123!');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText(/password updated/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /sign in with new password/i })).toHaveAttribute(
        'href',
        '/login'
      );
    });
  });
});
