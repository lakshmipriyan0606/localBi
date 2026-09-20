import React from 'react';
import { MapPin, Search, ShieldCheck, Building2, TrendingUp } from 'lucide-react';
import { LocalBiMark } from '@/components/brand/localbi-mark';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row bg-[#F5F7FB]">
      {/* ── Left panel: enterprise brand & value proposition ── */}
      <aside
        className="hidden lg:flex lg:w-[45%] xl:w-2/5 flex-col justify-between bg-slate-900 relative overflow-hidden"
        aria-label="localBi product overview"
      >
        {/* Subtle dot-grid texture */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
          aria-hidden="true"
        />

        {/* Gradient fade at bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, rgba(15,23,42,0.6) 0%, transparent 100%)',
          }}
          aria-hidden="true"
        />

        {/* ── Top: Product brand ── */}
        <div className="relative z-10 px-10 pt-10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 shadow-md">
              <MapPin size={18} className="text-white" aria-hidden="true" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white leading-none">
                local<span className="text-indigo-400">Bi</span>
              </span>
              <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mt-0.5">
                Enterprise Local SEO
              </span>
            </div>
          </div>
        </div>

        {/* ── Center: Headline + feature pillars ── */}
        <div className="relative z-10 px-10 py-12 my-auto space-y-8 max-w-lg">
          <div className="space-y-3">
            <h1 className="text-[1.875rem] font-bold tracking-tight text-white leading-snug">
              Unified intelligence for multi-location brands.
            </h1>
            <p className="text-slate-400 text-[14px] leading-relaxed">
              Monitor search visibility, track localized performance and protect
              client data boundaries across every branch location.
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                icon: Building2,
                color: 'text-indigo-400',
                bg: 'bg-indigo-500/10',
                title: 'Manage Multiple Brands & Locations',
                detail:
                  'Organize hundreds of branch storefronts under distinct client brands with team-level access controls.',
              },
              {
                icon: Search,
                color: 'text-emerald-400',
                bg: 'bg-emerald-500/10',
                title: 'All Your Search Data in One Place',
                detail:
                  'Unified reporting across Google Business Profile and Google Search Console — side by side.',
              },
              {
                icon: TrendingUp,
                color: 'text-sky-400',
                bg: 'bg-sky-500/10',
                title: 'Understand What Customers Do',
                detail:
                  'Track calls, website visits, and direction requests per store location.',
              },
            ].map(({ icon: Icon, color, bg, title, detail }) => (
              <div
                key={title}
                className="flex items-start gap-3.5 rounded-xl border border-slate-800/80 bg-slate-800/30 p-4"
              >
                <div className={`rounded-lg ${bg} p-2 flex-shrink-0`}>
                  <Icon className={`h-4 w-4 ${color}`} aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-[13px] font-semibold text-slate-200">{title}</h2>
                  <p className="mt-0.5 text-[12px] text-slate-400 leading-relaxed">{detail}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Abstract sample UI preview */}
          <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-800/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Sample Interface Preview
              </span>
              <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                Trusted & Secure
              </span>
            </div>
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Google Business Profile & Search Console</span>
                <span className="font-semibold text-emerald-400">Connected</span>
              </div>
              <div className="h-1.5 w-full bg-slate-700/60 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full w-4/5" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom: Security assurance ── */}
        <div className="relative z-10 px-10 pb-10 flex items-center gap-2 text-[11px] text-slate-600">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" aria-hidden="true" />
          <span>Secure login · Your data stays private · No third-party tracking</span>
        </div>
      </aside>

      {/* ── Right panel: auth forms ── */}
      <main className="flex flex-1 flex-col items-center justify-center px-5 py-12 sm:px-10 lg:px-16 xl:px-20">
        {/* Mobile brand mark */}
        <div className="mb-8 lg:hidden">
          <LocalBiMark size="md" />
        </div>

        {/* Form container — constrained width for readability */}
        <div className="w-full max-w-[420px]">
          {children}
        </div>
      </main>
    </div>
  );
}
