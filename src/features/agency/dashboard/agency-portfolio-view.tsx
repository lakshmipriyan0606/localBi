'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  Building2,
  Store,
  ShieldAlert,
  Search,
  ExternalLink,
  Plus,
  Palette,
  ShieldCheck,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useAgencyClientsQuery, usePortalDomainsQuery } from '../hooks/use-agency';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

interface AgencyPortfolioViewProps {
  tenantSlug: string;
}

export function AgencyPortfolioView({ tenantSlug }: AgencyPortfolioViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'>('ALL');

  const { data: clientsData, isLoading, isError, error, refetch } = useAgencyClientsQuery(tenantSlug, {
    pageSize: 50,
  });

  const { data: portalDomains } = usePortalDomainsQuery(tenantSlug);

  const clients = clientsData?.clients || [];

  const stats = useMemo(() => {
    const total = clients.length;
    const active = clients.filter((c) => c.status === 'ACTIVE').length;
    const suspended = clients.filter((c) => c.status === 'SUSPENDED').length;
    const archived = clients.filter((c) => c.status === 'ARCHIVED').length;
    const totalBrands = clients.reduce((acc, c) => acc + (c.brandCount || 0), 0);
    const totalStores = clients.reduce((acc, c) => acc + (c.storeCount || 0), 0);

    return { total, active, suspended, archived, totalBrands, totalStores };
  }, [clients]);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesSearch =
        !searchTerm ||
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.primaryContact && client.primaryContact.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (client.contactEmail && client.contactEmail.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || client.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [clients, searchTerm, statusFilter]);

  const pendingDomains = useMemo(() => {
    return (portalDomains || []).filter((d) => d.status === 'PENDING' || d.status === 'VERIFYING');
  }, [portalDomains]);

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header */}
      <PageHeader
        title="Agency Portfolio Dashboard"
        description="Unified agency overview across all managed client organizations, brand portfolios, and white-label custom domains."
        actions={
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" className="gap-2">
              <Link href={`/client/${tenantSlug}/agency/branding`}>
                <Palette className="h-4 w-4 text-purple-600" />
                Branding & Domains
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link href={`/client/${tenantSlug}/agency/entitlements`}>
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
                Feature Entitlements
              </Link>
            </Button>
            <Button asChild variant="primary" className="gap-2" id="create-client-btn">
              <Link href={`/client/${tenantSlug}/agency/clients?action=new`}>
                <Plus className="h-4 w-4" />
                New Client
              </Link>
            </Button>
          </div>
        }
      />

      {/* Attention / Alert Banners */}
      {(stats.suspended > 0 || pendingDomains.length > 0) && (
        <div className="space-y-3">
          {stats.suspended > 0 && (
            <div className="flex items-center justify-between p-4 rounded-xl border border-amber-200 bg-amber-50/80 text-amber-900 shadow-sm backdrop-blur">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <span className="font-semibold text-sm">
                    {stats.suspended} Client Account{stats.suspended > 1 ? 's are' : ' is'} currently suspended.
                  </span>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Suspended clients cannot access their portal, but all historical data and agency admin controls are preserved.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="bg-white/80 border-amber-300 text-amber-800 hover:bg-amber-100"
                onClick={() => setStatusFilter('SUSPENDED')}
              >
                View Suspended
              </Button>
            </div>
          )}

          {pendingDomains.length > 0 && (
            <div className="flex items-center justify-between p-4 rounded-xl border border-indigo-200 bg-indigo-50/80 text-indigo-900 shadow-sm backdrop-blur">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-indigo-600 shrink-0" />
                <div>
                  <span className="font-semibold text-sm">
                    {pendingDomains.length} Custom Portal Domain{pendingDomains.length > 1 ? 's' : ''} awaiting DNS verification.
                  </span>
                  <p className="text-xs text-indigo-700 mt-0.5">
                    Complete DNS CNAME/TXT verification to route clients to your white-labeled agency portal.
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="bg-white/80 border-indigo-300 text-indigo-800 hover:bg-indigo-100">
                <Link href={`/client/${tenantSlug}/agency/branding`}>
                  Verify Domains
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden border-slate-200/80 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Clients
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {isLoading ? <Skeleton className="h-8 w-16" /> : stats.active}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Out of {stats.total} total client account{stats.total === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-slate-200/80 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Managed Brands
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {isLoading ? <Skeleton className="h-8 w-16" /> : stats.totalBrands}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Active brands across client organizations
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-slate-200/80 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Locations & Stores
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Store className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {isLoading ? <Skeleton className="h-8 w-16" /> : stats.totalStores}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Physical retail & service locations managed
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-slate-200/80 shadow-sm hover:shadow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Suspended / Attention
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {isLoading ? <Skeleton className="h-8 w-16" /> : stats.suspended}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {stats.suspended === 0 ? 'All clients healthy and active' : 'Client accounts paused'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Portfolio Filter & Content */}
      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">
                Client Portfolio
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Overview of all accounts under this agency umbrella
              </CardDescription>
            </div>

            {/* Search & Filter Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search client or contact..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="flex rounded-lg border border-slate-200 bg-slate-50/50 p-1 text-xs">
                {(['ALL', 'ACTIVE', 'SUSPENDED', 'ARCHIVED'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1 rounded-md font-medium transition-all ${
                      statusFilter === status
                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : isError ? (
            <div className="p-8">
              <ErrorState
                title="Failed to load client portfolio"
                message={error?.message || 'Error communicating with agency service.'}
                onRetry={() => refetch()}
              />
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-900">
                {searchTerm || statusFilter !== 'ALL'
                  ? 'No clients match your filter'
                  : 'No client accounts configured yet'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchTerm || statusFilter !== 'ALL'
                  ? 'Try clearing the search input or changing the status filter.'
                  : 'Create your first client account to delegate access, assign brands, and deliver executive white-labeled dashboards.'}
              </p>
              {!searchTerm && statusFilter === 'ALL' && (
                <Button asChild variant="primary" size="sm" className="mt-4 gap-2">
                  <Link href={`/client/${tenantSlug}/agency/clients?action=new`}>
                    <Plus className="h-4 w-4" />
                    Create First Client Account
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-base shadow-sm shrink-0">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900">
                          {client.name}
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          /{client.slug}
                        </span>
                        {client.status === 'ACTIVE' && (
                          <Badge variant="emerald" className="text-[10px] px-2 py-0.5">
                            Active
                          </Badge>
                        )}
                        {client.status === 'SUSPENDED' && (
                          <Badge variant="amber" className="text-[10px] px-2 py-0.5">
                            Suspended
                          </Badge>
                        )}
                        {client.status === 'ARCHIVED' && (
                          <Badge variant="slate" className="text-[10px] px-2 py-0.5">
                            Archived
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                        {client.contactEmail && (
                          <span>Email: <strong className="text-slate-700 font-medium">{client.contactEmail}</strong></span>
                        )}
                        {client.primaryContact && (
                          <span>Contact: <strong className="text-slate-700 font-medium">{client.primaryContact}</strong></span>
                        )}
                        <span>Timezone: <strong className="text-slate-700 font-medium">{client.timezone}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 justify-between md:justify-end">
                    {/* Brands & Locations Badges */}
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium">
                        <Building2 className="h-3.5 w-3.5 text-slate-500" />
                        <span>{client.brandCount ?? 0} Brands</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium">
                        <Store className="h-3.5 w-3.5 text-slate-500" />
                        <span>{client.storeCount ?? 0} Stores</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
                        <Link href={`/client/${tenantSlug}/agency/clients?edit=${client.slug}`}>
                          Manage
                        </Link>
                      </Button>
                      <Button asChild variant="primary" size="sm" className="gap-1.5 text-xs">
                        <Link href={`/client/${tenantSlug}?client=${client.slug}`}>
                          <span>View Portal</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
