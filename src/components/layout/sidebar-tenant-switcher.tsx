'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Building2, ChevronsUpDown, Check, Search, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AnalyticsLoader } from '@/components/ui/analytics-loader';
import { cn } from '@/lib/cn';
import { SafeTenantNavDto, AuthorizedTenantDto } from './sidebar-nav-config';
import { CreateTenantDialog } from '@/features/tenancy/components/create-tenant-dialog';
import { usePermissions } from '@/hooks/use-permissions';

interface SidebarTenantSwitcherProps {
  tenant: SafeTenantNavDto;
  userRole: string;
  tenants?: AuthorizedTenantDto[] | undefined;
  onNavigate?: (() => void) | undefined;
}

export function SidebarTenantSwitcher({ tenant, userRole, tenants, onNavigate }: SidebarTenantSwitcherProps) {
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
    if (onNavigate) onNavigate();
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
          'w-full text-left group flex items-center justify-between rounded-lg border px-2.5 py-2 transition-all cursor-pointer',
          open ? 'border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-500/20 shadow-xs' : 'border-slate-200 bg-slate-50/80 hover:border-indigo-300 hover:bg-indigo-50/50'
        )}
      >
        <div className="min-w-0 flex-1 pr-2">
          <div className="truncate text-xs font-semibold text-slate-900 group-hover:text-indigo-700">{tenant.name}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-slate-400 font-mono">/client/{tenant.slug}</span>
            <span className="text-[9px] text-slate-400 uppercase font-mono">• {tenant.plan}</span>
          </div>
        </div>
        <ChevronsUpDown className="h-4 w-4 text-slate-400 group-hover:text-slate-600 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-slate-200 bg-white p-2 shadow-xl animate-in fade-in-50 zoom-in-95">
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
                    <Building2 className={cn('h-3.5 w-3.5 flex-shrink-0', t.slug === tenant.slug ? 'text-indigo-600' : 'text-slate-400')} />
                    <span className="truncate">{t.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono ml-5">/client/{t.slug}</div>
                </div>
                {t.slug === tenant.slug ? <Check className="h-4 w-4 text-indigo-600 flex-shrink-0" /> : <Badge variant="outline" className="text-[9px] py-0 px-1 text-slate-400">Switch</Badge>}
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
