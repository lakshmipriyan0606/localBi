'use client';

import { useState, useEffect, useRef, useId } from 'react';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface SlugAvailabilityInputProps {
  value: string;
  onChange: (value: string) => void;
  onAvailabilityChange?: (available: boolean | null) => void;
  error?: string;
  id?: string;
}

type AvailabilityState = 'idle' | 'checking' | 'available' | 'unavailable';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function SlugAvailabilityInput({
  value,
  onChange,
  onAvailabilityChange,
  error,
  id: idProp,
}: SlugAvailabilityInputProps) {
  const generatedId = useId();
  const inputId = idProp || `slug-input-${generatedId}`;

  const [availability, setAvailability] = useState<AvailabilityState>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!value || value.length < 2) {
      setAvailability('idle');
      onAvailabilityChange?.(null);
      return;
    }

    setAvailability('checking');

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-slug?slug=${encodeURIComponent(value)}`);
        if (!res.ok) {
          setAvailability('idle');
          return;
        }
        const data = await res.json();
        const isAvailable = data.available === true;
        setAvailability(isAvailable ? 'available' : 'unavailable');
        onAvailabilityChange?.(isAvailable);
      } catch {
        setAvailability('idle');
        onAvailabilityChange?.(null);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, onAvailabilityChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const clean = slugify(raw);
    onChange(clean);
  };

  const iconClass = 'h-4 w-4 flex-shrink-0';
  const icon =
    availability === 'checking'   ? <Loader2 className={`${iconClass} text-indigo-400 animate-spin`} /> :
    availability === 'available'  ? <CheckCircle2 className={`${iconClass} text-emerald-500`} /> :
    availability === 'unavailable'? <XCircle className={`${iconClass} text-red-400`} /> : null;

  const borderClass =
    error                          ? 'border-red-300 focus-within:ring-red-200' :
    availability === 'available'  ? 'border-emerald-400 focus-within:ring-emerald-100' :
    availability === 'unavailable'? 'border-red-300 focus-within:ring-red-100' :
                                    'border-slate-200 focus-within:ring-indigo-100';

  return (
    <div>
      <div
        className={`flex items-center gap-2 rounded-lg border bg-white px-3 py-2.5 transition-shadow focus-within:ring-2 ${borderClass}`}
      >
        <span className="text-[13px] text-slate-400 select-none whitespace-nowrap">localbi.app/client/</span>
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={handleChange}
          placeholder="your-workspace"
          className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-300 font-mono"
          maxLength={63}
          autoComplete="off"
          spellCheck={false}
        />
        {icon && <div className="ml-1">{icon}</div>}
      </div>

      {/* Status message */}
      <div className="mt-1 min-h-[16px]">
        {error && (
          <p className="text-[11px] text-red-500">{error}</p>
        )}
        {!error && availability === 'available' && (
          <p className="text-[11px] text-emerald-600 font-medium">✓ Available — great choice!</p>
        )}
        {!error && availability === 'unavailable' && (
          <p className="text-[11px] text-red-500">That workspace name is already taken</p>
        )}
        {!error && availability === 'idle' && value && value.length < 2 && (
          <p className="text-[11px] text-slate-400">Must be at least 2 characters</p>
        )}
      </div>
    </div>
  );
}
