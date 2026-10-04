'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowRight, ArrowLeft, CheckCircle2, Loader2, Globe } from 'lucide-react';
import { PasswordStrengthMeter } from './password-strength-meter';
import { SlugAvailabilityInput } from './slug-availability-input';



const TIMEZONES = [
  { value: 'Asia/Kolkata',       label: 'India — IST (UTC+5:30)' },
  { value: 'America/New_York',   label: 'US East — EST/EDT' },
  { value: 'America/Chicago',    label: 'US Central — CST/CDT' },
  { value: 'America/Denver',     label: 'US Mountain — MST/MDT' },
  { value: 'America/Los_Angeles',label: 'US Pacific — PST/PDT' },
  { value: 'Europe/London',      label: 'UK — GMT/BST' },
  { value: 'Europe/Paris',       label: 'Central Europe — CET/CEST' },
  { value: 'Europe/Berlin',      label: 'Germany — CET/CEST' },
  { value: 'Asia/Dubai',         label: 'UAE — GST (UTC+4)' },
  { value: 'Asia/Singapore',     label: 'Singapore — SGT (UTC+8)' },
  { value: 'Asia/Tokyo',         label: 'Japan — JST (UTC+9)' },
  { value: 'Australia/Sydney',   label: 'Australia East — AEST/AEDT' },
  { value: 'Pacific/Auckland',   label: 'New Zealand — NZST/NZDT' },
  { value: 'UTC',                label: 'UTC — Coordinated Universal Time' },
];

const INDUSTRIES = [
  { value: '',              label: 'Select your industry…' },
  { value: 'RESTAURANT',   label: 'Food & Restaurant' },
  { value: 'HEALTHCARE',   label: 'Healthcare & Medical' },
  { value: 'RETAIL',       label: 'Retail & E-Commerce' },
  { value: 'REAL_ESTATE',  label: 'Real Estate' },
  { value: 'AUTOMOTIVE',   label: 'Automotive' },
  { value: 'FITNESS',      label: 'Fitness & Wellness' },
  { value: 'LEGAL',        label: 'Legal & Professional Services' },
  { value: 'EDUCATION',    label: 'Education & Training' },
  { value: 'HOSPITALITY',  label: 'Hospitality & Travel' },
  { value: 'FINANCIAL',    label: 'Financial Services' },
  { value: 'AGENCY',       label: 'Marketing Agency' },
  { value: 'OTHER',        label: 'Other' },
];

interface FormState {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  workspaceName: string;
  workspaceSlug: string;
  timezone: string;
  industry: string;
}

type Step = 1 | 2 | 3;

const STEP_TITLES: Record<Step, string> = {
  1: 'Create your account',
  2: 'Set up your workspace',
  3: 'Review & launch',
};

function slugify(v: string) {
  return v.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const getBrowserTimezone = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; }
};

