'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { SiteStudioShell } from '@/components/site-studio/site-studio-shell';

export default function SiteStudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // If inside visual builder, render full screen without outer sidebar
  if (pathname.includes('/builder/')) {
    return <div className="min-h-screen bg-slate-900">{children}</div>;
  }

  return <SiteStudioShell>{children}</SiteStudioShell>;
}
