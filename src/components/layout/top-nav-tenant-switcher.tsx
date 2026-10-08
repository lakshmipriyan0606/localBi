'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Building2, ChevronsUpDown, Check, Search, Plus, Tag } from 'lucide-react';
import { AnalyticsLoader } from '@/components/ui/analytics-loader';
import { cn } from '@/lib/cn';
import { SafeTenantNavDto, AuthorizedTenantDto } from './sidebar-nav-config';
import { CreateTenantDialog } from '@/features/tenancy/components/create-tenant-dialog';
import { BrandCreateDialog } from '@/features/brands/components/brand-create-dialog';
import { usePermissions } from '@/hooks/use-permissions';
import { Action } from '@/shared/authorization/roles';
import { BrandOption } from './top-nav-brand-selector';
import { useBrandsQuery } from '@/features/brands/hooks/use-brands';

interface TopNavTenantSwitcherProps {
  tenant: SafeTenantNavDto;
  userRole: string;
  tenants?: AuthorizedTenantDto[] | undefined;
  brands?: BrandOption[] | undefined;
}

export function TopNavTenantSwitcher({
  tenant,
  userRole,
  tenants,
  brands: initialBrands = [],
}: TopNavTenantSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [switching, setSwitching] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { isPlatformSuperAdmin, can } = usePermissions(userRole);

  const canCreateClient =
    isPlatformSuperAdmin ||
    can(Action.CLIENT_CREATE) ||
    userRole === 'CLIENT_OWNER' ||
    userRole === 'AGENCY_OWNER' ||
    userRole === 'AGENCY_ADMIN';

  // Live brand query for current tenant
  const { data: brandData } = useBrandsQuery(tenant.slug, { includeArchived: false });
  const liveBrands = useMemo(() => {
    if (brandData?.items && Array.isArray(brandData.items) && brandData.items.length > 0) {
      return brandData.items.map((b) => ({ id: b.id, name: b.name, slug: b.slug }));
    }
    return initialBrands;
  }, [brandData?.items, initialBrands]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const tenantList = useMemo(() => {
    if (tenants && tenants.length > 0) return tenants;
    return [{ id: tenant.id, name: tenant.name, slug: tenant.slug, plan: tenant.plan, role: userRole }];
  }, [tenants, tenant, userRole]);

  const filtered = useMemo(() => {
    if (!search.trim()) return tenantList;
    const q = search.toLowerCase();
    return tenantList.filter((t) => t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q));
  }, [tenantList, search]);

  const handleSelect = (slug: string, name: string) => {
    setOpen(false);
    if (slug !== tenant.slug) {
      setSwitching(name);
      const prefix = `/client/${tenant.slug}`;
      const targetUrl = pathname.startsWith(prefix) ? `/client/${slug}${pathname.slice(prefix.length)}` : `/client/${slug}`;
      router.push(targetUrl);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {switching && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl max-w-sm w-full mx-4">
            <AnalyticsLoader variant="hero" message={`Switching to ${switching}...`} />
          </div>
        </div>
      )}
      <button
        type="button"
        id="top-nav-business-button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer shadow-2xs text-xs font-semibold',
          open ? 'border-indigo-500 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-500/20' : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
        )}
      >
        <Building2 className="h-3.5 w-3.5 text-indigo-600 flex-shrink-0" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Business:</span>
        <span className="text-xs font-bold max-w-[130px] sm:max-w-[160px] truncate text-slate-900">{tenant.name}</span>
        <ChevronsUpDown className="h-3 w-3 text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-xl animate-in fade-in-50 zoom-in-95">
          <div className="px-2 py-1 mb-1 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Businesses / Clients
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {tenantList.length} {tenantList.length === 1 ? 'account' : 'accounts'}
            </span>
          </div>

          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter clients..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-indigo-600"
              autoFocus
            />
          </div>

          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {filtered.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelect(t.slug, t.name)}
                className={cn(
                  'w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer',
                  t.slug === tenant.slug ? 'bg-indigo-50 text-indigo-900 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                )}
              >
                <div className="truncate pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate">{t.name}</span>
                  </div>
                </div>
                {t.slug === tenant.slug ? <Check className="h-3.5 w-3.5 text-indigo-600 flex-shrink-0" /> : null}
              </button>
            ))}
          </div>

          {/* Brands list under currently active business */}
          {liveBrands && liveBrands.length > 0 && (
            <div className="pt-2 mt-2 border-t border-slate-100">
              <div className="px-2 pb-1.5 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Brands in {tenant.name}
                </span>
                <Link
                  href={`/client/${tenant.slug}/brands`}
                  onClick={() => setOpen(false)}
                  className="text-[10px] text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-0.5"
                >
                  Manage
                </Link>
              </div>
              <div className="space-y-0.5 max-h-28 overflow-y-auto px-0.5">
                {liveBrands.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-slate-700 bg-slate-50/80 hover:bg-indigo-50/50 transition-colors"
                  >
                    <Tag className="h-3 w-3 text-indigo-500 shrink-0" />
                    <span className="truncate flex-1 font-medium">{b.name}</span>
                    <span className="text-[9px] text-slate-400 font-mono">Brand</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons to add Client or Brand */}
          <div className="pt-2 mt-2 border-t border-slate-100 space-y-1">
            {canCreateClient && (
              <CreateTenantDialog
                trigger={
                  <button
                    type="button"
                    className="flex w-full items-center justify-start rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer text-indigo-700 hover:bg-indigo-50 font-bold gap-2"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add New Business / Client
                  </button>
                }
                onSuccess={() => {
                  setOpen(false);
                  router.refresh();
                }}
              />
            )}
            <BrandCreateDialog
              tenantSlug={tenant.slug}
              triggerTitle="Add Brand to this Business"
              triggerVariant="ghost"
              triggerClassName="flex w-full items-center justify-start rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer text-slate-600 hover:text-indigo-700 hover:bg-slate-50 font-medium border-none shadow-none h-auto gap-2"
              onSuccess={() => {
                setOpen(false);
                router.refresh();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
