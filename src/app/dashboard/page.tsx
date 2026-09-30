import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { TenantService } from '@/modules/tenancy/tenant-service';
import { CreateTenantDialog } from '@/features/tenancy/components/create-tenant-dialog';
import { LocalBiMark } from '@/components/brand/localbi-mark';
import { Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Dashboard — localBi',
  description: 'Manage your local SEO clients',
};

export default async function DashboardRedirectPage() {
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

  if (tenants.length > 0 && tenants[0]) {
    redirect(`/client/${tenants[0].slug}`);
  }

  // Fallback Empty State when user has 0 clients
  return (
    <div className="min-h-screen bg-[#F5F7FB] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-slate-200/90 bg-white px-4 sm:px-5 shadow-xs">
        <div className="flex items-center gap-2.5">
          <LocalBiMark size="sm" showLabel={false} />
          <div>
            <span className="font-bold tracking-tight text-slate-900 leading-none text-[15px]">
              local<span className="text-indigo-600">Bi</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4">
            <Building2 className="h-6 w-6 text-slate-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Welcome to localBi</h1>
          <p className="text-sm text-slate-500 mb-8">
            You don't have any clients yet. Create your first client workspace to get started.
          </p>
          
          <CreateTenantDialog
            trigger={
              <Button type="button" variant="primary" size="lg" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Create New Client
              </Button>
            }
          />
        </div>
      </main>
    </div>
  );
}
