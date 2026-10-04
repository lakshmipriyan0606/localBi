import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from '@/features/auth/components/login-form';

export const metadata: Metadata = {
  title: 'Sign In — localBi',
  description: 'Sign in to manage your brands, locations and local-search performance.',
};

export default function LoginPage() {
  return (
    <div className="w-full space-y-8">
      {/* Heading */}
      <div className="space-y-1.5">
        <h1 className="text-[1.75rem] font-bold tracking-tight text-slate-900">
          Sign in to localBi
        </h1>
        <p className="text-[14px] text-slate-500">
          One workspace. Every location.
        </p>
      </div>

      <LoginForm />

      {/* Supporting links */}
      <div className="space-y-2 text-center text-[13px] text-slate-400">
        <p>
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="font-semibold text-indigo-600 hover:text-indigo-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded"
          >
            Create a workspace
          </Link>
        </p>
        <p>
          Need access?{' '}
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
