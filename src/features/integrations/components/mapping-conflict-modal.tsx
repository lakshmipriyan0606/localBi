'use client';

import React from 'react';
import { AlertTriangle, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface MappingConflictModalProps {
  open: boolean;
  resourceName: string;
  resourceType: string;
  currentBrandName: string;
  newBrandName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function MappingConflictModal({
  open,
  resourceName,
  resourceType,
  currentBrandName,
  newBrandName,
  onConfirm,
  onCancel,
}: MappingConflictModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in-50 duration-150">
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Reassign Google Resource?</h3>
              <p className="text-xs text-slate-500 mt-0.5">{resourceType}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/70 text-xs text-slate-700 space-y-2">
          <p className="font-semibold text-slate-900 truncate">{resourceName}</p>
          <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
            <span className="font-medium text-slate-500">Current:</span>
            <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200 truncate">
              {currentBrandName}
            </span>
            <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-500">New:</span>
            <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 truncate">
              {newBrandName}
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          This Google resource is already connected to <strong className="text-slate-900 font-bold">{currentBrandName}</strong>. 
          Reassigning will disconnect it from {currentBrandName} and link it to <strong className="text-slate-900 font-bold">{newBrandName}</strong>.
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-50"
          >
            Keep current mapping
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className="text-xs font-bold bg-[#3B49DF] hover:bg-indigo-700 text-white shadow-2xs"
          >
            Reassign to {newBrandName}
          </Button>
        </div>
      </div>
    </div>
  );
}
