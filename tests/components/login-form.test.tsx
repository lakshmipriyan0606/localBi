// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { LoginForm } from '@/features/auth/components/login-form';

const mockReplace = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    refresh: mockRefresh,
    push: vi.fn(),
  }),
}));

describe('LoginForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders with visible labels, inputs, and accessible button', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/work email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /sign in to workspace/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /forgot password/i })).toHaveAttribute(
      'href',
      '/forgot-password'
    );
  });

  it('displays field validation errors when submitted empty', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const submitBtn = screen.getByRole('button', { name: /sign in to workspace/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/email address is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/work email/i);
    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    expect(emailInput).toHaveAttribute('aria-describedby', 'login-email-error');
  });

  it('displays validation error for malformed email addresses', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/work email/i);
    await user.type(emailInput, 'not-an-email');

    const submitBtn = screen.getByRole('button', { name: /sign in to workspace/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/please enter a valid work email address/i)
      ).toBeInTheDocument();
    });
  });

  it('toggles password visibility with accessible label updates', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const passwordInput = screen.getByLabelText(/^password/i);
    const toggleButton = screen.getByRole('button', { name: /show password/i });

    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /hide password/i }));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('displays generic error on invalid credentials without user enumeration', async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' },
      }),
    } as unknown as Response);

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/work email/i), 'admin@company.com');
    await user.type(screen.getByLabelText(/^password/i), 'WrongPassword123!');
    await user.click(screen.getByRole('button', { name: /sign in to workspace/i }));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(/email or password is incorrect/i);
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('displays rate-limit message when receiving 429', async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({
        error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many login attempts.' },
      }),
    } as unknown as Response);

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/work email/i), 'admin@company.com');
    await user.type(screen.getByLabelText(/^password/i), 'WrongPassword123!');
    await user.click(screen.getByRole('button', { name: /sign in to workspace/i }));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(/too many login attempts/i);
    });
  });

  it('handles network failure gracefully', async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/work email/i), 'admin@company.com');
    await user.type(screen.getByLabelText(/^password/i), 'ValidPassword123!');
    await user.click(screen.getByRole('button', { name: /sign in to workspace/i }));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(/unable to connect to the authentication service/i);
    });
  });

  it('submits normalized payload and navigates on successful login', async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        user: { id: 'usr_1', email: 'admin@company.com', fullName: 'Admin User', status: 'ACTIVE' },
      }),
    } as unknown as Response);

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/work email/i), '  Admin@Company.COM  ');
    await user.type(screen.getByLabelText(/^password/i), 'CorrectPassword123!');
    await user.click(screen.getByRole('button', { name: /sign in to workspace/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'admin@company.com',
            password: 'CorrectPassword123!',
          }),
        })
      );
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/clients');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });
});
