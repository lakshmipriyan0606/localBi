'use client';

import React, { useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Settings,
  Save,
  CheckCircle2,
  AlertCircle,
  Code,
  Shield,
  Users,
  Link2,
  Globe,
  Sliders,
  ExternalLink,
} from 'lucide-react';

export default function WebsiteSettingsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantSlug = params.tenantSlug as string;
  const brandId = searchParams.get('brandId') || '';

  const [siteName, setSiteName] = useState('LocalBi Storefront');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [headerScripts, setHeaderScripts] = useState('<!-- Custom header analytics / tags -->');
  const [footerScripts, setFooterScripts] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [cookieConsent, setCookieConsent] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      // Simulate persisting website settings
      await new Promise((r) => setTimeout(r, 450));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              <Settings className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Website Preferences & Settings
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 ml-11">
            Configure site-wide metadata, tracking scripts, maintenance mode, and permissions.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer disabled:opacity-60"
        >
          {isSaving ? (
            <span>Saving...</span>
          ) : savedSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Saved!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Settings</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings Form */}
        <div className="lg:col-span-2 space-y-5">
          {/* Section 1: General Preferences */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              General Identity
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Website Display Name
                </label>
                <input
                  type="text"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Custom Favicon URL
                </label>
                <input
                  type="url"
                  placeholder="https://yourdomain.com/favicon.ico"
                  value={faviconUrl}
                  onChange={(e) => setFaviconUrl(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-indigo-600"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Custom Code & Tracking */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Custom Head & Body Code Injection
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Header Code (Injected before &lt;/head&gt;)
                </label>
                <textarea
                  rows={3}
                  value={headerScripts}
                  onChange={(e) => setHeaderScripts(e.target.value)}
                  placeholder="<script>/* Google Tag Manager or tracking code */</script>"
                  className="w-full font-mono text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 bg-slate-50 focus:bg-white focus:outline-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Footer Code (Injected before &lt;/body&gt;)
                </label>
                <textarea
                  rows={3}
                  value={footerScripts}
                  onChange={(e) => setFooterScripts(e.target.value)}
                  placeholder="<script>/* Live chat widget or conversion pixels */</script>"
                  className="w-full font-mono text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 bg-slate-50 focus:bg-white focus:outline-indigo-600"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Privacy & Status Toggles */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Site Availability & Compliance
            </h3>

            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <div>
                <div className="font-bold text-xs text-slate-900">Maintenance Mode</div>
                <div className="text-[11px] text-slate-500">
                  Temporarily show a friendly maintenance page to public visitors
                </div>
              </div>
              <input
                type="checkbox"
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <div>
                <div className="font-bold text-xs text-slate-900">Cookie Consent Banner</div>
                <div className="text-[11px] text-slate-500">
                  Display GDPR / CCPA compliant consent banner for first-time visitors
                </div>
              </div>
              <input
                type="checkbox"
                checked={cookieConsent}
                onChange={(e) => setCookieConsent(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Global LocalBi Modules Sidebar Cards */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-indigo-600" />
              <span>Platform Integrations</span>
            </h4>
            <p className="text-xs text-slate-500">
              Connect Google Business Profile, Google Search Console, and GA4 tracking keys.
            </p>
            <Link
              href={`/client/${tenantSlug}/integrations`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 pt-1"
            >
              <span>Manage Integrations</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Team & Permissions</span>
            </h4>
            <p className="text-xs text-slate-500">
              Control access for website editors, marketing managers, and client stakeholders.
            </p>
            <Link
              href={`/client/${tenantSlug}/team`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 pt-1"
            >
              <span>Manage Team Members</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
