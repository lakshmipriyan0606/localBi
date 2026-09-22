import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { TenantService } from '@/modules/tenancy/tenant-service';
import { TenantsDashboard } from '@/features/tenancy/components/tenants-dashboard';

export const metadata: Metadata = {
  title: 'Clients — localBi',
  description: 'Select or create an enterprise multi-client workspace',
};

export default async function TenantsPage() {
  const cookieStore = await cookies();
  const token = SessionCookieManager.getSessionToken(cookieStore);

  if (!token) {
    redirect('/login');
  }

  let user = null;
  try {
    const resolution = await ContextResolver.requireAuthenticatedUser(token);
    user = resolution.user;
  } catch {
    redirect('/login');
  }

  const tenants = await TenantService.listUserTenants(user.id);

  return (
    <TenantsDashboard
      initialTenants={tenants.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        role: t.role,
        plan: t.plan,
        timezone: t.timezone,
      }))}
      user={{
        email: user.email,
        fullName: user.fullName,
      }}
    />
  );
}
