'use client';

import React from 'react';
import { X } from 'lucide-react';
import { LocalBiMark } from '@/components/brand/localbi-mark';

interface WebsiteStudioMobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function WebsiteStudioMobileDrawer({
  isOpen,
  onClose,
  children,
}: WebsiteStudioMobileDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-50 flex">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity animate-in fade-in-50 duration-200"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Drawer content */}
      <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-50 animate-in slide-in-from-left duration-200 border-r border-slate-200">
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <LocalBiMark size="sm" showLabel={false} />
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900 text-[14px]">
                local<span className="text-indigo-600">Bi</span>
              </span>
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                Studio
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation drawer"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
