'use client';

import React, { useState } from 'react';
import {
  X,
  Plus,
  Sparkles,
  Download,
  Search,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Building2,
} from 'lucide-react';
import { ScopedBrandDto, ScopedLocationDto } from '@/modules/reports/report-context-service';
import { notify } from '@/lib/notify';

interface KeywordManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantSlug: string;
  brandId: string;
  brands: ScopedBrandDto[];
  locations: ScopedLocationDto[];
  onKeywordAdded: () => Promise<void>;
}

export function KeywordManagementModal({
  isOpen,
  onClose,
  tenantSlug,
  brandId,
  brands,
  locations,
  onKeywordAdded,
}: KeywordManagementModalProps) {
  const [activeTab, setActiveTab] = useState<'MANUAL' | 'GBP' | 'GSC'>('MANUAL');
  const [term, setTerm] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState(locations[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [minImpressions, setMinImpressions] = useState(1);

  if (!isOpen) return null;

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTerm = term.trim();
    if (cleanTerm.length < 2) {
      notify.error('Keyword must be at least 2 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/rank/keywords`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          brandId,
          term: cleanTerm,
        }),
      });
      const data = await res.json();
      if (data.success && data.keyword) {
        // If a location is selected, assign it
        if (selectedLocationId) {
          await fetch(`/api/tenants/${tenantSlug}/rank/keywords`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'assign_store',
              keywordId: data.keyword.id,
              storeId: selectedLocationId,
            }),
          });
        }
        notify.success(`Keyword "${cleanTerm}" added successfully.`);
        setTerm('');
        await onKeywordAdded();
        onClose();
      } else {
        notify.error(data.error || 'Failed to add keyword.');
      }
    } catch (err: unknown) {
      notify.error(err instanceof Error ? err.message : 'Error creating keyword.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportFromGbp = async () => {
    if (!selectedLocationId) {
      notify.error('Select a store location first.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/rank/keywords`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import_gbp',
          brandId,
          locationId: selectedLocationId,
          minSearches: minImpressions,
        }),
      });
      const data = await res.json();
      if (data.success) {
        notify.success(`Imported ${data.importedCount} search keywords from Google Business Profile!`);
        await onKeywordAdded();
        onClose();
      } else {
        notify.error(data.error || 'No customer search keywords eligible for import.');
      }
    } catch (err: unknown) {
      notify.error(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeBrandName = brands.find((b) => b.id === brandId)?.name || 'Active Brand';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-emerald-500" />
              Manage Tracked Keywords
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Add target search terms to track for <strong>{activeBrandName}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('MANUAL')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'MANUAL'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Manual Keyword
          </button>
          <button
            onClick={() => setActiveTab('GBP')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'GBP'
                ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Sparkles className="h-3 w-3 text-teal-500" /> Import from GBP
          </button>
        </div>

        {/* Tab 1: Manual Addition */}
        {activeTab === 'MANUAL' && (
          <form onSubmit={handleManualAdd} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Keyword or Query
              </label>
              <input
                type="text"
                placeholder="e.g. coffee shop near me, best dental clinic"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Keywords are automatically normalized (spaces collapsed, lowercased) for deterministic tracking.
              </p>
            </div>

            {/* Optional Store Location Assignment */}
            {locations.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assign to Store Location (Optional)
                </label>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">None (Brand-wide tracking only)</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.city || 'Store'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!term.trim() || isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm disabled:opacity-50 transition"
              >
                {isSubmitting ? 'Saving...' : 'Add Keyword'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: GBP Import */}
        {activeTab === 'GBP' && (
          <div className="space-y-4">
            <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800/60 text-xs text-teal-800 dark:text-teal-200 space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-teal-500" /> Discovered Customer Searches
              </span>
              <p className="text-[11px] leading-relaxed">
                Import queries that actual customers used on Google Search and Google Maps to find and view your Google Business Profile listing.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Source Store Location
              </label>
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.city || 'Store'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Minimum Search Impressions
              </label>
              <input
                type="number"
                min={1}
                value={minImpressions}
                onChange={(e) => setMinImpressions(parseInt(e.target.value, 10) || 1)}
                className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportFromGbp}
                disabled={!selectedLocationId || isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg shadow-sm disabled:opacity-50 transition"
              >
                {isSubmitting ? 'Importing...' : 'Import Customer Terms'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
