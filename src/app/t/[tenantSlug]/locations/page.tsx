import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { prisma } from '@/shared/database/client';
import { LocationsView } from '@/features/locations/components/locations-view';

import { TenantContextService } from '@/shared/database/tenant-context';

export const metadata: Metadata = {
  title: 'Locations — localBi',
  description: 'Manage physical store branches, addresses, and timezones',
};

export default async function LocationsPage({
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

  const tenantId = resolved.tenant.id;

  // Fetch available brands directly on the server inside tenant context for RLS compliance
  const brands = await TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
    return tx.brand.findMany({
      where: {
        tenantId,
        isArchived: false,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  });

  return (
    <LocationsView
      tenantSlug={tenantSlug}
      brands={brands}
    />
  );
}
