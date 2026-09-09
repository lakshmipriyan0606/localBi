'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

interface InvitationDetails {
  id: string;
  tenantId: string;
  tenantName: string;
  email: string;
  role: string;
  expiresAt: string;
  isExpired: boolean;
}

export default function InvitationAcceptancePage() {
  const params = useParams();
  const router = useRouter();
  const token = typeof params['token'] === 'string' ? params['token'] : '';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing invitation token.');
      setLoading(false);
      return;
    }

    async function fetchInvitation() {
      try {
        const res = await fetch(`/api/invitations/${token}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error?.message || 'This invitation link is invalid or has expired.');
        }

        setInvitation(data.invitation);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    fetchInvitation();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    if (password !== confirmPassword) {
      setActionError('Passwords do not match.');
      return;
    }

    if (password.length < 10) {
      setActionError('Password must be at least 10 characters long.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/invitations/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to accept invitation.');
      }

      // Route to tenants list
      router.push('/tenants');
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #090d16 70%)',
    }}>
      <div className="card-glass" style={{ maxWidth: '460px', width: '100%', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #10b981, #3b82f6)',
            marginBottom: '1rem',
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
              <line x1="20" y1="8" x2="20" y2="14"></line>
              <line x1="23" y1="11" x2="17" y2="11"></line>
            </svg>
          </div>
          <h2>Join Organization</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            You have been invited to collaborate on localBi
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
            Verifying invitation credentials...
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center' }}>
            <div className="alert alert-danger" role="alert" style={{ marginBottom: '1.5rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{error}</span>
            </div>
            <Link href="/login" className="btn btn-secondary" style={{ width: '100%' }}>
              Go to Sign In
            </Link>
          </div>
        ) : (
          <>
            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              marginBottom: '1.5rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ORGANIZATION</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {invitation?.tenantName}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>INVITED EMAIL</span>
                <span style={{ fontSize: '0.875rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                  {invitation?.email}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ASSIGNED ROLE</span>
                <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                  {invitation?.role.replace(/_/g, ' ').toLowerCase()}
                </span>
              </div>
            </div>

            {actionError && (
              <div className="alert alert-danger" role="alert" style={{ marginBottom: '1.5rem' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="invitation-fullname-input">Full Legal Name</label>
                <input
                  id="invitation-fullname-input"
                  type="text"
                  className="form-input"
                  placeholder="Jane Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="invitation-password-input">Create Password</label>
                <input
                  id="invitation-password-input"
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
                <label className="form-label" htmlFor="invitation-confirm-password-input">Confirm Password</label>
                <input
                  id="invitation-confirm-password-input"
                  type="password"
                  className="form-input"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}
                disabled={submitting}
                id="invitation-accept-btn"
              >
                {submitting ? 'Creating Membership...' : 'Accept Invitation & Create Account'}
              </button>
            </form>

            <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Already have an account?{' '}
              <Link href="/login">Sign in with your credentials</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
