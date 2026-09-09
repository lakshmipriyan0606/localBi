'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface LocationItem {
  id: string;
  brandId: string;
  brandName?: string;
  storeCode: string;
  name: string;
  addressLine1: string;
  city: string;
  stateRegion: string;
  postalCode: string;
  countryCode: string;
  timezone: string;
  status: string;
  version: number;
  createdAt: string;
}

interface BrandOption {
  id: string;
  name: string;
}

export default function LocationsPage() {
  const params = useParams();
  const tenantSlug = typeof params['tenantSlug'] === 'string' ? params['tenantSlug'] : '';

  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [selectedBrandFilter, setSelectedBrandFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formBrandId, setFormBrandId] = useState('');
  const [formStoreCode, setFormStoreCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formState, setFormState] = useState('');
  const [formPostal, setFormPostal] = useState('');
  const [formCountry, setFormCountry] = useState('US');
  const [formTz, setFormTz] = useState('America/New_York');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Modal
  const [editingLocation, setEditingLocation] = useState<LocationItem | null>(null);
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchBrandsList = async () => {
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/brands?limit=100`);
      if (res.ok) {
        const data = await res.json();
        setBrands(data.items || []);
        if (data.items?.length > 0 && !formBrandId) {
          setFormBrandId(data.items[0].id);
        }
      }
    } catch {
      // Graceful
    }
  };

  const fetchLocations = async () => {
    try {
      setLoading(true);
      setError(null);
      const queryParams = new URLSearchParams();
      if (search) queryParams.set('search', search);
      if (selectedBrandFilter) queryParams.set('brandId', selectedBrandFilter);
      if (includeArchived) queryParams.set('includeArchived', 'true');

      const res = await fetch(`/api/tenants/${tenantSlug}/locations?${queryParams.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to fetch locations');
      }

      setLocations(data.items || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantSlug) {
      fetchBrandsList();
      fetchLocations();
    }
  }, [tenantSlug, selectedBrandFilter, includeArchived]);

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);

    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: formBrandId,
          storeCode: formStoreCode,
          name: formName,
          addressLine1: formAddress,
          city: formCity,
          stateRegion: formState,
          postalCode: formPostal,
          countryCode: formCountry.toUpperCase(),
          timezone: formTz,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to create location');
      }

      setShowCreateModal(false);
      setFormStoreCode('');
      setFormName('');
      setFormAddress('');
      setFormCity('');
      setFormState('');
      setFormPostal('');
      fetchLocations();
    } catch (err) {
      setCreateError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (loc: LocationItem) => {
    setEditingLocation(loc);
    setFormBrandId(loc.brandId);
    setFormStoreCode(loc.storeCode);
    setFormName(loc.name);
    setFormAddress(loc.addressLine1);
    setFormCity(loc.city);
    setFormState(loc.stateRegion);
    setFormPostal(loc.postalCode);
    setFormCountry(loc.countryCode);
    setFormTz(loc.timezone);
    setEditError(null);
  };

  const handleUpdateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLocation) return;

    setEditError(null);
    setUpdating(true);

    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/locations/${editingLocation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeCode: formStoreCode,
          name: formName,
          addressLine1: formAddress,
          city: formCity,
          stateRegion: formState,
          postalCode: formPostal,
          countryCode: formCountry.toUpperCase(),
          timezone: formTz,
          version: editingLocation.version,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to update location');
      }

      setEditingLocation(null);
      fetchLocations();
    } catch (err) {
      setEditError((err as Error).message);
    } finally {
      setUpdating(false);
    }
  };

  const handleArchiveLocation = async (loc: LocationItem) => {
    const isArchiving = loc.status === 'ACTIVE';
    const confirmMessage = isArchiving
      ? `Are you sure you want to archive location "${loc.name}" (${loc.storeCode})?`
      : `Reactivate location "${loc.name}" (${loc.storeCode})?`;

    if (!confirm(confirmMessage)) return;

    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/locations/${loc.id}?version=${loc.version}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to change location status');
      }

      fetchLocations();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1>Location Directory</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Register store locations with validated ISO countries and IANA timezones.
          </p>
        </div>

        <button
          onClick={() => {
            setShowCreateModal(true);
            setCreateError(null);
          }}
          className="btn btn-primary"
          id="add-location-btn"
          disabled={brands.length === 0}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Location
        </button>
      </div>

      {brands.length === 0 && !loading && (
        <div className="alert alert-warning" role="alert" style={{ marginBottom: '1.5rem' }}>
          <span>Please create at least one Brand before adding physical locations.</span>
        </div>
      )}

      {error && (
        <div className="alert alert-danger" role="alert" style={{ marginBottom: '1.5rem' }}>
          <span>{error}</span>
        </div>
      )}

      {/* Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', gap: '0.75rem', flex: 1, maxWidth: '600px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search by store code, name, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchLocations()}
          />
          <select
            className="form-select"
            style={{ width: '200px' }}
            value={selectedBrandFilter}
            onChange={(e) => setSelectedBrandFilter(e.target.value)}
          >
            <option value="">All Brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <button onClick={fetchLocations} className="btn btn-secondary btn-sm">Filter</button>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
          />
          Include archived
        </label>
      </div>

      {/* Locations Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Store Code</th>
              <th>Location Name</th>
              <th>City / Region</th>
              <th>Country</th>
              <th>Timezone</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  Loading locations...
                </td>
              </tr>
            ) : locations.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No locations registered.
                </td>
              </tr>
            ) : (
              locations.map((loc) => (
                <tr key={loc.id}>
                  <td>
                    <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                      {loc.storeCode}
                    </code>
                  </td>
                  <td style={{ fontWeight: 600 }}>{loc.name}</td>
                  <td>{loc.city}, {loc.stateRegion}</td>
                  <td>
                    <span className="badge badge-neutral" style={{ fontFamily: 'var(--font-mono)' }}>
                      {loc.countryCode}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    {loc.timezone}
                  </td>
                  <td>
                    <span className={`badge ${loc.status === 'ACTIVE' ? 'badge-success' : 'badge-neutral'}`}>
                      {loc.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => openEditModal(loc)}
                        className="btn btn-secondary btn-sm"
                        id={`edit-loc-${loc.storeCode}`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleArchiveLocation(loc)}
                        className={`btn btn-sm ${loc.status === 'ACTIVE' ? 'btn-danger' : 'btn-secondary'}`}
                        id={`archive-loc-${loc.storeCode}`}
                      >
                        {loc.status === 'ACTIVE' ? 'Archive' : 'Restore'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Location Modal */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Add Location</h2>
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

            <form onSubmit={handleCreateLocation}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="new-loc-brand">Parent Brand</label>
                  <select
                    id="new-loc-brand"
                    className="form-select"
                    value={formBrandId}
                    onChange={(e) => setFormBrandId(e.target.value)}
                    required
                  >
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="new-loc-store-code">Store Code</label>
                  <input
                    id="new-loc-store-code"
                    type="text"
                    className="form-input"
                    placeholder="e.g. STR-101"
                    value={formStoreCode}
                    onChange={(e) => setFormStoreCode(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="new-loc-name">Location Display Name</label>
                <input
                  id="new-loc-name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Austin Downtown Flagship"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="new-loc-address">Street Address</label>
                <input
                  id="new-loc-address"
                  type="text"
                  className="form-input"
                  placeholder="e.g. 500 Congress Ave"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="new-loc-city">City</label>
                  <input
                    id="new-loc-city"
                    type="text"
                    className="form-input"
                    placeholder="Austin"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="new-loc-state">State / Region</label>
                  <input
                    id="new-loc-state"
                    type="text"
                    className="form-input"
                    placeholder="TX"
                    value={formState}
                    onChange={(e) => setFormState(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="new-loc-postal">Postal Code</label>
                  <input
                    id="new-loc-postal"
                    type="text"
                    className="form-input"
                    placeholder="78701"
                    value={formPostal}
                    onChange={(e) => setFormPostal(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="new-loc-country">Country Code (ISO)</label>
                  <input
                    id="new-loc-country"
                    type="text"
                    maxLength={2}
                    className="form-input"
                    placeholder="US"
                    value={formCountry}
                    onChange={(e) => setFormCountry(e.target.value.toUpperCase())}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="new-loc-tz">IANA Time Zone</label>
                  <input
                    id="new-loc-tz"
                    type="text"
                    className="form-input"
                    placeholder="America/Chicago"
                    value={formTz}
                    onChange={(e) => setFormTz(e.target.value)}
                    required
                  />
                </div>
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
                  id="submit-location-create-btn"
                >
                  {creating ? 'Creating...' : 'Save Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Location Modal */}
      {editingLocation && (
        <div className="modal-backdrop" onClick={() => setEditingLocation(null)}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Edit Location ({editingLocation.storeCode})</h2>
              <button
                onClick={() => setEditingLocation(null)}
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

            <form onSubmit={handleUpdateLocation}>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-loc-name">Display Name</label>
                <input
                  id="edit-loc-name"
                  type="text"
                  className="form-input"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="edit-loc-address">Street Address</label>
                <input
                  id="edit-loc-address"
                  type="text"
                  className="form-input"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-loc-city">City</label>
                  <input
                    id="edit-loc-city"
                    type="text"
                    className="form-input"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="edit-loc-state">State / Region</label>
                  <input
                    id="edit-loc-state"
                    type="text"
                    className="form-input"
                    value={formState}
                    onChange={(e) => setFormState(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="edit-loc-postal">Postal Code</label>
                  <input
                    id="edit-loc-postal"
                    type="text"
                    className="form-input"
                    value={formPostal}
                    onChange={(e) => setFormPostal(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-loc-country">Country Code (ISO)</label>
                  <input
                    id="edit-loc-country"
                    type="text"
                    maxLength={2}
                    className="form-input"
                    value={formCountry}
                    onChange={(e) => setFormCountry(e.target.value.toUpperCase())}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="edit-loc-tz">IANA Time Zone</label>
                  <input
                    id="edit-loc-tz"
                    type="text"
                    className="form-input"
                    value={formTz}
                    onChange={(e) => setFormTz(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                marginBottom: '1rem',
                padding: '0.5rem 0.75rem',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 'var(--radius-sm)',
              }}>
                Optimistic Concurrency Lock: Current Version v{editingLocation.version}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingLocation(null)}
                  disabled={updating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={updating}
                  id="submit-location-update-btn"
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
