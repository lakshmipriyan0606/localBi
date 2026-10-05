import Link from 'next/link';
import type { Metadata } from 'next';
import { GoBackButton } from '@/components/ui/go-back-button';

export const metadata: Metadata = {
  title: 'Page Not Found — localBi',
  description: 'The page you are looking for could not be found.',
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F5F7FB] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Subtle background blobs */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-32 -right-32 w-[400px] h-[400px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #0ea5e9 0%, transparent 70%)' }}
        />
        {/* Dot grid texture */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #64748b 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      {/* Main card */}
      <div className="relative z-10 w-full max-w-lg text-center">

        {/* Brand mark */}
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 shadow-md shadow-indigo-200">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white"
              aria-hidden="true"
            >
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 font-sans">
            local<span className="text-indigo-500">Bi</span>
          </span>
        </div>

        {/* Giant 404 */}
        <div className="relative inline-block mb-6">
          <span
            className="text-[9rem] font-extrabold leading-none tracking-tighter select-none"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 45%, #c7d2fe 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
            aria-hidden="true"
          >
            404
          </span>
          {/* Glow behind number */}
          <div
            className="absolute inset-0 blur-3xl opacity-20 -z-10 rounded-full"
            style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)' }}
            aria-hidden="true"
          />
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight font-sans">
          Page not found
        </h1>
        <p className="text-sm text-slate-500 leading-relaxed mb-10 max-w-sm mx-auto font-sans">
          This page doesn&apos;t exist or may have been moved.
          Go back to your dashboard to continue working.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            id="not-found-go-home-btn"
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold rounded-xl shadow-sm shadow-indigo-200/60 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Go to Dashboard
          </Link>

          <GoBackButton />
        </div>

        {/* Bottom help text */}
        <div className="mt-12 pt-8 border-t border-slate-200/80">
          <p className="text-xs text-slate-400 font-sans">
            Need help?{' '}
            <Link
              href="/dashboard"
              className="text-indigo-500 hover:text-indigo-600 font-medium underline underline-offset-2 transition-colors"
            >
              View all your workspaces
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
