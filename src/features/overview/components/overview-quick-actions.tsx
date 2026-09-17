import Link from 'next/link';
import { Tag, MapPin, Users, Settings, ArrowRight } from 'lucide-react';

interface QuickActionsProps {
  tenantSlug: string;
  brandsCount: number;
  locationsCount: number;
  membersCount: number;
}

export function OverviewQuickActions({
  tenantSlug,
  brandsCount,
  locationsCount,
  membersCount,
}: QuickActionsProps) {
  const cards = [
    { label: 'Client Brands', count: brandsCount, sub: 'Registered brands', href: `/t/${tenantSlug}/brands`, icon: Tag, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Storefronts', count: locationsCount, sub: 'Physical branches', href: `/t/${tenantSlug}/locations`, icon: MapPin, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Team Members', count: membersCount, sub: 'Active collaborators', href: `/t/${tenantSlug}/team`, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Settings', count: null, sub: 'Profile & security', href: `/t/${tenantSlug}/settings`, icon: Settings, color: 'text-slate-600', bg: 'bg-slate-100' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Link
            key={c.label}
            href={c.href}
            className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs hover:border-indigo-300 transition-all group flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg ${c.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`h-4 w-4 ${c.color}`} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{c.label}</div>
                <div className="text-[11px] text-slate-400 font-medium">
                  {c.count !== null ? `${c.count} ${c.sub}` : c.sub}
                </div>
              </div>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
          </Link>
        );
      })}
    </div>
  );
}
