import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoginForm } from '@/features/auth/components/login-form';

export const metadata: Metadata = {
  title: 'Sign In — localBi',
  description: 'Sign in to manage your brands, locations and local-search performance',
};

export default function LoginPage() {
  return (
    <div className="w-full space-y-6">
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="space-y-2 pb-6">
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back
          </CardTitle>
          <CardDescription className="text-sm text-slate-500 leading-relaxed">
            Sign in to manage your brands, locations and local-search performance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>

      {/* Quiet supporting text */}
      <div className="text-center text-xs text-slate-500 space-y-1">
        <p>Onboarding is invitation-driven.</p>
        <p>
          Need access recovery?{' '}
          <Link
            href="/forgot-password"
            className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded"
          >
            Reset your password
          </Link>
        </p>
      </div>
    </div>
  );
}
