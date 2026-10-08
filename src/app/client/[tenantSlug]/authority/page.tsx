import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { resolveActiveBrandId } from '@/shared/utils/active-brand-resolver';
import { SeoAuthorityClientView } from './authority-client-view';

export const metadata: Metadata = {
  title: 'SEO Authority Intelligence — Backlinks & Citations — localBi',
  description: 'Evidence-first backlink intelligence, competitor referral gaps, and local business citation consistency',
};

export default async function AuthorityPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams?: Promise<{ brandId?: string }>;
}) {
  const { tenantSlug } = await params;
  const sp = searchParams ? await searchParams : {};
  const cookieStore = await cookies();
  const token = SessionCookieManager.getSessionToken(cookieStore);

  if (!token) {
    redirect('/login');
  }

  const { authorizedContext, tenant } = await ContextResolver.resolveTenantContext(
    token,
    tenantSlug
  );

  if (!authorizedContext || !tenant) {
    notFound();
  }

  // Fetch tenant brands, locations, and web surfaces
  const [brands, locations, surfaces] = await TenantContextService.withTenantContext(
    prisma,
    tenant.id,
    async (tx) => {
      const b = await tx.brand.findMany({
        where: { tenantId: tenant.id, isArchived: false },
        select: { id: true, name: true, slug: true },
        orderBy: { name: 'asc' },
      });

      const l = await tx.location.findMany({
        where: { tenantId: tenant.id, isClosed: false },
        select: { id: true, name: true, city: true, brandId: true },
        orderBy: { name: 'asc' },
      });

      const s = await tx.webSurface.findMany({
        where: { tenantId: tenant.id },
        select: {
          id: true,
          brandId: true,
          type: true,
          name: true,
          domains: {
            select: { hostname: true, isPrimary: true },
          },
        },
      });

      return [b, l, s];
    }
  );

  const safeSurfaces = surfaces.map((s) => ({
    id: s.id,
    brandId: s.brandId,
    surfaceType: s.type,
    subdomain: s.domains.find((d) => d.isPrimary)?.hostname || s.domains[0]?.hostname || s.name,
    customDomain: s.domains.find((d) => d.isPrimary)?.hostname || s.domains[0]?.hostname || s.name,
    originalUrl: null,
  }));

  const initialBrandId = resolveActiveBrandId(brands, tenant.slug, cookieStore, sp.brandId);

  return (
    <SeoAuthorityClientView
      tenantSlug={tenant.slug}
      brands={brands}
      locations={locations}
      surfaces={safeSurfaces}
      initialBrandId={initialBrandId}
      initialStoreId={locations[0]?.id || ''}
      initialSurfaceId={safeSurfaces[0]?.id || ''}
    />
  );
}
