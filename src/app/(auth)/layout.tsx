import React from 'react';
import { MapPin, Search, BarChart3, ShieldCheck, Building2 } from 'lucide-react';
import { LocalBiMark } from '@/components/brand/localbi-mark';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row bg-slate-50">
      {/* Left Column: Enterprise Local SEO Brand Visual (Desktop only) */}
      <aside className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-slate-900 p-12 text-white relative overflow-hidden">
        {/* Subtle grid pattern background */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
          aria-hidden="true"
        />

        {/* Top Branding */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
              <MapPin size={22} className="text-white" />
            </div>
            <div>
              <span className="text-2xl font-bold tracking-tight text-white leading-none">
                local<span className="text-indigo-400">Bi</span>
              </span>
              <span className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">
                Enterprise Multi-Tenant Local SEO
              </span>
            </div>
          </div>
        </div>

        {/* Center: Local SEO Concept & Multi-Location Visual */}
        <div className="relative z-10 max-w-lg space-y-8 my-auto py-12">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
              Unified intelligence for multi-location enterprise brands.
            </h1>
            <p className="text-slate-400 text-base leading-relaxed">
              Monitor search visibility, track localized performance across hundreds of branch stores, and protect client organization boundaries.
            </p>
          </div>

          {/* Local Search Architecture Pillars */}
          <div className="grid grid-cols-1 gap-4 pt-2">
            <div className="flex items-start gap-3.5 rounded-lg border border-slate-800 bg-slate-800/40 p-4 backdrop-blur-sm">
              <div className="rounded-md bg-indigo-500/10 p-2 text-indigo-400">
                <Building2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-200">
                  Tenant & Brand Hierarchy
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Strict cryptographic isolation with PostgreSQL Row-Level Security across organizations and branch scopes.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 rounded-lg border border-slate-800 bg-slate-800/40 p-4 backdrop-blur-sm">
              <div className="rounded-md bg-emerald-500/10 p-2 text-emerald-400">
                <Search className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-200">
                  Local Search Verification
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Accurate IANA timezone and ISO 3166 territory mapping designed for multi-store visibility analytics.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 rounded-lg border border-slate-800 bg-slate-800/40 p-4 backdrop-blur-sm">
              <div className="rounded-md bg-blue-500/10 p-2 text-blue-400">
                <BarChart3 className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-200">
                  Server-Revocable Sessions
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Opaque CSPRNG session tokens with instant single and all-device revocation controls.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Security Assurance */}
        <div className="relative z-10 flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="h-4 w-4 text-emerald-500" aria-hidden="true" />
          <span>RFC 9106 Argon2id • RLS Enforced • Zero Third-Party Tracker Cookies</span>
        </div>
      </aside>

      {/* Right Column: Interaction Form Viewport */}
      <main className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-8 md:px-12 lg:px-16 xl:px-24">
        {/* Mobile / Tablet Header */}
        <div className="mb-8 flex justify-center lg:hidden">
          <LocalBiMark size="md" />
        </div>

        <div className="mx-auto w-full max-w-[440px]">
          {children}
        </div>
      </main>
    </div>
  );
}
