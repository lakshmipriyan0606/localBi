'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Globe, Layers, ArrowLeftRight, Check, AlertCircle } from 'lucide-react';

export interface WebSurfaceOption {
  id: string;
  brandId: string;
  type: 'LOCALBI' | 'ORIGINAL';
  name: string;
  hostname?: string | null;
  hasGa4Mapping?: boolean;
}

export interface SurfaceSelectorProps {
  surfaces: WebSurfaceOption[];
  currentSurfaceId?: string | undefined;
  currentMode: 'LOCALBI' | 'ORIGINAL' | 'COMPARE';
  originalHasMapping?: boolean;
  onSurfaceChange?: (surfaceId: string, mode: 'LOCALBI' | 'ORIGINAL' | 'COMPARE') => void;
}

export function SurfaceSelector({
  surfaces,
  currentSurfaceId: _currentSurfaceId,
  currentMode = 'LOCALBI',
  originalHasMapping = true,
  onSurfaceChange,
}: SurfaceSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const localBiSurface = surfaces.find((s) => s.type === 'LOCALBI');
  const originalSurface = surfaces.find((s) => s.type === 'ORIGINAL');

  const handleSelectMode = (newMode: 'LOCALBI' | 'ORIGINAL' | 'COMPARE', targetSurfaceId?: string) => {
    if (onSurfaceChange && targetSurfaceId) {
      onSurfaceChange(targetSurfaceId, newMode);
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('mode', newMode);
    if (targetSurfaceId) {
      nextParams.set('webSurfaceId', targetSurfaceId);
    } else {
      nextParams.delete('webSurfaceId');
    }

    router.push(`${pathname}?${nextParams.toString()}`);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 shadow-2xs">
      <div className="flex items-center gap-2 px-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        <Layers className="w-3.5 h-3.5 text-indigo-500" />
        <span>Web Surface:</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {/* LOCALBI MICROSITE BUTTON (DEFAULT) */}
        <button
          type="button"
          onClick={() => handleSelectMode('LOCALBI', localBiSurface?.id)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            currentMode === 'LOCALBI'
              ? 'bg-indigo-600 text-white shadow-2xs ring-2 ring-indigo-500/20'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>LocalBi Microsite</span>
          {localBiSurface?.hostname && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                currentMode === 'LOCALBI'
                  ? 'bg-indigo-700/60 text-indigo-100'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {localBiSurface.hostname}
            </span>
          )}
          {currentMode === 'LOCALBI' && <Check className="w-3 h-3 ml-0.5" />}
        </button>

        {/* ORIGINAL WEBSITE BUTTON */}
        <button
          type="button"
          onClick={() => handleSelectMode('ORIGINAL', originalSurface?.id)}
          disabled={!originalHasMapping}
          title={!originalHasMapping ? 'Original website analytics not connected' : undefined}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            !originalHasMapping
              ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800/40 text-slate-400 border border-dashed border-slate-300 dark:border-slate-700'
              : currentMode === 'ORIGINAL'
              ? 'bg-indigo-600 text-white shadow-2xs ring-2 ring-indigo-500/20'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Original Website</span>
          {originalSurface?.hostname && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                currentMode === 'ORIGINAL'
                  ? 'bg-indigo-700/60 text-indigo-100'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {originalSurface.hostname}
            </span>
          )}
          {!originalHasMapping && (
            <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
              <AlertCircle className="w-3 h-3" />
              Not connected
            </span>
          )}
          {currentMode === 'ORIGINAL' && <Check className="w-3 h-3 ml-0.5" />}
        </button>

        {/* COMPARE BOTH BUTTON */}
        <button
          type="button"
          onClick={() => handleSelectMode('COMPARE')}
          disabled={!originalHasMapping}
          title={!originalHasMapping ? 'Requires connected Original website' : undefined}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            !originalHasMapping
              ? 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-800/40 text-slate-400'
              : currentMode === 'COMPARE'
              ? 'bg-emerald-600 text-white shadow-2xs ring-2 ring-emerald-500/20'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          <span>Compare Both</span>
          {currentMode === 'COMPARE' && <Check className="w-3 h-3 ml-0.5" />}
        </button>
      </div>
    </div>
  );
}
