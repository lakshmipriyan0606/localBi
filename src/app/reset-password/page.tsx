'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 10) {
      setError('Password must be at least 10 characters long.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Password reset failed. The token may be expired or invalid.');
      }

      setSuccess(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div className="alert alert-danger">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>Invalid or missing reset token. Please request a new password recovery link.</span>
        </div>
        <Link href="/forgot-password" className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem' }}>
          Request Reset Link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span>Password reset successfully! All active sessions have been revoked.</span>
        </div>
        <Link href="/login" className="btn btn-primary" style={{ width: '100%' }}>
          Sign In with New Password
        </Link>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="alert alert-danger" role="alert" style={{ marginBottom: '1.5rem' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="new-password-input">New Password</label>
          <input
            id="new-password-input"
            type="password"
            className="form-input"
            placeholder="At least 10 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="confirm-password-input">Confirm Password</label>
          <input
            id="confirm-password-input"
            type="password"
            className="form-input"
            placeholder="Repeat new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>

        <div style={{
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          marginBottom: '1.25rem',
          padding: '0.75rem',
          background: 'rgba(15, 23, 42, 0.5)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
        }}>
          Password requirements:
          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.25rem' }}>
            <li>Minimum 10 characters in length</li>
            <li>Contains at least one uppercase letter (A-Z)</li>
            <li>Contains at least one lowercase letter (a-z)</li>
            <li>Contains at least one number (0-9)</li>
            <li>Contains at least one special symbol</li>
          </ul>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', padding: '0.75rem' }}
          disabled={loading}
          id="reset-password-btn"
        >
          {loading ? 'Updating Password...' : 'Reset Password'}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #090d16 70%)',
    }}>
      <div className="card-glass" style={{ maxWidth: '420px', width: '100%', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
            marginBottom: '1rem',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h2>Create New Password</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Choose a strong password to secure your localBi account.
          </p>
        </div>

        <Suspense fallback={<div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>

        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.8125rem' }}>
          <Link href="/login">← Return to Sign In</Link>
        </div>
      </div>
    </div>
  );
}
