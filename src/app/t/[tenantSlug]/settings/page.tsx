'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface TenantSettings {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  plan: string;
  version: number;
}

interface UserSession {
  id: string;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  isCurrent: boolean;
}

export default function TenantSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = typeof params['tenantSlug'] === 'string' ? params['tenantSlug'] : '';

  // Organization settings
  const [tenant, setTenant] = useState<TenantSettings | null>(null);
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Sessions
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionActionError, setSessionActionError] = useState<string | null>(null);

  const fetchTenantSettings = async () => {
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/settings`);
      if (res.ok) {
        const data = await res.json();
        setTenant(data.tenant);
        setName(data.tenant.name);
        setTimezone(data.tenant.timezone);
      }
    } catch {
      // Graceful
    }
  };

  const fetchActiveSessions = async () => {
    try {
      setLoadingSessions(true);
      const res = await fetch('/api/auth/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch {
      // Graceful
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (tenantSlug) {
      fetchTenantSettings();
      fetchActiveSessions();
    }
  }, [tenantSlug]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;

    setSavingSettings(true);
    setSettingsError(null);
    setSettingsSuccess(false);

    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          timezone,
          version: tenant.version,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to update organization settings');
      }

      setTenant(data.tenant);
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 4000);
    } catch (err) {
      setSettingsError((err as Error).message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm('Revoke this session? The device will be signed out immediately.')) {
      return;
    }

    try {
      const res = await fetch(`/api/auth/sessions?sessionId=${sessionId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to revoke session');
      }

      fetchActiveSessions();
    } catch (err) {
      setSessionActionError((err as Error).message);
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!confirm('Sign out from all devices? You will need to log in again.')) {
      return;
    }

    try {
      const res = await fetch('/api/auth/sessions?all=true', {
        method: 'DELETE',
      });

      if (res.ok) {
        router.push('/login');
      }
    } catch {
      router.push('/login');
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1>Settings & Sessions</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Configure organization preferences and manage authorized active device sessions.
        </p>
      </div>

      {/* Organization Settings Card */}
      <div className="card" style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Organization Preferences</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Updates are protected with optimistic concurrency locking to prevent conflicting overwrite.
        </p>

        {settingsSuccess && (
          <div className="alert alert-success" role="alert">
            <span>Organization settings updated successfully!</span>
          </div>
        )}

        {settingsError && (
          <div className="alert alert-danger" role="alert">
            <span>{settingsError}</span>
          </div>
        )}

        <form onSubmit={handleSaveSettings}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="org-name-input">Organization Name</label>
              <input
                id="org-name-input"
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="org-slug-input">Workspace Slug (Immutable)</label>
              <input
                id="org-slug-input"
                type="text"
                className="form-input"
                value={tenantSlug}
                disabled
                style={{ opacity: 0.7, cursor: 'not-allowed' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="org-tz-input">Reporting Timezone</label>
              <input
                id="org-tz-input"
                type="text"
                className="form-input"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Subscription Plan</label>
              <input
                type="text"
                className="form-input"
                value={tenant?.plan || 'ENTERPRISE'}
                disabled
                style={{ opacity: 0.7, cursor: 'not-allowed' }}
              />
            </div>
          </div>

          {tenant && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '1rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border-subtle)',
            }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Optimistic Version: v{tenant.version}
              </span>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={savingSettings}
                id="save-tenant-settings-btn"
              >
                {savingSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Active Device Sessions Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Active Sessions & Devices</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Stateful server-revocable sessions. Revoking a session immediately deletes access from that device.
            </p>
          </div>

          <button
            onClick={handleRevokeAllSessions}
            className="btn btn-danger btn-sm"
            id="revoke-all-sessions-btn"
          >
            Sign Out All Devices
          </button>
        </div>

        {sessionActionError && (
          <div className="alert alert-danger" role="alert" style={{ marginBottom: '1.5rem' }}>
            <span>{sessionActionError}</span>
          </div>
        )}

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Browser / Client</th>
                <th>IP Address</th>
                <th>Created</th>
                <th>Last Active</th>
                <th style={{ textAlign: 'right' }}>Status / Action</th>
              </tr>
            </thead>
            <tbody>
              {loadingSessions ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Loading active sessions...
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No sessions found.
                  </td>
                </tr>
              ) : (
                sessions.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                          <line x1="8" y1="21" x2="16" y2="21"></line>
                          <line x1="12" y1="17" x2="12" y2="21"></line>
                        </svg>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.userAgent || 'Web Browser'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {s.ipAddress || '127.0.0.1'}
                      </code>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(s.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {new Date(s.lastActiveAt).toLocaleTimeString()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {s.isCurrent ? (
                        <span className="badge badge-success">Current Device</span>
                      ) : (
                        <button
                          onClick={() => handleRevokeSession(s.id)}
                          className="btn btn-secondary btn-sm"
                          id={`revoke-session-${s.id}`}
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
