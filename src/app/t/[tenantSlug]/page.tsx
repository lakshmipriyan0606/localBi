import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { Tag, MapPin, Users, Mail, Settings, ArrowRight } from 'lucide-react';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { prisma } from '@/shared/database/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Overview — localBi',
  description: 'Multi-tenant organization administrative overview and metrics',
};

export default async function WorkspaceOverviewPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const cookieStore = await cookies();
  const token = SessionCookieManager.getSessionToken(cookieStore);

  if (!token) {
    redirect('/login');
  }

  let resolved = null;
  try {
    resolved = await ContextResolver.resolveTenantContext(token, tenantSlug);
  } catch {
    redirect('/login');
  }

  if (!resolved.tenant) {
    notFound();
  }

  const tenant = resolved.tenant;

  // Execute aggregated counts securely on the server in parallel
  const [brandsCount, locationsCount, membersCount, invitationsCount] = await Promise.all([
    prisma.brand.count({ where: { tenantId: tenant.id } }),
    prisma.location.count({ where: { tenantId: tenant.id } }),
    prisma.tenantMembership.count({ where: { tenantId: tenant.id, status: 'ACTIVE' } }),
    prisma.invitation.count({
      where: {
        tenantId: tenant.id,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    }),
  ]);

  const kpis = [
    {
      title: 'Brands',
      value: brandsCount,
      description: 'Registered client brands',
      icon: Tag,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200/60',
    },
    {
      title: 'Locations',
      value: locationsCount,
      description: 'Active branch stores',
      icon: MapPin,
      color: 'text-blue-600 bg-blue-50 border-blue-200/60',
    },
    {
      title: 'Team Members',
      value: membersCount,
      description: 'Active scoped users',
      icon: Users,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200/60',
    },
    {
      title: 'Pending Invites',
      value: invitationsCount,
      description: 'Awaiting member acceptance',
      icon: Mail,
      color: 'text-amber-600 bg-amber-50 border-amber-200/60',
    },
  ];

  const modules = [
    {
      title: 'Brand Administration',
      description: 'Configure client brand identities, tenant-unique slugs, and scope access.',
      href: `/t/${tenant.slug}/brands`,
      icon: Tag,
      accent: 'text-indigo-600 bg-indigo-50',
    },
    {
      title: 'Location Directory',
      description: 'Register physical locations with store codes, ISO country codes, and IANA time zones.',
      href: `/t/${tenant.slug}/locations`,
      icon: MapPin,
      accent: 'text-blue-600 bg-blue-50',
    },
    {
      title: 'Team & Permissions',
      description: 'Assign granular roles and restrict access to specific brands or locations.',
      href: `/t/${tenant.slug}/team`,
      icon: Users,
      accent: 'text-emerald-600 bg-emerald-50',
    },
    {
      title: 'Settings & Active Sessions',
      description: 'Organization preferences, concurrency locking, and active device revocation.',
      href: `/t/${tenant.slug}/settings`,
      icon: Settings,
      accent: 'text-amber-600 bg-amber-50',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {tenant.name}
            </h1>
            <Badge variant="secondary" className="capitalize text-xs">
              {tenant.plan}
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            Real-time summary of multi-tenant administrative assets and access controls. Timezone: {tenant.timezone}.
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title} className="border-slate-200/80 shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {kpi.title}
                </CardTitle>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${kpi.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-slate-900">
                  {kpi.value}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {kpi.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Access Modules Grid */}
      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-4 tracking-tight">
          Administrative Modules
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.href}
                href={mod.href}
                className="group focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-xl"
              >
                <Card className="h-full border-slate-200/80 hover:border-indigo-400 hover:shadow-md transition-all duration-200 p-5">
                  <div className="flex items-start gap-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 transition-colors group-hover:bg-indigo-600 group-hover:text-white ${mod.accent}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {mod.title}
                        </h3>
                        <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {mod.description}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
