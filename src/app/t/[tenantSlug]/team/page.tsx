import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { prisma } from '@/shared/database/client';
import { TeamView } from '@/features/team/components/team-view';

export const metadata: Metadata = {
  title: 'Team & Permissions — localBi',
  description: 'Manage members, assign granular roles, and configure brand scopes',
};

export default async function TeamPage({
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

  // Prefetch active brands on server for restricted scope assignment
  const brands = await prisma.brand.findMany({
    where: {
      tenantId: resolved.tenant.id,
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

  return (
    <TeamView
      tenantSlug={tenantSlug}
      brands={brands}
    />
  );
}
