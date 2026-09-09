'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface TeamMember {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  role: string;
  scopeMode: string;
  status: string;
  createdAt: string;
  brandAccessScopes?: { brandId: string; brand: { name: string } }[];
  locationAccessScopes?: { locationId: string; location: { name: string; storeCode: string } }[];
}

interface BrandOption {
  id: string;
  name: string;
}

export default function TeamPage() {
  const params = useParams();
  const tenantSlug = typeof params['tenantSlug'] === 'string' ? params['tenantSlug'] : '';

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Role/Scope Modal
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedScopeMode, setSelectedScopeMode] = useState('ALL_BRANDS');
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);

      const [membersRes, brandsRes] = await Promise.all([
        fetch(`/api/tenants/${tenantSlug}/members`),
        fetch(`/api/tenants/${tenantSlug}/brands?limit=100`),
      ]);

      const [membersData, brandsData] = await Promise.all([
        membersRes.json(),
        brandsRes.json(),
      ]);

      if (!membersRes.ok) {
        throw new Error(membersData.error?.message || 'Failed to load team members');
      }

      setMembers(membersData.members || []);
      setBrands(brandsData.items || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantSlug) {
      fetchMembers();
    }
  }, [tenantSlug]);

  const openEditModal = (member: TeamMember) => {
    setEditingMember(member);
    setSelectedRole(member.role);
    setSelectedScopeMode(member.scopeMode);
    setSelectedBrandIds(member.brandAccessScopes?.map((s) => s.brandId) || []);
    setUpdateError(null);
  };

  const handleUpdateRoleAndScope = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    setUpdateError(null);
    setUpdating(true);

    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/members`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          membershipId: editingMember.id,
          role: selectedRole,
          scopeMode: selectedScopeMode,
          brandIds: selectedScopeMode === 'RESTRICTED' ? selectedBrandIds : [],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to update member role');
      }

      setEditingMember(null);
      fetchMembers();
    } catch (err) {
      setUpdateError((err as Error).message);
    } finally {
      setUpdating(false);
    }
  };

  const handleSuspendMember = async (member: TeamMember) => {
    if (!confirm(`Suspend member ${member.fullName || member.email}? They will immediately lose access.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/members?membershipId=${member.id}&action=suspend`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to suspend member');
      }

      fetchMembers();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    if (!confirm(`Remove member ${member.fullName || member.email} from organization? If they are the last Owner, removal will be prevented.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/members?membershipId=${member.id}&action=remove`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to remove member');
      }

      fetchMembers();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const toggleBrandSelection = (brandId: string) => {
    if (selectedBrandIds.includes(brandId)) {
      setSelectedBrandIds(selectedBrandIds.filter((id) => id !== brandId));
    } else {
      setSelectedBrandIds([...selectedBrandIds, brandId]);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1>Team & Permissions</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Manage organization members, assign roles, and configure brand/location access scopes.
          </p>
        </div>

        <Link
          href={`/t/${tenantSlug}/invitations`}
          className="btn btn-primary"
          id="invite-member-btn"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Invite Member
        </Link>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert" style={{ marginBottom: '1.5rem' }}>
          <span>{error}</span>
        </div>
      )}

      {/* Members Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Member Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Access Scope</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  Loading team members...
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No members found.
                </td>
              </tr>
            ) : (
              members.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 600 }}>{m.fullName || '—'}</td>
                  <td>
                    <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      {m.email}
                    </code>
                  </td>
                  <td>
                    <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                      {m.role.replace(/_/g, ' ').toLowerCase()}
                    </span>
                  </td>
                  <td>
                    {m.scopeMode === 'ALL_BRANDS' ? (
                      <span style={{ fontSize: '0.8125rem', color: 'var(--accent-success)' }}>
                        All Brands & Locations
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.8125rem', color: 'var(--accent-warning)' }}>
                        Restricted ({m.brandAccessScopes?.length || 0} brands)
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${m.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                      {m.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => openEditModal(m)}
                        className="btn btn-secondary btn-sm"
                        id={`edit-role-${m.email}`}
                      >
                        Edit Role
                      </button>
                      {m.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleSuspendMember(m)}
                          className="btn btn-secondary btn-sm"
                          id={`suspend-member-${m.email}`}
                        >
                          Suspend
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveMember(m)}
                        className="btn btn-danger btn-sm"
                        id={`remove-member-${m.email}`}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Role & Scope Modal */}
      {editingMember && (
        <div className="modal-backdrop" onClick={() => setEditingMember(null)}>
          <div className="modal-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Edit Role & Permissions</h2>
              <button
                onClick={() => setEditingMember(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {updateError && (
              <div className="alert alert-danger" role="alert">
                <span>{updateError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateRoleAndScope}>
              <div className="form-group">
                <label className="form-label">Member</label>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  {editingMember.fullName} ({editingMember.email})
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="role-select">Tenant Role</label>
                <select
                  id="role-select"
                  className="form-select"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  required
                >
                  <option value="CLIENT_OWNER">Client Owner (Full Tenant Control)</option>
                  <option value="CLIENT_ADMIN">Client Admin (User & Resource Management)</option>
                  <option value="BRAND_MANAGER">Brand Manager (Brand Operations)</option>
                  <option value="LOCATION_MANAGER">Location Manager (Local Operations)</option>
                  <option value="ANALYST">Analyst (Data & Reporting Access)</option>
                  <option value="VIEWER">Viewer (Read-Only Access)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="scope-mode-select">Access Scope Mode</label>
                <select
                  id="scope-mode-select"
                  className="form-select"
                  value={selectedScopeMode}
                  onChange={(e) => setSelectedScopeMode(e.target.value)}
                  required
                >
                  <option value="ALL_BRANDS">All Brands and Locations</option>
                  <option value="RESTRICTED">Restricted to Selected Brands</option>
                </select>
              </div>

              {selectedScopeMode === 'RESTRICTED' && (
                <div className="form-group">
                  <label className="form-label">Allowed Brands</label>
                  <div style={{
                    maxHeight: '160px',
                    overflowY: 'auto',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem',
                    background: 'rgba(15, 23, 42, 0.5)',
                  }}>
                    {brands.length === 0 ? (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No brands available</span>
                    ) : (
                      brands.map((b) => (
                        <label
                          key={b.id}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedBrandIds.includes(b.id)}
                            onChange={() => toggleBrandSelection(b.id)}
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
                  onClick={() => setEditingMember(null)}
                  disabled={updating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={updating}
                  id="save-member-role-btn"
                >
                  {updating ? 'Saving...' : 'Update Permissions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
