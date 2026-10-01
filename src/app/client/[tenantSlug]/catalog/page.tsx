import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { CatalogView } from '@/features/catalog/components/catalog-view';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';

export const metadata: Metadata = {
  title: 'Catalog & Products — localBi',
  description: 'Manage brand categories, products, and store-specific catalog availability',
};

export default async function CatalogPage({
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

  const { tenantId } = resolved.authorizedContext;

  const { brands, stores } = await TenantContextService.withTenantContext(
    prisma,
    tenantId,
    async (tx) => {
      const [brandRows, storeRows] = await Promise.all([
        tx.brand.findMany({
          where: { tenantId },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
        tx.location.findMany({
          where: { tenantId },
          select: { id: true, name: true, brandId: true, city: true },
          orderBy: { name: 'asc' },
        }),
      ]);

      return { brands: brandRows, stores: storeRows };
    }
  );

  return <CatalogView tenantSlug={tenantSlug} brands={brands} stores={stores} />;
}
