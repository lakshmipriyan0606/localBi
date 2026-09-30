import { Check } from "lucide-react";

interface GoogleAccountCardProps {
  email: string;
  onChangeAccount: () => void;
}

export function GoogleAccountCard({ email, onChangeAccount }: GoogleAccountCardProps) {
  const initial = email.charAt(0).toUpperCase();

  return (
    <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200/70 p-4 shadow-sm mb-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xl shadow-sm">
          {initial}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
          <span className="font-bold text-slate-900 text-[15px]">{email}</span>
          <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-tight">
            <Check className="w-3 h-3 stroke-[3]" />
            Connected
          </div>
        </div>
      </div>
      <button
        onClick={onChangeAccount}
        className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 border border-indigo-200 hover:bg-indigo-50/50 bg-white px-4 py-2 rounded-lg transition-colors"
      >
        Change Account
      </button>
    </div>
  );
}
