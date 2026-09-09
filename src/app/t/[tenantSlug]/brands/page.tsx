'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface Brand {
  id: string;
  name: string;
  slug: string;
  status: string;
  version: number;
  createdAt: string;
}

export default function BrandsPage() {
  const params = useParams();
  const tenantSlug = typeof params['tenantSlug'] === 'string' ? params['tenantSlug'] : '';

  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Modal
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      setError(null);
      const queryParams = new URLSearchParams();
      if (search) queryParams.set('search', search);
      if (includeArchived) queryParams.set('includeArchived', 'true');

      const res = await fetch(`/api/tenants/${tenantSlug}/brands?${queryParams.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to fetch brands');
      }

      setBrands(data.items || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantSlug) {
      fetchBrands();
    }
  }, [tenantSlug, includeArchived]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBrands();
  };

  const handleNameChange = (val: string) => {
    setNewName(val);
    const autoSlug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setNewSlug(autoSlug);
  };

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);

    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/brands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, slug: newSlug }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to create brand');
      }

      setShowCreateModal(false);
      setNewName('');
      setNewSlug('');
      fetchBrands();
    } catch (err) {
      setCreateError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (brand: Brand) => {
    setEditingBrand(brand);
    setEditName(brand.name);
    setEditSlug(brand.slug);
    setEditError(null);
  };

  const handleUpdateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBrand) return;

    setEditError(null);
    setUpdating(true);

    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/brands/${editingBrand.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          slug: editSlug,
          version: editingBrand.version,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to update brand');
      }

      setEditingBrand(null);
      fetchBrands();
    } catch (err) {
      setEditError((err as Error).message);
    } finally {
      setUpdating(false);
    }
  };

  const handleArchiveBrand = async (brand: Brand) => {
    const isArchiving = brand.status === 'ACTIVE';
    const confirmMessage = isArchiving
      ? `Are you sure you want to archive brand "${brand.name}"? Locations will remain associated.`
      : `Reactivate brand "${brand.name}"?`;

    if (!confirm(confirmMessage)) return;

    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/brands/${brand.id}?version=${brand.version}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to change brand status');
      }

      fetchBrands();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1>Brand Administration</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Manage client brand identities and configure tenant-scoped brand access.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
          id="create-brand-btn"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Brand
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert" style={{ marginBottom: '1.5rem' }}>
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
      }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flex: 1, maxWidth: '400px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search brands by name or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary btn-sm">Search</button>
        </form>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
          />
          Include archived brands
        </label>
      </div>

      {/* Brands Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Brand Name</th>
              <th>Slug</th>
              <th>Status</th>
              <th>Version</th>
              <th>Created</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  Loading brands...
                </td>
              </tr>
            ) : brands.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No brands found. Click "Add Brand" to create your first brand.
                </td>
              </tr>
            ) : (
              brands.map((b) => (
                <tr key={b.id}>
                  <td style={{ fontWeight: 600 }}>{b.name}</td>
                  <td>
                    <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      {b.slug}
                    </code>
                  </td>
                  <td>
                    <span className={`badge ${b.status === 'ACTIVE' ? 'badge-success' : 'badge-neutral'}`}>
                      {b.status}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>v{b.version}</span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      {new Date(b.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => openEditModal(b)}
                        className="btn btn-secondary btn-sm"
                        id={`edit-brand-${b.slug}`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleArchiveBrand(b)}
                        className={`btn btn-sm ${b.status === 'ACTIVE' ? 'btn-danger' : 'btn-secondary'}`}
                        id={`archive-brand-${b.slug}`}
                      >
                        {b.status === 'ACTIVE' ? 'Archive' : 'Restore'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Create New Brand</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="alert alert-danger" role="alert">
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateBrand}>
              <div className="form-group">
                <label className="form-label" htmlFor="new-brand-name">Brand Name</label>
                <input
                  id="new-brand-name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Acme Coffee Roasters"
                  value={newName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="new-brand-slug">Brand Slug (Tenant Unique)</label>
                <input
                  id="new-brand-slug"
                  type="text"
                  className="form-input"
                  placeholder="e.g. acme-coffee-roasters"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creating}
                  id="submit-brand-create-btn"
                >
                  {creating ? 'Creating...' : 'Create Brand'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingBrand && (
        <div className="modal-backdrop" onClick={() => setEditingBrand(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Edit Brand</h2>
              <button
                onClick={() => setEditingBrand(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="alert alert-danger" role="alert">
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateBrand}>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-brand-name">Brand Name</label>
                <input
                  id="edit-brand-name"
                  type="text"
                  className="form-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="edit-brand-slug">Brand Slug</label>
                <input
                  id="edit-brand-slug"
                  type="text"
                  className="form-input"
                  value={editSlug}
                  onChange={(e) => setEditSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  required
                />
              </div>

              <div style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                marginBottom: '1rem',
                padding: '0.5rem 0.75rem',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 'var(--radius-sm)',
              }}>
                Optimistic Concurrency Lock: Current Version v{editingBrand.version}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingBrand(null)}
                  disabled={updating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={updating}
                  id="submit-brand-update-btn"
                >
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