export function RegistrationWizard() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const [form, setForm] = useState<FormState>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    workspaceName: '',
    workspaceSlug: '',
    timezone: getBrowserTimezone(),
    industry: '',
  });

  const update = useCallback((field: keyof FormState, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Auto-derive slug from workspace name on step 2
      if (field === 'workspaceName') {
        const derived = slugify(value);
        next.workspaceSlug = derived;
      }
      return next;
    });
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    setServerError(null);
  }, []);

  // ── Validation per step ────────────────────────────────────────────────────
  const validateStep1 = (): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.fullName.trim() || form.fullName.trim().length < 2)
      errs.fullName = 'Full name must be at least 2 characters';
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
      errs.email = 'Enter a valid email address';
    if (form.password.length < 10)
      errs.password = 'Password must be at least 10 characters';
    if (!/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/[\d!@#$%^&*]/.test(form.password))
      errs.password = errs.password || 'Must include uppercase, lowercase, and a number or symbol';
    if (form.password !== form.confirmPassword)
      errs.confirmPassword = 'Passwords do not match';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.workspaceName.trim() || form.workspaceName.trim().length < 2)
      errs.workspaceName = 'Workspace name must be at least 2 characters';
    if (!form.workspaceSlug || form.workspaceSlug.length < 2)
      errs.workspaceSlug = 'Workspace slug must be at least 2 characters';
    if (slugAvailable === false)
      errs.workspaceSlug = 'This workspace name is already taken';
    if (slugAvailable === null && form.workspaceSlug.length >= 2)
      errs.workspaceSlug = 'Wait for availability check to complete';
    if (!form.timezone)
      errs.timezone = 'Select a timezone';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep((s) => Math.min(s + 1, 3) as Step);
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 1) as Step);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setServerError(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          workspaceName: form.workspaceName.trim(),
          workspaceSlug: form.workspaceSlug,
          timezone: form.timezone,
          industry: form.industry || undefined,
          plan: 'DIRECT_CLIENT',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setServerError(data.error || 'Registration failed. Please try again.');
        return;
      }

      // Redirect to workspace
      router.push(`/client/${data.tenantSlug}`);
    } catch {
      setServerError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Progress bar ───────────────────────────────────────────────────────────
  const progress = ((step - 1) / 2) * 100;

  // ── Render step content ────────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            {/* Full name */}
            <div>
              <label htmlFor="reg-full-name" className="block text-sm font-medium text-slate-700 mb-1.5">
                Full name
              </label>
              <input
                id="reg-full-name"
                type="text"
                autoComplete="name"
                value={form.fullName}
                onChange={(e) => update('fullName', e.target.value)}
                placeholder="Jane Smith"
                className={`w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-indigo-200 ${
                  fieldErrors.fullName ? 'border-red-300' : 'border-slate-200 focus:border-indigo-400'
                }`}
              />
              {fieldErrors.fullName && <p className="mt-1 text-[11px] text-red-500">{fieldErrors.fullName}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Work email
              </label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="jane@company.com"
                className={`w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-indigo-200 ${
                  fieldErrors.email ? 'border-red-300' : 'border-slate-200 focus:border-indigo-400'
                }`}
              />
              {fieldErrors.email && <p className="mt-1 text-[11px] text-red-500">{fieldErrors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  placeholder="Minimum 10 characters"
                  className={`w-full rounded-lg border px-3 py-2.5 pr-10 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-indigo-200 ${
                    fieldErrors.password ? 'border-red-300' : 'border-slate-200 focus:border-indigo-400'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.password
                ? <p className="mt-1 text-[11px] text-red-500">{fieldErrors.password}</p>
                : <PasswordStrengthMeter password={form.password} />
              }
            </div>

            {/* Confirm password */}
            <div>
              <label htmlFor="reg-confirm-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="reg-confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={(e) => update('confirmPassword', e.target.value)}
                  placeholder="Re-enter your password"
                  className={`w-full rounded-lg border px-3 py-2.5 pr-10 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-indigo-200 ${
                    fieldErrors.confirmPassword ? 'border-red-300' : 'border-slate-200 focus:border-indigo-400'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="mt-1 text-[11px] text-red-500">{fieldErrors.confirmPassword}</p>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            {/* Workspace Name */}
            <div>
              <label htmlFor="reg-workspace-name" className="block text-sm font-medium text-slate-700 mb-1.5">
                Workspace name
              </label>
              <input
                id="reg-workspace-name"
                type="text"
                value={form.workspaceName}
                onChange={(e) => update('workspaceName', e.target.value)}
                placeholder="Acme Agency"
                className={`w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-indigo-200 ${
                  fieldErrors.workspaceName ? 'border-red-300' : 'border-slate-200 focus:border-indigo-400'
                }`}
              />
              {fieldErrors.workspaceName && (
                <p className="mt-1 text-[11px] text-red-500">{fieldErrors.workspaceName}</p>
              )}
            </div>

            {/* Workspace Slug */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Workspace URL
              </label>
              <SlugAvailabilityInput
                value={form.workspaceSlug}
                onChange={(v) => { update('workspaceSlug', v); setSlugAvailable(null); }}
                onAvailabilityChange={setSlugAvailable}
                error={fieldErrors.workspaceSlug}
              />
            </div>

            {/* Timezone */}
            <div>
              <label htmlFor="reg-timezone" className="block text-sm font-medium text-slate-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-slate-400" /> Timezone
                </span>
              </label>
              <select
                id="reg-timezone"
                value={form.timezone}
                onChange={(e) => update('timezone', e.target.value)}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 outline-none bg-white transition focus:ring-2 focus:ring-indigo-200 ${
                  fieldErrors.timezone ? 'border-red-300' : 'border-slate-200 focus:border-indigo-400'
                }`}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
              {fieldErrors.timezone && <p className="mt-1 text-[11px] text-red-500">{fieldErrors.timezone}</p>}
            </div>

            {/* Industry (optional) */}
            <div>
              <label htmlFor="reg-industry" className="block text-sm font-medium text-slate-700 mb-1.5">
                Industry <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <select
                id="reg-industry"
                value={form.industry}
                onChange={(e) => update('industry', e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
              >
                {INDUSTRIES.map((ind) => (
                  <option key={ind.value} value={ind.value}>{ind.label}</option>
                ))}
              </select>
            </div>
          </div>
        );



      case 3:
        return (
          <div className="space-y-4">
            <p className="text-sm text-slate-500 mb-4">
              Review your details and create your workspace.
            </p>

            {/* Summary card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 divide-y divide-slate-200">
              {[
                { label: 'Name',      value: form.fullName },
                { label: 'Email',     value: form.email },
                { label: 'Workspace', value: form.workspaceName },
                { label: 'URL',       value: `localbi.app/client/${form.workspaceSlug}` },
                { label: 'Timezone',  value: TIMEZONES.find((t) => t.value === form.timezone)?.label || form.timezone },
                { label: 'Industry',  value: INDUSTRIES.find((i) => i.value === form.industry)?.label || '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs font-medium text-slate-500 w-24 flex-shrink-0">{label}</span>
                  <span className="text-sm text-slate-800 text-right truncate">{value}</span>
                </div>
              ))}
            </div>

            {serverError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                <p className="text-sm text-red-600">{serverError}</p>
              </div>
            )}

            <p className="text-[11px] text-slate-400 text-center leading-relaxed">
              By creating an account you agree to our{' '}
              <a href="/terms" className="underline hover:text-indigo-600">Terms of Service</a>{' '}
              and{' '}
              <a href="/privacy" className="underline hover:text-indigo-600">Privacy Policy</a>.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="w-full">
      {/* Step header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-indigo-500">
            Step {step} of 3
          </p>
          <p className="text-[11px] text-slate-400">{STEP_TITLES[step]}</p>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step title */}
      <h2 className="text-xl font-bold text-slate-900 mb-5">{STEP_TITLES[step]}</h2>

      {/* Step content */}
      {renderStep()}

      {/* Navigation */}
      <div className="mt-6 flex items-center gap-3">
        {step > 1 && (
          <button
            type="button"
            onClick={handleBack}
            disabled={submitting}
            id="reg-back-btn"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        )}

        {step < 3 ? (
          <button
            type="button"
            onClick={handleNext}
            id="reg-next-btn"
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition shadow-sm shadow-indigo-200"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            id="reg-submit-btn"
            className="ml-auto flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-2.5 text-sm font-semibold text-white hover:from-indigo-700 hover:to-violet-700 transition shadow-md shadow-indigo-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Creating workspace…</>
            ) : (
              <><CheckCircle2 className="h-4 w-4" /> Create workspace</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
