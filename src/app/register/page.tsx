import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { SessionService } from '@/modules/auth/session-service';
import { RegistrationWizard } from '@/features/auth/components/registration-wizard';
import {
  BarChart2,
  Globe,
  MapPin,
  Star,
  Search,
  ShieldCheck,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Create Account — localBi',
  description:
    'Sign up for localBi — the enterprise local SEO platform for agencies and multi-location businesses. Manage Google Business Profile, Search Console, and web analytics in one workspace.',
};

const FEATURE_HIGHLIGHTS = [
  { icon: MapPin,    label: 'Multi-Location GBP',   desc: 'Manage Google Business Profiles across all your store locations' },
  { icon: Search,    label: 'Search Console',        desc: 'Track GSC impressions, clicks, and keyword rankings by location' },
  { icon: BarChart2, label: 'Web Analytics',         desc: 'GA4 analytics with surface-level hostname isolation' },
  { icon: Globe,     label: 'Local Microsites',      desc: 'Launch SEO-optimised storefronts for every location' },
  { icon: Star,      label: 'Review Management',     desc: 'Monitor and respond to Google reviews from a single dashboard' },
];

// Redirect if already authenticated
async function checkAlreadyAuthenticated() {
  const cookieStore = await cookies();
  const token = SessionCookieManager.getSessionToken(cookieStore);
  if (!token) return null;
  const session = await SessionService.resolveSession(token);
  return session;
}

export default async function RegisterPage() {
  const session = await checkAlreadyAuthenticated();
  if (session) {
    // User already logged in — redirect to login / workspace selection
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row bg-slate-50">

      {/* ── LEFT PANEL: Feature showcase ── */}
      <aside
        className="hidden lg:flex flex-col justify-between flex-1 px-12 py-14 xl:px-16 xl:py-16 relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #1e1b4b 0%, #312e81 40%, #4338ca 80%, #3730a3 100%)',
        }}
        aria-hidden="true"
      >
        {/* Decorative background blobs */}
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-violet-400/10 blur-3xl" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
            <MapPin size={18} className="text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white leading-none">
            local<span className="text-indigo-300">Bi</span>
          </span>
        </div>

        {/* Headline */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight tracking-tight">
              Everything local SEO,<br />
              <span className="text-indigo-300">in one platform.</span>
            </h1>
            <p className="mt-4 text-base text-indigo-200 leading-relaxed max-w-sm">
              Join agencies and businesses managing thousands of locations on localBi.
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-4">
            {FEATURE_HIGHLIGHTS.map(({ icon: Icon, label, desc }) => (
              <li key={label} className="flex items-start gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-4 w-4 text-indigo-200" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="text-[12px] text-indigo-300 leading-snug">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom trust badge */}
        <div className="relative z-10 flex items-center gap-1.5 text-[12px] text-indigo-300">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>SOC2-ready infrastructure · End-to-end encryption · PostgreSQL RLS</span>
        </div>
      </aside>

      {/* ── RIGHT PANEL: Registration wizard ── */}
      <main className="flex flex-1 flex-col items-center justify-start px-6 py-10 sm:px-10 bg-white lg:max-w-[560px] xl:max-w-[620px] flex-shrink-0 overflow-y-auto">

        {/* Mobile logo */}
        <div className="w-full max-w-[480px] mb-8 lg:hidden">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 shadow-md">
              <MapPin size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 leading-none">
              local<span className="text-indigo-600">Bi</span>
            </span>
          </div>
        </div>

        {/* Desktop logo (inside right panel) */}
        <div className="hidden lg:flex w-full max-w-[480px] mb-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 shadow-md">
              <MapPin size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 leading-none">
              local<span className="text-indigo-600">Bi</span>
            </span>
          </div>
        </div>

        {/* Registration wizard */}
        <div className="w-full max-w-[480px]">
          <RegistrationWizard />

          {/* Sign in link */}
          <p className="mt-8 text-center text-[13px] text-slate-400">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline underline-offset-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Security footer */}
        <div className="mt-10 flex items-center gap-1.5 text-[12px] text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Protected by enterprise-grade security</span>
        </div>
      </main>
    </div>
  );
}
