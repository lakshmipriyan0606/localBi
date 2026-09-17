import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { ResourceMappingService } from '@/modules/integrations/resource-mapping-service';
import { IntegrationsManager } from '@/features/integrations/components/integrations-manager';
import { PageHeader } from '@/components/layout/page-header';

export const metadata: Metadata = {
  title: 'Google Integrations & Resource Mapping — localBi',
  description: 'Connect Google Business Profile (GBP) and Google Search Console (GSC) and map to internal brands and locations',
};

export default async function TenantIntegrationsPage({
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

  const { tenant, authorizedContext, user } = resolved;

  // Preload mapping state on server
  const mappingState = await ResourceMappingService.listTenantMappingState(
    tenant.id,
    authorizedContext
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Google Reporting Integrations"
        description={
          <>
            Authorize your Google account, discover Business Profile locations and Search Console
            properties, and establish verified reporting mappings for{' '}
            <strong className="text-slate-700 font-semibold">{tenant.name}</strong>.
          </>
        }
      />

      <IntegrationsManager
        tenantSlug={tenant.slug}
        tenantId={tenant.id}
        initialState={{
          connections: mappingState.connections.map((c) => ({
            id: c.id,
            provider: c.provider,
            externalEmail: c.externalEmail,
            createdAt: c.createdAt.toISOString(),
            lastUsedAt: c.lastUsedAt ? c.lastUsedAt.toISOString() : null,
          })),
          externalResources: mappingState.externalResources.map((r) => ({
            id: r.id,
            provider: r.provider,
            externalResourceId: r.externalResourceId,
            resourceType: r.resourceType as 'LOCATION' | 'PROPERTY',
            resourceName: r.resourceName,
            accountName: r.account.accountName,
          })),
          internalMappings: mappingState.internalMappings.map((m) => ({
            id: m.id,
            resourceId: m.resourceId,
            internalType: m.internalType as 'LOCATION' | 'BRAND',
            internalId: m.internalId,
            resourceName: m.resource.resourceName,
            externalResourceId: m.resource.externalResourceId,
            provider: m.resource.provider,
          })),
          brands: mappingState.brands,
          locations: mappingState.locations,
        }}
        userRole={user ? authorizedContext.role : 'VIEWER'}
      />
    </div>
  );
}
