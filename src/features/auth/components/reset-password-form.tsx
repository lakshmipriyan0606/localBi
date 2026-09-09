'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Loader2, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  resetPasswordSchema,
  ResetPasswordInput,
} from '../schemas/reset-password-schema';
import { browserClient } from '@/lib/http/browser-client';
import { normalizeApiError } from '@/lib/http/api-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ResetPasswordFormProps {
  token?: string | undefined;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
    mode: 'onBlur',
  });

  if (!token) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Invalid Recovery Link
          </h2>
          <p className="text-sm text-slate-500">
            This password recovery link is missing or malformed.
          </p>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription>
            The recovery link is missing a required security token. Please request a new recovery link.
          </AlertDescription>
        </Alert>

        <Button asChild className="w-full">
          <Link href="/forgot-password">Request new recovery link</Link>
        </Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Password updated
          </h2>
          <p className="text-sm text-slate-500">
            Your password has been changed and all previous sessions have been securely revoked.
          </p>
        </div>

        <Alert variant="success" className="bg-emerald-50 text-emerald-900 border-emerald-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription>
            Your account is ready. Please sign in with your new password to continue.
          </AlertDescription>
        </Alert>

        <Button asChild className="w-full" id="sign-in-after-reset-btn">
          <Link href="/login">Sign in with new password</Link>
        </Button>
      </div>
    );
  }

  const onSubmit = async (data: ResetPasswordInput) => {
    setGeneralError(null);
    try {
      await browserClient.post('/auth/reset-password', {
        token,
        password: data.password,
      });
      setSuccess(true);
    } catch (err) {
      const normalized = normalizeApiError(err);
      setGeneralError(normalized.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Create new password
        </h2>
        <p className="text-sm text-slate-500">
          Enter a strong password with at least 10 characters.
        </p>
      </div>

      {generalError && (
        <Alert variant="destructive" id="reset-password-error">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription>{generalError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* New Password */}
        <div className="space-y-1.5">
          <Label htmlFor="new-password">New Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••••••"
              autoComplete="new-password"
              autoFocus
              className="pl-9 pr-10"
              aria-invalid={errors.password ? 'true' : 'false'}
              aria-describedby={errors.password ? 'new-password-error' : undefined}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p id="new-password-error" className="text-xs font-medium text-red-600 mt-1">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <Label htmlFor="confirm-password">Confirm New Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••••••"
              autoComplete="new-password"
              className="pl-9 pr-10"
              aria-invalid={errors.confirmPassword ? 'true' : 'false'}
              aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
              {...register('confirmPassword')}
            />
          </div>
          {errors.confirmPassword && (
            <p id="confirm-password-error" className="text-xs font-medium text-red-600 mt-1">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting}
          id="submit-reset-password-btn"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating password...
            </>
          ) : (
            'Update password'
          )}
        </Button>
      </form>
    </div>
  );
}
