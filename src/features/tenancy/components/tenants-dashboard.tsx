'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight, LogOut, Building2 } from 'lucide-react';
import { CreateTenantDialog } from './create-tenant-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { LocalBiMark } from '@/components/brand/localbi-mark';
import { browserClient } from '@/lib/http/browser-client';

export interface TenantCardDto {
  id: string;
  name: string;
  slug: string;
  role?: string | undefined;
  plan?: string | undefined;
  timezone?: string | undefined;
}

interface TenantsDashboardProps {
  initialTenants: TenantCardDto[];
  user: {
    email: string;
    fullName?: string | null | undefined;
  };
}

export function TenantsDashboard({ initialTenants, user }: TenantsDashboardProps) {
  const router = useRouter();
  const [tenants] = useState<TenantCardDto[]>(initialTenants);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const filteredTenants = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await browserClient.post('/auth/logout');
    } finally {
      router.push('/login');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FB] flex flex-col">
      {/* Top Application Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <LocalBiMark size="sm" />

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-slate-900 leading-tight">
                {user.fullName || user.email.split('@')[0]}
              </div>
              <div className="text-[11px] text-slate-400 leading-tight">{user.email}</div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              disabled={isLoggingOut}
              id="sign-out-btn"
              className="text-slate-600 hover:text-slate-900"
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-[1400px] mx-auto w-full px-4 sm:px-8 py-10 flex-1">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Clients
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Select an authorized client workspace to manage brand locations and search performance.
            </p>
          </div>

          <CreateTenantDialog />
        </div>

        {/* Search Bar when tenants exist */}
        {tenants.length > 0 && (
          <div className="relative max-w-sm mb-6">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
              aria-label="Filter clients"
            />
          </div>
        )}

        {/* Tenant Cards Grid or Empty State */}
        {tenants.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No clients found"
            description="You do not currently belong to any active clients. Create your first client workspace to start managing local search."
            action={<CreateTenantDialog />}
          />
        ) : filteredTenants.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matching clients"
            description={`No client matching "${searchQuery}" was found. Try clearing your search filter.`}
            action={
              <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                Clear filter
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTenants.map((tenant) => (
              <Link
                key={tenant.id}
                href={`/client/${tenant.slug}`}
                className="group focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-xl"
              >
                <Card className="h-full transition-all duration-200 border-slate-200/90 hover:border-indigo-400 hover:shadow-md flex flex-col justify-between">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                        <Building2 className="h-4 w-4" />
                      </div>
                      {tenant.role && (
                        <Badge variant="secondary" className="capitalize text-[11px]">
                          {tenant.role.replace(/_/g, ' ').toLowerCase()}
                        </Badge>
                      )}
                    </div>

                    <CardTitle className="text-base font-bold text-slate-900 mt-3 group-hover:text-indigo-600 transition-colors">
                      {tenant.name}
                    </CardTitle>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      /client/{tenant.slug}
                    </p>
                  </CardHeader>

                  <CardContent className="py-0 flex-1">
                    {tenant.plan && (
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span>{tenant.plan} plan</span>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
                    <span>Open client workspace</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
