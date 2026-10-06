'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Compass,
  Plus,
  Trash2,
  Edit2,
  GripVertical,
  Save,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Link as LinkIcon,
  Layers,
} from 'lucide-react';
import { NavItem, SiteNavigationDto, NavItemType } from '@/modules/page-builder/navigation-service';

export default function SiteStudioNavigationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantSlug = params.tenantSlug as string;
  const brandId = searchParams.get('brandId');

  const [activeMenu, setActiveMenu] = useState<'header' | 'footer'>('header');
  const [navigation, setNavigation] = useState<SiteNavigationDto>({
    headerItems: [],
    footerItems: [],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active selected item for right column editor (Screen 6 reference)
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  useEffect(() => {
    async function loadNavigation() {
      try {
        setLoading(true);
        const url = brandId
          ? `/api/tenants/${tenantSlug}/website/navigation?brandId=${brandId}`
          : `/api/tenants/${tenantSlug}/website/navigation`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.success && data.navigation) {
          setNavigation(data.navigation);
          if (data.navigation.headerItems?.length > 0) {
            setEditingItemId(data.navigation.headerItems[0].id);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load navigation');
      } finally {
        setLoading(false);
      }
    }
    loadNavigation();
  }, [tenantSlug, brandId]);

  const currentItems = activeMenu === 'header' ? navigation.headerItems : navigation.footerItems;
  const activeItem = currentItems.find((i) => i.id === editingItemId) || currentItems[0] || null;

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSaveSuccess(false);

      const res = await fetch(`/api/tenants/${tenantSlug}/website/navigation`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId,
          ...navigation,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setNavigation(data.navigation);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setError(data.error || 'Failed to save navigation.');
      }
    } catch (err: any) {
      setError(err.message || 'Error saving navigation.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = () => {
    const newItem: NavItem = {
      id: `nav-${Date.now()}`,
      label: 'New Link',
      type: 'INTERNAL_PAGE',
      target: '/',
      order: currentItems.length,
      openInNewTab: false,
    };

    if (activeMenu === 'header') {
      setNavigation((prev) => ({
        ...prev,
        headerItems: [...prev.headerItems, newItem],
      }));
    } else {
      setNavigation((prev) => ({
        ...prev,
        footerItems: [...prev.footerItems, newItem],
      }));
    }
    setEditingItemId(newItem.id);
  };

  const handleRemoveItem = (id: string) => {
    if (activeMenu === 'header') {
      const remaining = navigation.headerItems.filter((i) => i.id !== id);
      setNavigation((prev) => ({ ...prev, headerItems: remaining }));
      if (editingItemId === id) setEditingItemId(remaining[0]?.id || null);
    } else {
      const remaining = navigation.footerItems.filter((i) => i.id !== id);
      setNavigation((prev) => ({ ...prev, footerItems: remaining }));
      if (editingItemId === id) setEditingItemId(remaining[0]?.id || null);
    }
  };

  const handleUpdateActiveItem = (updates: Partial<NavItem>) => {
    if (!activeItem) return;
    if (activeMenu === 'header') {
      setNavigation((prev) => ({
        ...prev,
        headerItems: prev.headerItems.map((i) =>
          i.id === activeItem.id ? { ...i, ...updates } : i
        ),
      }));
    } else {
      setNavigation((prev) => ({
        ...prev,
        footerItems: prev.footerItems.map((i) =>
          i.id === activeItem.id ? { ...i, ...updates } : i
        ),
      }));
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Compass className="w-4 h-4 text-indigo-600" />
            <span>Navigation</span>
          </h2>
          <p className="text-xs text-slate-500">
            Manage your website menu and footer links
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm shadow-indigo-600/30 transition-all disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Changes'}</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Navigation menus saved and published to live website.</span>
        </div>
      )}

      {/* ── 2-Column Split: Menus List & Edit Drawer (Screen 6 Reference) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (7 Cols): Items Tree */}
        <div className="lg:col-span-7 space-y-4">
          {/* Header vs Footer Menu Tabs */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl text-xs font-semibold text-slate-600 w-fit">
            <button
              type="button"
              onClick={() => {
                setActiveMenu('header');
                setEditingItemId(navigation.headerItems[0]?.id || null);
              }}
              className={`px-4 py-1.5 rounded-lg transition-all ${
                activeMenu === 'header' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              Header Menu
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveMenu('footer');
                setEditingItemId(navigation.footerItems[0]?.id || null);
              }}
              className={`px-4 py-1.5 rounded-lg transition-all ${
                activeMenu === 'footer' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              Footer Menu
            </button>
          </div>

          {/* List of items */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2 shadow-2xs">
            {currentItems.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No menu items found. Click "+ Add Menu Item" below to create one.
              </div>
            ) : (
              currentItems.map((item) => {
                const isSelected = activeItem?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setEditingItemId(item.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/50 border-indigo-400 ring-1 ring-indigo-400/30'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-slate-300" />
                      <div>
                        <div className="text-xs font-bold text-slate-900">{item.label}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.target}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {item.type.replace('_', ' ')}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveItem(item.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            <button
              type="button"
              onClick={handleAddItem}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30 text-indigo-600 font-bold text-xs transition-colors mt-3"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Menu Item</span>
            </button>
          </div>
        </div>

        {/* Right Column (5 Cols): Edit Menu Item Card (Screen 6 Reference) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-indigo-600" />
              <span>Edit Menu Item</span>
            </h3>

            {activeItem ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Menu Title
                  </label>
                  <input
                    type="text"
                    value={activeItem.label}
                    onChange={(e) => handleUpdateActiveItem({ label: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Link Type
                  </label>
                  <select
                    value={activeItem.type}
                    onChange={(e) =>
                      handleUpdateActiveItem({ type: e.target.value as NavItemType })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-hidden bg-white"
                  >
                    <option value="INTERNAL_PAGE">Internal Page</option>
                    <option value="PRODUCT">Product Page</option>
                    <option value="STORE">Location / Store</option>
                    <option value="CATEGORY">Category</option>
                    <option value="EXTERNAL_URL">External URL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Path / URL
                  </label>
                  <input
                    type="text"
                    value={activeItem.target}
                    onChange={(e) => handleUpdateActiveItem({ target: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
                    placeholder="/products"
                  />
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(activeItem.openInNewTab)}
                      onChange={(e) =>
                        handleUpdateActiveItem({ openInNewTab: e.target.checked })
                      }
                      className="rounded text-indigo-600 w-4 h-4 focus:ring-indigo-500"
                    />
                    <span>Open in new tab</span>
                  </label>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                Select an item on the left to edit its properties.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
