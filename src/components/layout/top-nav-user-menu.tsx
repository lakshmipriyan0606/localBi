'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { browserClient } from '@/lib/http/browser-client';

export interface UserMenuProps {
  user: {
    id: string;
    email: string;
    fullName?: string | null | undefined;
    role: string;
  };
}

export function TopNavUserMenu({ user }: UserMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = (user.fullName || user.email.slice(0, 2))
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = async () => {
    try {
      await browserClient.post('/auth/logout');
    } finally {
      router.push('/login');
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white text-xs font-bold tracking-wider hover:ring-2 hover:ring-indigo-500/30 transition-all cursor-pointer"
        aria-label="User profile menu"
      >
        <span>{initials}</span>
        <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg ring-1 ring-black/5 z-50 animate-in fade-in-50 zoom-in-95 duration-100">
          <div className="px-3 py-2 border-b border-slate-100">
            <div className="text-xs font-bold text-slate-900 truncate">{user.fullName || user.email}</div>
            <div className="text-[11px] text-slate-500 font-mono truncate">{user.email}</div>
            <div className="text-[10px] font-semibold text-indigo-600 uppercase mt-0.5">{user.role}</div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 mt-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-medium transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
