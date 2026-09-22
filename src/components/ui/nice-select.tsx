import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronsUpDown, Check, Search } from 'lucide-react';
import { cn } from '@/lib/cn';

interface NiceSelectOption {
  id: string;
  name: string;
}

interface NiceSelectProps {
  options: NiceSelectOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  icon?: React.ReactNode;
  placeholder?: string;
  className?: string;
  searchPlaceholder?: string;
}

export function NiceSelect({
  options,
  value,
  onChange,
  label,
  icon,
  placeholder = 'Select an option',
  className,
  searchPlaceholder = 'Search...',
}: NiceSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeOption = options.find((o) => o.id === value) || options[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.name.toLowerCase().includes(q));
  }, [options, search]);

  const selectOption = (id: string) => {
    setOpen(false);
    onChange(id);
  };

  return (
    <div className={cn("relative inline-block text-left flex-grow", className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-xs',
          open
            ? 'border-indigo-500 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-500/20'
            : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
        )}
      >
        {icon && <span className="flex-shrink-0 text-indigo-600">{icon}</span>}
        {label && <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>}
        <span className="flex-1 truncate font-bold text-slate-900 text-left">
          {activeOption?.name || placeholder}
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 mt-1.5 w-full min-w-[220px] rounded-xl border border-slate-200 bg-white p-2 shadow-lg ring-1 ring-black/5 z-50 animate-in fade-in-50 zoom-in-95 duration-100">
          {options.length > 4 && (
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-8 pr-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none"
                autoFocus
              />
            </div>
          )}
          
          <div className="max-h-56 overflow-y-auto space-y-0.5 mb-1 border-b border-slate-100 pb-1">
            {filtered.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => selectOption(o.id)}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer',
                  o.id === value ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-700 hover:bg-slate-50'
                )}
              >
                <span className="truncate">{o.name}</span>
                {o.id === value && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-2.5 py-2 text-xs text-slate-500 italic text-center">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
