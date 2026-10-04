'use client';

import { useMemo } from 'react';

interface PasswordStrengthMeterProps {
  password: string;
}

interface StrengthResult {
  score: number;          // 0-4
  label: string;
  color: string;
  barColor: string;
  tips: string[];
}

function evaluatePasswordStrength(password: string): StrengthResult {
  if (!password) {
    return { score: 0, label: '', color: 'text-slate-400', barColor: 'bg-slate-200', tips: [] };
  }

  let score = 0;
  const tips: string[] = [];

  if (password.length >= 10) score++;
  else tips.push('Use at least 10 characters');

  if (password.length >= 14) score++;

  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  else tips.push('Mix uppercase and lowercase letters');

  if (/[\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?`~]/.test(password)) score++;
  else tips.push('Add a number or special character');

  const clampedScore = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;

  const labels: Record<number, string>   = { 0: 'Too short', 1: 'Weak', 2: 'Fair', 3: 'Strong', 4: 'Very strong' };
  const colors: Record<number, string>   = { 0: 'text-slate-400', 1: 'text-red-500', 2: 'text-amber-500', 3: 'text-emerald-500', 4: 'text-emerald-600' };
  const barColors: Record<number, string> = { 0: 'bg-slate-200', 1: 'bg-red-400', 2: 'bg-amber-400', 3: 'bg-emerald-400', 4: 'bg-emerald-500' };

  return {
    score: clampedScore,
    label: labels[clampedScore],
    color: colors[clampedScore],
    barColor: barColors[clampedScore],
    tips,
  };
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const strength = useMemo(() => evaluatePasswordStrength(password), [password]);

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1.5" aria-live="polite" aria-label="Password strength">
      {/* Bar segments */}
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((segment) => (
          <div
            key={segment}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              strength.score >= segment ? strength.barColor : 'bg-slate-200'
            }`}
          />
        ))}
      </div>

      {/* Label + tips */}
      <div className="flex items-start justify-between gap-2">
        <span className={`text-xs font-semibold ${strength.color}`}>
          {strength.label}
        </span>
        {strength.tips.length > 0 && (
          <span className="text-[11px] text-slate-400 text-right leading-tight">
            {strength.tips[0]}
          </span>
        )}
      </div>
    </div>
  );
}
