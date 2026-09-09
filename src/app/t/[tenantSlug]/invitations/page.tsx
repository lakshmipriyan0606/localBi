'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface InvitationItem {
  id: string;
  email: string;
  role: string;
  scopeMode: string;
  expiresAt: string;
  createdAt: string;
  invitedBrandIds?: string[];
}

interface BrandOption {
  id: string;
  name: string;
}

export default function InvitationsPage() {
  const params = useParams();
  const tenantSlug = typeof params['tenantSlug'] === 'string' ? params['tenantSlug'] : '';

  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite Modal
  const [showModal, setShowModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('ANALYST');
  const [inviteScopeMode, setInviteScopeMode] = useState('ALL_BRANDS');
  const [inviteBrandIds, setInviteBrandIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      setError(null);

      const [invRes, brandsRes] = await Promise.all([
        fetch(`/api/tenants/${tenantSlug}/invitations`),
        fetch(`/api/tenants/${tenantSlug}/brands?limit=100`),
      ]);

      const [invData, brandsData] = await Promise.all([
        invRes.json(),
        brandsRes.json(),
      ]);

      if (!invRes.ok) {
        throw new Error(invData.error?.message || 'Failed to fetch pending invitations');
      }

      setInvitations(invData.invitations || []);
      setBrands(brandsData.items || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantSlug) {
      fetchInvitations();
    }
  }, [tenantSlug]);

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          scopeMode: inviteScopeMode,
          brandIds: inviteScopeMode === 'RESTRICTED' ? inviteBrandIds : [],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to generate invitation');
      }

      const inviteUrl = `${window.location.origin}/invitations/${data.rawToken}`;
      setGeneratedInviteLink(inviteUrl);
      fetchInvitations();
    } catch (err) {
      setModalError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeInvitation = async (invitationId: string, email: string) => {
    if (!confirm(`Revoke invitation for ${email}? The invitation link will immediately stop functioning.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/invitations?invitationId=${invitationId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to revoke invitation');
      }

      fetchInvitations();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const toggleBrand = (brandId: string) => {
    if (inviteBrandIds.includes(brandId)) {
      setInviteBrandIds(inviteBrandIds.filter((id) => id !== brandId));
    } else {
      setInviteBrandIds([...inviteBrandIds, brandId]);
    }
  };

  const resetModal = () => {
    setShowModal(false);
    setInviteEmail('');
    setInviteRole('ANALYST');
    setInviteScopeMode('ALL_BRANDS');
    setInviteBrandIds([]);
    setGeneratedInviteLink(null);
    setModalError(null);
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1>Pending Invitations</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Dispatch time-bounded invitations to onboarding team members with pre-assigned roles.
          </p>
        </div>

        <button
          onClick={() => {
            resetModal();
            setShowModal(true);
          }}
          className="btn btn-primary"
          id="open-invite-modal-btn"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Invite Member
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert" style={{ marginBottom: '1.5rem' }}>
          <span>{error}</span>
        </div>
      )}

      {/* Invitations Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Invited Email</th>
              <th>Assigned Role</th>
              <th>Scope Mode</th>
              <th>Sent</th>
              <th>Expires</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  Loading invitations...
                </td>
              </tr>
            ) : invitations.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No pending invitations. Click "Invite Member" to send an invitation.
                </td>
              </tr>
            ) : (
              invitations.map((inv) => {
                const isExpired = new Date(inv.expiresAt).getTime() <= Date.now();
                return (
                  <tr key={inv.id}>
                    <td>
                      <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                        {inv.email}
                      </code>
                    </td>
                    <td>
                      <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                        {inv.role.replace(/_/g, ' ').toLowerCase()}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        {inv.scopeMode === 'ALL_BRANDS' ? 'All Brands' : 'Restricted Brands'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${isExpired ? 'badge-danger' : 'badge-warning'}`}>
                        {isExpired ? 'Expired' : new Date(inv.expiresAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleRevokeInvitation(inv.id, inv.email)}
                        className="btn btn-secondary btn-sm"
                        id={`revoke-invitation-${inv.email}`}
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Invite Member Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={resetModal}>
          <div className="modal-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Invite Team Member</h2>
              <button
                onClick={resetModal}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {generatedInviteLink ? (
              <div>
                <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
                  <span>Invitation generated successfully! Copy and send the link below to your teammate:</span>
                </div>
                <div style={{
                  display: 'flex',
                  gap: '0.5rem',
                  marginBottom: '1.5rem',
                }}>
                  <input
                    type="text"
                    readOnly
                    value={generatedInviteLink}
                    className="form-input"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedInviteLink);
                      alert('Invitation link copied to clipboard!');
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    Copy
                  </button>
                </div>
                <button onClick={resetModal} className="btn btn-primary" style={{ width: '100%' }}>
                  Done
                </button>
              </div>
            ) : (
              <>
                {modalError && (
                  <div className="alert alert-danger" role="alert">
                    <span>{modalError}</span>
                  </div>
                )}

                <form onSubmit={handleCreateInvitation}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="invite-email-input">Work Email Address</label>
                    <input
                      id="invite-email-input"
                      type="email"
                      className="form-input"
                      placeholder="teammate@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="invite-role-select">Assigned Role</label>
                    <select
                      id="invite-role-select"
                      className="form-select"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      required
                    >
                      <option value="CLIENT_OWNER">Client Owner</option>
                      <option value="CLIENT_ADMIN">Client Admin</option>
                      <option value="BRAND_MANAGER">Brand Manager</option>
                      <option value="LOCATION_MANAGER">Location Manager</option>
                      <option value="ANALYST">Analyst</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="invite-scope-select">Access Scope</label>
                    <select
                      id="invite-scope-select"
                      className="form-select"
                      value={inviteScopeMode}
                      onChange={(e) => setInviteScopeMode(e.target.value)}
                      required
                    >
                      <option value="ALL_BRANDS">All Brands & Locations</option>
                      <option value="RESTRICTED">Restricted Brands</option>
                    </select>
                  </div>

                  {inviteScopeMode === 'RESTRICTED' && (
                    <div className="form-group">
                      <label className="form-label">Select Allowed Brands</label>
                      <div style={{
                        maxHeight: '140px',
                        overflowY: 'auto',
                        border: '1px solid var(--border-medium)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.75rem',
                        background: 'rgba(15, 23, 42, 0.5)',
                      }}>
                        {brands.length === 0 ? (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No brands registered</span>
                        ) : (
                          brands.map((b) => (
                            <label
                              key={b.id}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}
                            >
                              <input
                                type="checkbox"
                                checked={inviteBrandIds.includes(b.id)}
                                onChange={() => toggleBrand(b.id)}
                              />
                              <span>{b.name}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={resetModal}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={submitting}
                      id="submit-invitation-btn"
                    >
                      {submitting ? 'Generating Invite...' : 'Send Invitation'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
