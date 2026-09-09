'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Loader2, AlertCircle, Building2 } from 'lucide-react';
import {
  createTenantSchema,
  CreateTenantInput,
} from '../schemas/create-tenant-schema';
import { browserClient } from '@/lib/http/browser-client';
import { normalizeApiError, AppApiError } from '@/lib/http/api-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface CreateTenantDialogProps {
  trigger?: React.ReactNode | undefined;
  onSuccess?: (() => void) | undefined;
}

export function CreateTenantDialog({ trigger, onSuccess }: CreateTenantDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTenantInput>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: {
      name: '',
      slug: '',
      timezone: 'UTC',
    },
    mode: 'onBlur',
  });

  const slugValue = watch('slug');

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue('name', val, { shouldValidate: true });
    // Auto-generate slug if slug is empty or matches previous slug pattern
    const generated = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    setValue('slug', generated, { shouldValidate: false });
  };

  const onSubmit = async (data: CreateTenantInput) => {
    setGeneralError(null);
    try {
      const res = await browserClient.post<{ tenant: { slug: string } }>('/tenants', data);
      reset();
      setOpen(false);
      if (onSuccess) {
        onSuccess();
      }
      router.push(`/t/${res.data.tenant.slug}`);
    } catch (err) {
      const normalized = normalizeApiError(err);
      if (normalized instanceof AppApiError && normalized.fieldErrors) {
        for (const [field, messages] of Object.entries(normalized.fieldErrors)) {
          setError(field as keyof CreateTenantInput, {
            type: 'server',
            message: messages[0] || 'Invalid value',
          });
        }
      }
      setGeneralError(normalized.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button id="create-org-btn" className="gap-2">
            <Plus className="h-4 w-4" />
            New Organization
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Building2 className="h-4 w-4" />
            </div>
            <DialogTitle>New Organization</DialogTitle>
          </div>
          <DialogDescription>
            Create an isolated multi-tenant organization to manage brands, branch stores, and team access.
          </DialogDescription>
        </DialogHeader>

        {generalError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription>{generalError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Organization Name */}
          <div className="space-y-1.5">
            <Label htmlFor="tenant-name">Organization Name</Label>
            <Input
              id="tenant-name"
              type="text"
              placeholder="e.g. Acme Corporation"
              autoComplete="organization"
              autoFocus
              aria-invalid={errors.name ? 'true' : 'false'}
              aria-describedby={errors.name ? 'tenant-name-error' : undefined}
              {...register('name', { onChange: handleNameChange })}
            />
            {errors.name && (
              <p id="tenant-name-error" className="text-xs font-medium text-red-600">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Workspace Slug */}
          <div className="space-y-1.5">
            <Label htmlFor="tenant-slug">Workspace URL Slug</Label>
            <Input
              id="tenant-slug"
              type="text"
              placeholder="e.g. acme-corporation"
              value={slugValue}
              aria-invalid={errors.slug ? 'true' : 'false'}
              aria-describedby={errors.slug ? 'tenant-slug-error' : 'tenant-slug-desc'}
              {...register('slug')}
            />
            {errors.slug ? (
              <p id="tenant-slug-error" className="text-xs font-medium text-red-600">
                {errors.slug.message}
              </p>
            ) : (
              <p id="tenant-slug-desc" className="text-xs text-slate-500 font-mono">
                Accessible at: /t/{slugValue || 'workspace-slug'}
              </p>
            )}
          </div>

          {/* Reporting Timezone */}
          <div className="space-y-1.5">
            <Label htmlFor="tenant-tz">Reporting Timezone</Label>
            <Input
              id="tenant-tz"
              type="text"
              placeholder="UTC, America/New_York, Europe/London"
              aria-invalid={errors.timezone ? 'true' : 'false'}
              aria-describedby={errors.timezone ? 'tenant-tz-error' : undefined}
              {...register('timezone')}
            />
            {errors.timezone && (
              <p id="tenant-tz-error" className="text-xs font-medium text-red-600">
                {errors.timezone.message}
              </p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              id="submit-create-tenant-btn"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating workspace...
                </>
              ) : (
                'Create Organization'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
