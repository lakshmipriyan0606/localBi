import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from '@/features/auth/components/login-form';

export const metadata: Metadata = {
  title: 'Sign In — localBi',
  description: 'Sign in to manage your brands, locations and local-search performance.',
};

export default function LoginPage() {
  return (
    <div className="w-full space-y-7">
      {/* Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-7 space-y-1">
          <h1 className="text-[1.625rem] font-bold tracking-tight text-slate-900">
            Welcome back
          </h1>
          <p className="text-[14px] text-slate-500 leading-relaxed">
            Sign in to manage your brands, locations and local-search performance.
          </p>
        </div>
        <LoginForm />
      </div>

      {/* Supporting links */}
      <div className="text-center text-[13px] text-slate-500 space-y-1.5">
        <p>Onboarding is invitation-only.</p>
        <p>
          Need access recovery?{' '}
          <Link
            href="/forgot-password"
            className="font-semibold text-indigo-600 hover:text-indigo-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded"
          >
            Reset your password
          </Link>
        </p>
      </div>
    </div>
  );
}
