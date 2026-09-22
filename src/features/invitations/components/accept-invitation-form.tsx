'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Lock, Loader2, Eye, EyeOff, Building2, AlertCircle } from 'lucide-react';
import {
  acceptInvitationSchema,
  AcceptInvitationInput,
} from '../schemas/accept-invitation-schema';
import { browserClient } from '@/lib/http/browser-client';
import { normalizeApiError } from '@/lib/http/api-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export interface PublicInvitationDto {
  tenantName: string;
  email: string;
  role: string;
}

interface AcceptInvitationFormProps {
  token: string;
  invitation: PublicInvitationDto;
}

export function AcceptInvitationForm({ token, invitation }: AcceptInvitationFormProps) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AcceptInvitationInput>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: {
      fullName: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onBlur',
  });

  const onSubmit = async (data: AcceptInvitationInput) => {
    setGeneralError(null);
    try {
      await browserClient.post(`/invitations/${token}`, {
        fullName: data.fullName,
        password: data.password,
      });

      router.push('/clients');
    } catch (err) {
      const normalized = normalizeApiError(err);
      setGeneralError(normalized.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Invitation Header with verified metadata */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200/60">
          <Building2 className="h-3.5 w-3.5 text-indigo-600" />
          <span>{invitation.tenantName}</span>
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Accept your invitation
        </h2>
        <p className="text-sm text-slate-500">
          You have been invited to join as{' '}
          <Badge variant="secondary" className="font-semibold capitalize text-slate-800">
            {invitation.role.replace(/_/g, ' ').toLowerCase()}
          </Badge>
          . Complete your profile below to join.
        </p>
      </div>

      {generalError && (
        <Alert variant="destructive" id="accept-invitation-error">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription>{generalError}</AlertDescription>
        </Alert>
      )}

      {/* Verified Email Banner */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
        <div className="text-xs text-slate-500 font-medium">Invited Account</div>
        <div className="text-sm font-semibold text-slate-800 font-mono mt-0.5">
          {invitation.email}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Full Name */}
        <div className="space-y-1.5">
          <Label htmlFor="invite-fullname">Full Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              id="invite-fullname"
              type="text"
              placeholder="Alex Smith"
              autoComplete="name"
              autoFocus
              className="pl-9"
              aria-invalid={errors.fullName ? 'true' : 'false'}
              aria-describedby={errors.fullName ? 'invite-fullname-error' : undefined}
              {...register('fullName')}
            />
          </div>
          {errors.fullName && (
            <p id="invite-fullname-error" className="text-xs font-medium text-red-600 mt-1">
              {errors.fullName.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="invite-password">Create Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              id="invite-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••••••"
              autoComplete="new-password"
              className="pl-9 pr-10"
              aria-invalid={errors.password ? 'true' : 'false'}
              aria-describedby={errors.password ? 'invite-password-error' : undefined}
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
            <p id="invite-password-error" className="text-xs font-medium text-red-600 mt-1">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <Label htmlFor="invite-confirm-password">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              id="invite-confirm-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••••••"
              autoComplete="new-password"
              className="pl-9 pr-10"
              aria-invalid={errors.confirmPassword ? 'true' : 'false'}
              aria-describedby={errors.confirmPassword ? 'invite-confirm-error' : undefined}
              {...register('confirmPassword')}
            />
          </div>
          {errors.confirmPassword && (
            <p id="invite-confirm-error" className="text-xs font-medium text-red-600 mt-1">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting}
          id="submit-accept-invitation-btn"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Joining organization...
            </>
          ) : (
            'Accept invitation & continue'
          )}
        </Button>
      </form>
    </div>
  );
}
