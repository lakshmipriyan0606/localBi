import React from 'react';
import Image from 'next/image';
import { MapPin, ShieldCheck } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row">

      {/* ── LEFT PANEL: Image ── */}
      <aside
        className="hidden lg:block flex-1 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #EEF0FF 0%, #E8EAF8 50%, #EDF0FF 100%)' }}
        aria-hidden="true"
      >
        {/* Inner inset wrapper — gives the image breathing room from edges */}
        <div className="absolute inset-6 xl:inset-10">
          <Image
            src="/login.png"
            alt="localBi platform overview — Business Profile, Search Console, Web Analytics"
            fill
            className="object-contain object-center"
            priority
            sizes="(min-width: 1024px) 55vw, 0px"
          />
        </div>
      </aside>

      {/* ── RIGHT PANEL: Logo + Form + Security footer ── */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 sm:px-10 bg-white lg:max-w-[480px] xl:max-w-[520px] flex-shrink-0">

        {/* Logo */}
        <div className="w-full max-w-[380px] mb-10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 shadow-md">
              <MapPin size={18} className="text-white" aria-hidden="true" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 leading-none">
              local<span className="text-indigo-600">Bi</span>
            </span>
          </div>
        </div>

        {/* Form slot */}
        <div className="w-full max-w-[380px]">
          {children}
        </div>

        {/* Security footer */}
        <div className="mt-10 flex items-center gap-1.5 text-[12px] text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
          <span>Protected by enterprise-grade security</span>
        </div>
      </main>

    </div>
  );
}

