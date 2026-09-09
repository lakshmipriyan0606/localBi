'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Loader2, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  forgotPasswordSchema,
  ForgotPasswordInput,
} from '../schemas/forgot-password-schema';
import { browserClient } from '@/lib/http/browser-client';
import { normalizeApiError } from '@/lib/http/api-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function ForgotPasswordForm() {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
    mode: 'onTouched',
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setGeneralError(null);
    try {
      await browserClient.post('/auth/forgot-password', { email: data.email });
      setSubmittedEmail(data.email);
    } catch (err) {
      const normalized = normalizeApiError(err);
      // Non-enumerating backend might return 200, but in case of rate-limiting or server failure:
      setGeneralError(normalized.message);
    }
  };

  if (submittedEmail) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Check your email
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            If an account matches{' '}
            <strong className="font-semibold text-slate-800">{submittedEmail}</strong>,
            a secure recovery link has been dispatched.
          </p>
        </div>

        <Alert variant="success" className="bg-emerald-50 text-emerald-900 border-emerald-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription>
            Please check your inbox. For security, password reset links expire in 1 hour.
          </AlertDescription>
        </Alert>

        <div className="pt-2 space-y-3">
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to sign in
            </Link>
          </Button>
          <button
            type="button"
            onClick={() => setSubmittedEmail(null)}
            className="w-full text-center text-xs text-slate-500 hover:text-slate-800 transition-colors"
          >
            Didn&apos;t receive an email? Try another address
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Reset your password
        </h2>
        <p className="text-sm text-slate-500">
          Enter your registered work email and we will send you a recovery link.
        </p>
      </div>

      {generalError && (
        <Alert variant="destructive" id="forgot-password-error">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription>{generalError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="forgot-email">Work Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              id="forgot-email"
              type="email"
              placeholder="name@company.com"
              autoComplete="email"
              className="pl-9"
              aria-invalid={errors.email ? 'true' : 'false'}
              aria-describedby={errors.email ? 'forgot-email-error' : undefined}
              {...register('email')}
            />
          </div>
          {errors.email && (
            <p id="forgot-email-error" className="text-xs font-medium text-red-600 mt-1">
              {errors.email.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting}
          id="submit-forgot-password-btn"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending recovery link...
            </>
          ) : (
            'Send recovery link'
          )}
        </Button>
      </form>

      <div className="text-center pt-1">
        <Link
          href="/login"
          id="back-to-login-link"
          className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
