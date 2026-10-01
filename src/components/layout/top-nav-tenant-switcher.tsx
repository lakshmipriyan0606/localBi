'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Building2, ChevronsUpDown, Check, Search, Plus } from 'lucide-react';
import { AnalyticsLoader } from '@/components/ui/analytics-loader';
import { cn } from '@/lib/cn';
import { SafeTenantNavDto, AuthorizedTenantDto } from './sidebar-nav-config';
import { CreateTenantDialog } from '@/features/tenancy/components/create-tenant-dialog';
import { usePermissions } from '@/hooks/use-permissions';

interface TopNavTenantSwitcherProps {
  tenant: SafeTenantNavDto;
  userRole: string;
  tenants?: AuthorizedTenantDto[] | undefined;
}

export function TopNavTenantSwitcher({ tenant, userRole, tenants }: TopNavTenantSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [switching, setSwitching] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { isPlatformSuperAdmin } = usePermissions(userRole);

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
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-colors cursor-pointer',
          open ? 'border-indigo-300 bg-indigo-50/70 text-indigo-700' : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100'
        )}
      >
        <Building2 className="h-3.5 w-3.5 text-slate-500" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Business:</span>
        <span className="text-[11px] font-semibold max-w-[120px] truncate text-slate-800">{tenant.name}</span>
        <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl animate-in fade-in-50 zoom-in-95">
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
          <div className="max-h-56 overflow-y-auto space-y-1">
            {filtered.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelect(t.slug, t.name)}
                className={cn('w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer', t.slug === tenant.slug ? 'bg-indigo-50 text-indigo-900 font-semibold' : 'text-slate-700 hover:bg-slate-100')}
              >
                <div className="truncate pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate">{t.name}</span>
                  </div>
                </div>
                {t.slug === tenant.slug ? <Check className="h-4 w-4 text-indigo-600 flex-shrink-0" /> : null}
              </button>
            ))}
          </div>

          {isPlatformSuperAdmin && (
            <div className="pt-1 mt-1 border-t border-slate-100">
              <CreateTenantDialog
                trigger={
                  <button
                    type="button"
                    className="flex w-full items-center justify-start rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer text-indigo-700 hover:bg-indigo-50 font-bold gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Create New Client
                  </button>
                }
                onSuccess={() => {
                  setOpen(false);
                  router.refresh();
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
