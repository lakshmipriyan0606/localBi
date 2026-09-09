import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { prisma } from '@/shared/database/client';
import { InvitationsView } from '@/features/invitations/tenant/components/invitations-view';

export const metadata: Metadata = {
  title: 'Invitations — localBi',
  description: 'Manage and dispatch invitations to onboarding organization members',
};

export default async function InvitationsPage({
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

  // Prefetch active brands on server for brand scoping
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
    <InvitationsView
      tenantSlug={tenantSlug}
      brands={brands}
    />
  );
}
