'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Compass,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Save,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Link as LinkIcon,
} from 'lucide-react';
import { NavItem, SiteNavigationDto, NavItemType } from '@/modules/page-builder/navigation-service';

export default function SiteStudioNavigationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantSlug = params.tenantSlug as string;
  const brandId = searchParams.get('brandId');

  const [navigation, setNavigation] = useState<SiteNavigationDto>({
    headerItems: [],
    footerItems: [],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load navigation');
      } finally {
        setLoading(false);
      }
    }
    loadNavigation();
  }, [tenantSlug, brandId]);

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

  const addHeaderItem = () => {
    const newItem: NavItem = {
      id: `nav-${Date.now()}`,
      label: 'New Link',
      type: 'INTERNAL_PAGE',
      target: '/',
      order: navigation.headerItems.length,
      openInNewTab: false,
    };
    setNavigation({
      ...navigation,
      headerItems: [...navigation.headerItems, newItem],
    });
  };

  const addFooterItem = () => {
    const newItem: NavItem = {
      id: `nav-foot-${Date.now()}`,
      label: 'New Footer Link',
      type: 'INTERNAL_PAGE',
      target: '/',
      order: navigation.footerItems.length,
      openInNewTab: false,
    };
    setNavigation({
      ...navigation,
      footerItems: [...navigation.footerItems, newItem],
    });
  };

  const removeHeaderItem = (id: string) => {
    setNavigation({
      ...navigation,
      headerItems: navigation.headerItems.filter((i) => i.id !== id),
    });
  };

  const removeFooterItem = (id: string) => {
    setNavigation({
      ...navigation,
      footerItems: navigation.footerItems.filter((i) => i.id !== id),
    });
  };

  const updateHeaderItem = (id: string, updates: Partial<NavItem>) => {
    setNavigation({
      ...navigation,
      headerItems: navigation.headerItems.map((i) => (i.id === id ? { ...i, ...updates } : i)),
    });
  };

  const updateFooterItem = (id: string, updates: Partial<NavItem>) => {
    setNavigation({
      ...navigation,
      footerItems: navigation.footerItems.map((i) => (i.id === id ? { ...i, ...updates } : i)),
    });
  };

  const renderNavList = (
    items: NavItem[],
    onUpdate: (id: string, updates: Partial<NavItem>) => void,
    onRemove: (id: string) => void
  ) => {
    if (items.length === 0) {
      return (
        <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
          No navigation items configured. Add one below.
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs"
          >
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Label
                </label>
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => onUpdate(item.id, { label: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Link Type
                </label>
                <select
                  value={item.type}
                  onChange={(e) => onUpdate(item.id, { type: e.target.value as NavItemType })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden"
                >
                  <option value="INTERNAL_PAGE">Internal Page</option>
                  <option value="STORE">Store Profile</option>
                  <option value="CATEGORY">Product Category</option>
                  <option value="PRODUCT">Product Page</option>
                  <option value="EXTERNAL_URL">External Website</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Target Path / URL
                </label>
                <input
                  type="text"
                  value={item.target}
                  onChange={(e) => onUpdate(item.id, { target: e.target.value })}
                  placeholder={item.type === 'EXTERNAL_URL' ? 'https://...' : '/locations'}
                  className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 sm:pt-4">
              <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer pr-2">
                <input
                  type="checkbox"
                  checked={Boolean(item.openInNewTab)}
                  onChange={(e) => onUpdate(item.id, { openInNewTab: e.target.checked })}
                  className="rounded text-indigo-600"
                />
                <span>New Tab</span>
              </label>

              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                title="Remove link"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* ── Top Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Compass className="w-4 h-4 text-indigo-600" />
            <span>Website Navigation & Menus</span>
          </h2>
          <p className="text-xs text-slate-500">
            Configure header and footer links. Protocols are checked for safe execution.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Navigation'}</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Website menus saved and published to PageContext.</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Header Navigation Section ── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Header Primary Navigation</h3>
            <p className="text-xs text-slate-500">
              Links shown in the top navigation bar of every page.
            </p>
          </div>
          <button
            type="button"
            onClick={addHeaderItem}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Header Link</span>
          </button>
        </div>

        {renderNavList(navigation.headerItems, updateHeaderItem, removeHeaderItem)}
      </div>

      {/* ── Footer Navigation Section ── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Footer Secondary Navigation</h3>
            <p className="text-xs text-slate-500">
              Links shown in the site footer (legal, privacy, location finder).
            </p>
          </div>
          <button
            type="button"
            onClick={addFooterItem}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Footer Link</span>
          </button>
        </div>

        {renderNavList(navigation.footerItems, updateFooterItem, removeFooterItem)}
      </div>
    </div>
  );
}
