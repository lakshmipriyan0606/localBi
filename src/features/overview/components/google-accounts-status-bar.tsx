'use client';

import Link from 'next/link';
import { CheckCircle2, ArrowRight } from 'lucide-react';

interface GoogleAccountsStatusBarProps {
  tenantSlug: string;
  email?: string;
  locationsCount?: number;
}

function GoogleGIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.57.38-2.27V6.58H1.25A11.95 11.95 0 0 0 0 12c0 1.92.46 3.74 1.25 5.42l4.03-3.15Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
      />
    </svg>
  );
}

export function GoogleAccountsStatusBar({
  tenantSlug,
  email = 'operator@abcdental.com',
  locationsCount = 3,
}: GoogleAccountsStatusBarProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 px-4 py-2.5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <GoogleGIcon />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[13px] font-bold text-slate-900 leading-none">
              Google Accounts Connected & Reporting Active
            </h3>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 truncate">
            Authorized as {email} • {locationsCount} locations connected • Search, Maps and Profile data syncing every 24 hours.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0 self-end sm:self-auto">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/70 rounded-full px-2.5 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          All Systems Operational
        </span>

        <Link
          href={`/t/${tenantSlug}/integrations`}
          className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
        >
          <span>Manage Integrations</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
