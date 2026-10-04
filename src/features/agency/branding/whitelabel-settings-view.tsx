'use client';

import React, { useState, useEffect } from 'react';
import {
  Palette,
  Globe,
  CheckCircle2,
  AlertCircle,
  Copy,
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  FileText,
  Sliders,
} from 'lucide-react';
import {
  useWhiteLabelQuery,
  useUpdateWhiteLabelMutation,
  usePortalDomainsQuery,
  useCreatePortalDomainMutation,
  useVerifyPortalDomainMutation,
  useDeletePortalDomainMutation,
} from '../hooks/use-agency';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

interface WhiteLabelSettingsViewProps {
  tenantSlug: string;
}

export function WhiteLabelSettingsView({ tenantSlug }: WhiteLabelSettingsViewProps) {
  const { data: config, isLoading, isError, error, refetch } = useWhiteLabelQuery(tenantSlug);
  const updateWhiteLabelMutation = useUpdateWhiteLabelMutation(tenantSlug);

  const { data: domains, isLoading: isLoadingDomains } = usePortalDomainsQuery(tenantSlug);
  const createDomainMutation = useCreatePortalDomainMutation(tenantSlug);
  const verifyDomainMutation = useVerifyPortalDomainMutation(tenantSlug);
  const deleteDomainMutation = useDeleteDomainMutation(tenantSlug);

  // Form states
  const [formData, setFormData] = useState({
    enabled: true,
    portalName: '',
    companyLegalName: '',
    logoUrl: '',
    faviconUrl: '',
    primaryColor: '#4F46E5',
    secondaryColor: '#0F172A',
    accentColor: '#10B981',
    supportEmail: '',
    supportUrl: '',
    hideLocalBiBranding: false,
  });

  const [newHostname, setNewHostname] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData({
        enabled: config.enabled ?? true,
        portalName: config.portalName || '',
        companyLegalName: config.companyLegalName || '',
        logoUrl: config.logoUrl || '',
        faviconUrl: config.faviconUrl || '',
        primaryColor: config.primaryColor || '#4F46E5',
        secondaryColor: config.secondaryColor || '#0F172A',
        accentColor: config.accentColor || '#10B981',
        supportEmail: config.supportEmail || '',
        supportUrl: config.supportUrl || '',
        hideLocalBiBranding: config.hideLocalBiBranding ?? false,
      });
    }
  }, [config]);

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateWhiteLabelMutation.mutateAsync({
      enabled: formData.enabled,
      portalName: formData.portalName.trim(),
      companyLegalName: formData.companyLegalName.trim() || null,
      logoUrl: formData.logoUrl.trim() || null,
      faviconUrl: formData.faviconUrl.trim() || null,
      primaryColor: formData.primaryColor,
      secondaryColor: formData.secondaryColor,
      accentColor: formData.accentColor,
      supportEmail: formData.supportEmail.trim() || null,
      supportUrl: formData.supportUrl.trim() || null,
      hideLocalBiBranding: formData.hideLocalBiBranding,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHostname.trim()) return;
    await createDomainMutation.mutateAsync(newHostname.trim().toLowerCase());
    setNewHostname('');
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(text);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="White-Label Portal & Domains"
        description="Brand the client portal with your agency logo, theme colors, and custom verified domain."
      />

      {isLoading ? (
        <div className="p-8 space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : isError ? (
        <ErrorState
          title="Failed to load white-label configuration"
          message={error?.message || 'Error communicating with branding service.'}
          onRetry={() => refetch()}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Branding Form (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-slate-200/80 shadow-sm">
              <CardHeader className="border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold text-slate-900">
                      Agency Portal Identity
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Configure your portal name, company information, and visual styling.
                    </CardDescription>
                  </div>
                  <Badge variant={formData.enabled ? 'emerald' : 'slate'}>
                    {formData.enabled ? 'White-Label Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSaveBranding} className="space-y-6">
                  {/* Enable Switch */}
                  <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
                    <div>
                      <span className="text-sm font-semibold text-slate-800">
                        Enable Custom White-Label Portal
                      </span>
                      <p className="text-xs text-slate-500">
                        When enabled, clients access your branded portal and see your logo and colors.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.enabled}
                      onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="portal-name">Portal / Agency Name *</Label>
                      <Input
                        id="portal-name"
                        placeholder="Apex Growth Agency"
                        value={formData.portalName}
                        onChange={(e) => setFormData({ ...formData, portalName: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="legal-name">Company Legal Name</Label>
                      <Input
                        id="legal-name"
                        placeholder="Apex Digital Media LLC"
                        value={formData.companyLegalName}
                        onChange={(e) => setFormData({ ...formData, companyLegalName: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Logo & Favicon */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="logo-url">Logo Image URL</Label>
                      <Input
                        id="logo-url"
                        placeholder="https://agency.com/logo.png"
                        value={formData.logoUrl}
                        onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                      />
                      {formData.logoUrl && (
                        <div className="p-2 border rounded-md bg-slate-50 mt-1 max-w-fit">
                          <img
                            src={formData.logoUrl}
                            alt="Logo preview"
                            className="h-6 max-w-[120px] object-contain"
                            onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="favicon-url">Favicon URL</Label>
                      <Input
                        id="favicon-url"
                        placeholder="https://agency.com/favicon.ico"
                        value={formData.faviconUrl}
                        onChange={(e) => setFormData({ ...formData, faviconUrl: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Theme Colors */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-slate-800">Theme Colors</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Primary Color */}
                      <div className="space-y-1.5 p-3 rounded-lg border border-slate-200">
                        <Label htmlFor="primary-color" className="text-xs text-slate-600">
                          Primary Brand Color
                        </Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            id="primary-color"
                            value={formData.primaryColor}
                            onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                            className="h-8 w-8 rounded cursor-pointer border-0 p-0"
                          />
                          <Input
                            value={formData.primaryColor}
                            onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                            className="h-8 text-xs font-mono"
                          />
                        </div>
                      </div>

                      {/* Secondary Color */}
                      <div className="space-y-1.5 p-3 rounded-lg border border-slate-200">
                        <Label htmlFor="secondary-color" className="text-xs text-slate-600">
                          Secondary Color
                        </Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            id="secondary-color"
                            value={formData.secondaryColor}
                            onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                            className="h-8 w-8 rounded cursor-pointer border-0 p-0"
                          />
                          <Input
                            value={formData.secondaryColor}
                            onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                            className="h-8 text-xs font-mono"
                          />
                        </div>
                      </div>

                      {/* Accent Color */}
                      <div className="space-y-1.5 p-3 rounded-lg border border-slate-200">
                        <Label htmlFor="accent-color" className="text-xs text-slate-600">
                          Accent Color
                        </Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            id="accent-color"
                            value={formData.accentColor}
                            onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                            className="h-8 w-8 rounded cursor-pointer border-0 p-0"
                          />
                          <Input
                            value={formData.accentColor}
                            onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                            className="h-8 text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Support Links */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="support-email">Agency Support Email</Label>
                      <Input
                        id="support-email"
                        type="email"
                        placeholder="support@agency.com"
                        value={formData.supportEmail}
                        onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="support-url">Support / Helpdesk URL</Label>
                      <Input
                        id="support-url"
                        placeholder="https://help.agency.com"
                        value={formData.supportUrl}
                        onChange={(e) => setFormData({ ...formData, supportUrl: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Hide localBi Branding */}
                  <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
                    <div>
                      <span className="text-sm font-semibold text-slate-800">
                        Remove "Powered by localBi" Badge
                      </span>
                      <p className="text-xs text-slate-500">
                        Eliminate all default platform branding from the client portal interface and exported executive reports.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.hideLocalBiBranding}
                      onChange={(e) => setFormData({ ...formData, hideLocalBiBranding: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    {saveSuccess && (
                      <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                        <CheckCircle2 className="h-4 w-4" />
                        White-label settings saved successfully.
                      </span>
                    )}
                    <Button
                      type="submit"
                      variant="primary"
                      className="ml-auto"
                      disabled={updateWhiteLabelMutation.isPending}
                    >
                      {updateWhiteLabelMutation.isPending ? 'Saving...' : 'Save Branding Settings'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* CUSTOM PORTAL DOMAINS SECTION */}
            <Card className="border-slate-200/80 shadow-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-indigo-600" />
                  <span>Custom Portal Domains</span>
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Map your own domain (e.g. clients.agency.com) so your clients log in directly through your branded domain.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Add domain form */}
                <form onSubmit={handleAddDomain} className="flex gap-3">
                  <Input
                    placeholder="portal.youragency.com"
                    value={newHostname}
                    onChange={(e) => setNewHostname(e.target.value)}
                    className="flex-1 text-xs"
                    required
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    className="gap-1.5 shrink-0"
                    disabled={createDomainMutation.isPending}
                  >
                    <Plus className="h-4 w-4" />
                    {createDomainMutation.isPending ? 'Adding...' : 'Add Domain'}
                  </Button>
                </form>

                {/* Domain list */}
                {isLoadingDomains ? (
                  <Skeleton className="h-20 w-full" />
                ) : !domains || domains.length === 0 ? (
                  <div className="p-6 text-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-500">
                    No custom portal domains configured yet. Add your domain above to begin verification.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {domains.map((dom) => (
                      <div
                        key={dom.id}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <Globe className="h-4 w-4 text-slate-500" />
                            <span className="font-semibold text-sm text-slate-900 font-mono">
                              {dom.hostname}
                            </span>
                            {dom.status === 'ACTIVE' && (
                              <Badge variant="emerald" className="text-[10px]">
                                Verified & Active
                              </Badge>
                            )}
                            {dom.status === 'PENDING' && (
                              <Badge variant="amber" className="text-[10px]">
                                DNS Pending
                              </Badge>
                            )}
                            {dom.status === 'FAILED' && (
                              <Badge variant="slate" className="text-[10px]">
                                Verification Failed
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {dom.status !== 'ACTIVE' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1.5"
                                onClick={() => verifyDomainMutation.mutate(dom.id)}
                                disabled={verifyDomainMutation.isPending}
                              >
                                <RefreshCw className={`h-3 w-3 ${verifyDomainMutation.isPending ? 'animate-spin' : ''}`} />
                                Verify DNS
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => deleteDomainMutation.mutate(dom.id)}
                              disabled={deleteDomainMutation.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* DNS Record instructions if pending */}
                        {dom.status !== 'ACTIVE' && (
                          <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-2 text-xs">
                            <span className="font-semibold text-slate-700">DNS Setup Instructions</span>
                            <p className="text-slate-500 text-[11px]">
                              Add the following TXT record to your DNS provider to prove domain ownership:
                            </p>
                            <div className="flex items-center justify-between p-2 rounded bg-slate-100 font-mono text-[11px] text-slate-800">
                              <span>localbi-verify={dom.verificationToken}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-[10px]"
                                onClick={() => handleCopy(`localbi-verify=${dom.verificationToken}`)}
                              >
                                {copiedToken === `localbi-verify=${dom.verificationToken}` ? (
                                  <span className="text-emerald-600">Copied!</span>
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Report & Portal Live Preview Sidebar (1 col) */}
          <div className="space-y-6">
            <Card className="border-slate-200/80 shadow-sm sticky top-6">
              <CardHeader className="border-b border-slate-100 pb-3">
                <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-600" />
                  <span>Report White-Label Preview</span>
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Live preview of executive report branding
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div
                  className="rounded-xl border border-slate-200 p-4 shadow-sm space-y-4 bg-white"
                  style={{
                    borderTop: `4px solid ${formData.primaryColor || '#4F46E5'}`,
                  }}
                >
                  {/* Report Header */}
                  <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {formData.portalName || 'Your Agency Name'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Executive Performance Audit
                      </div>
                    </div>
                    {formData.logoUrl ? (
                      <img
                        src={formData.logoUrl}
                        alt="Logo"
                        className="h-5 max-w-[80px] object-contain"
                        onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                      />
                    ) : (
                      <div
                        className="h-6 w-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold"
                        style={{ backgroundColor: formData.primaryColor || '#4F46E5' }}
                      >
                        {(formData.portalName || 'A').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Sample Metric Cards */}
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2 rounded bg-slate-50 border border-slate-100">
                      <div className="text-[10px] text-slate-400">Search Views</div>
                      <div
                        className="text-xs font-bold mt-0.5"
                        style={{ color: formData.primaryColor || '#4F46E5' }}
                      >
                        +24.8%
                      </div>
                    </div>
                    <div className="p-2 rounded bg-slate-50 border border-slate-100">
                      <div className="text-[10px] text-slate-400">Attributed Calls</div>
                      <div
                        className="text-xs font-bold mt-0.5"
                        style={{ color: formData.accentColor || '#10B981' }}
                      >
                        184 calls
                      </div>
                    </div>
                  </div>

                  {/* Footer Notice */}
                  <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 leading-tight">
                    {formData.hideLocalBiBranding ? (
                      <span>
                        Prepared exclusively by{' '}
                        <strong className="text-slate-600">
                          {formData.companyLegalName || formData.portalName || 'Your Agency'}
                        </strong>
                        .
                      </span>
                    ) : (
                      <span>
                        Prepared by{' '}
                        <strong className="text-slate-600">
                          {formData.companyLegalName || formData.portalName || 'Your Agency'}
                        </strong>{' '}
                        • Powered by localBi
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    Strict Metric Provenance Guarantee
                  </div>
                  <p>
                    All reporting metrics retain cryptographic source tags (GA4, GSC, GBP, TELEPHONY) ensuring verifiable data integrity while respecting your white-label styling.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
