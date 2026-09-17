import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import {
  MapPin,
  ArrowRight,
  BarChart3,
  Link2,
  MousePointerClick,
  Eye,
  PhoneCall,
  Navigation,
  Globe,
  CheckCircle2,
  Clock,
  Building2,
} from 'lucide-react';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { prisma } from '@/shared/database/client';
import { Badge } from '@/components/ui/badge';
import { TenantContextService } from '@/shared/database/tenant-context';
import { ReportingService } from '@/modules/reports/reporting-service';
import { PageHeader } from '@/components/layout/page-header';
import { formatNumber, formatDateRange } from '@/shared/lib/formatters';

export const metadata: Metadata = {
  title: 'Client Overview — localBi',
  description: 'Performance summary, connection readiness, and next actions',
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

  if (!resolved.tenant || !resolved.authorizedContext) {
    notFound();
  }

  const { tenant, authorizedContext } = resolved;

  // Preload overview data
  const {
    primaryBrand,
    brandsCount,
    locationsCount,
    membersCount,
    invitationsCount,
    googleConnection,
    mappedResourcesCount,
  } = await TenantContextService.withTenantContext(prisma, tenant.id, async (tx) => {
    const pBrand = await tx.brand.findFirst({
      where: { tenantId: tenant.id, isArchived: false },
      select: { id: true, name: true, slug: true },
    });

    const [bCount, lCount, mCount, iCount, gConn, mapCount] = await Promise.all([
      tx.brand.count({ where: { tenantId: tenant.id, isArchived: false } }),
      tx.location.count({ where: { tenantId: tenant.id, isArchived: false } }),
      tx.tenantMembership.count({ where: { tenantId: tenant.id, status: 'ACTIVE' } }),
      tx.invitation.count({
        where: {
          tenantId: tenant.id,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      }),
      tx.integrationConnection.findFirst({
        where: { tenantId: tenant.id, provider: 'GOOGLE', status: 'ACTIVE' },
      }),
      tx.internalResourceMapping.count({ where: { tenantId: tenant.id } }),
    ]);

    return {
      primaryBrand: pBrand,
      brandsCount: bCount,
      locationsCount: lCount,
      membersCount: mCount,
      invitationsCount: iCount,
      googleConnection: gConn,
      mappedResourcesCount: mapCount,
    };
  });

  // Calculate 30-day date window
  const today = new Date();
  const past30 = new Date();
  past30.setDate(today.getDate() - 30);
  const startDate = past30.toISOString().slice(0, 10);
  const endDate = today.toISOString().slice(0, 10);

  let performanceSummary = null;
  if (primaryBrand) {
    try {
      performanceSummary = await ReportingService.getPerformanceSummary({
        tenantId: tenant.id,
        brandId: primaryBrand.id,
        startDate,
        endDate,
        context: authorizedContext,
      });
    } catch {
      // Graceful fallback if metrics not yet seeded for brand
    }
  }

  const isConnected = Boolean(googleConnection);
  const isDataReady = isConnected && mappedResourcesCount > 0;

  return (
    <div className="space-y-8">
      {/* ── Page Header ── */}
      <PageHeader
        title={`${tenant.name} Overview`}
        description={
          <>
            Client performance metrics, Google data readiness, and actionable recommendations.
          </>
        }
        badge={
          <Badge
            className={
              isDataReady
                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                : isConnected
                ? 'bg-amber-100 text-amber-800 border-amber-200'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }
          >
            {isDataReady
              ? 'Data Ready & Syncing'
              : isConnected
              ? 'Connected (Mapping Needed)'
              : 'Setup Incomplete'}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/t/${tenant.slug}/reports`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Full Reports</span>
            </Link>
          </div>
        }
      />

      {/* ── Connection & Reporting Readiness Banner ── */}
      <div
        className={`p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs ${
          isDataReady
            ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
            : isConnected
            ? 'bg-amber-50/50 border-amber-200 text-amber-950'
            : 'bg-indigo-50/40 border-indigo-200 text-indigo-950'
        }`}
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
              isDataReady
                ? 'bg-emerald-100 text-emerald-700'
                : isConnected
                ? 'bg-amber-100 text-amber-700'
                : 'bg-indigo-100 text-indigo-700'
            }`}
          >
            {isDataReady ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : isConnected ? (
              <Clock className="h-5 w-5" />
            ) : (
              <Link2 className="h-5 w-5" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              {isDataReady
                ? 'Google Accounts Connected & Reporting Active'
                : isConnected
                ? 'Google Account Authorized — Complete Resource Mapping'
                : 'Connect Google Accounts to Enable Local Analytics'}
            </h3>
            <p className="text-xs text-slate-600 mt-0.5 max-w-2xl leading-relaxed">
              {isDataReady
                ? `Authorized as ${googleConnection?.externalEmail ?? 'Google Account'}. ${mappedResourcesCount} internal resources are mapped and streaming 30-day multi-grain search and maps data.`
                : isConnected
                ? `Account ${googleConnection?.externalEmail ?? 'Google Account'} authorized. Next: map your internal storefronts and brands to Google Business Profiles and Search Console.`
                : 'Link your Google Business Profile and Search Console accounts via OAuth 2.0 to begin monitoring brand visibility, call clicks, and search queries.'}
            </p>
          </div>
        </div>

        <Link
          href={`/t/${tenant.slug}/integrations`}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 rounded-lg text-xs font-semibold border border-slate-200 shadow-xs flex-shrink-0 transition-colors"
        >
          <span>{isDataReady ? 'Integration Settings' : 'Continue Setup'}</span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
        </Link>
      </div>

      {/* ── 30-Day Brand Performance Summary ── */}
      {performanceSummary ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                30-Day Performance Summary — {primaryBrand?.name}
              </h2>
            </div>
            <span className="text-xs text-slate-400">
              {formatDateRange(startDate, endDate)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Link
              href={`/t/${tenant.slug}/reports/gsc/queries?days=30&brandId=${primaryBrand?.id}`}
              className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-indigo-300 transition-all group"
            >
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Search Clicks</span>
                <MousePointerClick className="h-3.5 w-3.5 text-indigo-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">
                {formatNumber(performanceSummary.gsc.totalClicks)}
              </p>
              <span className="text-[11px] text-emerald-700 font-semibold mt-1 inline-block">
                +{performanceSummary.previousPeriod.clicksGrowthPercent}% vs prior
              </span>
            </Link>

            <Link
              href={`/t/${tenant.slug}/reports/gsc/queries?days=30&brandId=${primaryBrand?.id}&sortBy=impressions`}
              className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-indigo-300 transition-all group"
            >
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Search Impr.</span>
                <Eye className="h-3.5 w-3.5 text-indigo-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">
                {formatNumber(performanceSummary.gsc.totalImpressions)}
              </p>
              <span className="text-[11px] text-emerald-700 font-semibold mt-1 inline-block">
                +{performanceSummary.previousPeriod.impressionsGrowthPercent}% vs prior
              </span>
            </Link>

            <Link
              href={`/t/${tenant.slug}/reports/gbp/locations?days=30&brandId=${primaryBrand?.id}`}
              className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-teal-300 transition-all group"
            >
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Profile Views</span>
                <Globe className="h-3.5 w-3.5 text-teal-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">
                {formatNumber(performanceSummary.gbp.totalViews)}
              </p>
              <span className="text-[11px] text-slate-400 mt-1 inline-block">
                Search & Maps
              </span>
            </Link>

            <Link
              href={`/t/${tenant.slug}/reports/gbp/locations?days=30&brandId=${primaryBrand?.id}&sortBy=callClicks`}
              className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-blue-300 transition-all group"
            >
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Call Clicks</span>
                <PhoneCall className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">
                {formatNumber(performanceSummary.gbp.callClicks)}
              </p>
              <span className="text-[11px] text-slate-400 mt-1 inline-block">
                Profile call taps
              </span>
            </Link>

            <Link
              href={`/t/${tenant.slug}/reports/gbp/locations?days=30&brandId=${primaryBrand?.id}&sortBy=directionRequests`}
              className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-emerald-300 transition-all group"
            >
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Directions</span>
                <Navigation className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">
                {formatNumber(performanceSummary.gbp.directionRequests)}
              </p>
              <span className="text-[11px] text-slate-400 mt-1 inline-block">
                Maps route requests
              </span>
            </Link>
          </div>
        </section>
      ) : null}

      {/* ── Guided Next Actions ── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
          Recommended Next Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href={`/t/${tenant.slug}/reports/gsc/queries`}
            className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-indigo-300 hover:shadow-sm transition-all group"
          >
            <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <BarChart3 className="h-4 w-4" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 mb-1">Inspect Top Organic Queries</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Examine the specific keywords customers search on Google before clicking through to your site.
            </p>
            <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:text-indigo-800">
              <span>Open Queries Explorer</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </Link>

          <Link
            href={`/t/${tenant.slug}/reports/gbp/locations`}
            className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-teal-300 hover:shadow-sm transition-all group"
          >
            <div className="h-8 w-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 mb-3 group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <MapPin className="h-4 w-4" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 mb-1">Review Storefront Demand</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Compare customer calls, website visits, and navigation requests across all branch locations.
            </p>
            <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-teal-700 group-hover:text-teal-900">
              <span>View Locations Performance</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </Link>

          <Link
            href={`/t/${tenant.slug}/locations`}
            className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-blue-300 hover:shadow-sm transition-all group"
          >
            <div className="h-8 w-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Building2 className="h-4 w-4" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 mb-1">Manage Store Directory</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Register new storefront locations, verify postal addresses, and link Google Business Profiles.
            </p>
            <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:text-blue-800">
              <span>Open Location Directory</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </Link>
        </div>
      </section>

      {/* ── Administrative & Workspace Health ── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Organization & Administrative Health
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link
            href={`/t/${tenant.slug}/brands`}
            className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-slate-300 transition-all"
          >
            <span className="text-xs font-medium text-slate-500">Brands</span>
            <p className="text-xl font-bold text-slate-900 tabular-nums mt-1">{brandsCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Registered clients</p>
          </Link>

          <Link
            href={`/t/${tenant.slug}/locations`}
            className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-slate-300 transition-all"
          >
            <span className="text-xs font-medium text-slate-500">Locations</span>
            <p className="text-xl font-bold text-slate-900 tabular-nums mt-1">{locationsCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Store branches</p>
          </Link>

          <Link
            href={`/t/${tenant.slug}/team`}
            className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-slate-300 transition-all"
          >
            <span className="text-xs font-medium text-slate-500">Team Members</span>
            <p className="text-xl font-bold text-slate-900 tabular-nums mt-1">{membersCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Authorized users</p>
          </Link>

          <Link
            href={`/t/${tenant.slug}/invitations`}
            className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-slate-300 transition-all"
          >
            <span className="text-xs font-medium text-slate-500">Pending Invites</span>
            <p className="text-xl font-bold text-slate-900 tabular-nums mt-1">{invitationsCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Awaiting join</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
