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
      contactEmail: '',
      industry: '',
      website: '',
    },
    mode: 'onBlur',
  });

  const slugValue = watch('slug');

  const { onChange: onNameChange, ...nameRegister } = register('name');

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onNameChange(e); // Let react-hook-form handle the state according to the onBlur mode
    const val = e.target.value;
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
      router.push(`/client/${res.data.tenant.slug}`);
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
          <Button id="create-client-btn" className="gap-2">
            <Plus className="h-4 w-4" />
            New Client
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Building2 className="h-4 w-4" />
            </div>
            <DialogTitle>New Client</DialogTitle>
          </div>
          <DialogDescription>
            Set up a new client workspace to manage brands, store locations, and team members.
          </DialogDescription>
        </DialogHeader>

        {generalError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription>{generalError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Client Name */}
          <div className="space-y-1.5">
            <Label htmlFor="tenant-name">Client Name</Label>
            <Input
              id="tenant-name"
              type="text"
              placeholder="e.g. Acme Corporation"
              autoComplete="organization"
              autoFocus
              aria-invalid={errors.name ? 'true' : 'false'}
              aria-describedby={errors.name ? 'tenant-name-error' : undefined}
              {...nameRegister}
              onChange={handleNameChange}
            />
            {errors.name && (
              <p id="tenant-name-error" className="text-xs font-medium text-red-600">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Workspace Slug */}
          <div className="space-y-1.5">
            <Label htmlFor="tenant-slug">Short URL Name</Label>
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
                Accessible at: /client/{slugValue || 'client-slug'}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Contact Email */}
            <div className="space-y-1.5">
              <Label htmlFor="tenant-email">Contact Email (Optional)</Label>
              <Input
                id="tenant-email"
                type="email"
                placeholder="contact@acme.com"
                aria-invalid={errors.contactEmail ? 'true' : 'false'}
                aria-describedby={errors.contactEmail ? 'tenant-email-error' : undefined}
                {...register('contactEmail')}
              />
              {errors.contactEmail && (
                <p id="tenant-email-error" className="text-xs font-medium text-red-600">
                  {errors.contactEmail.message}
                </p>
              )}
            </div>

            {/* Industry */}
            <div className="space-y-1.5">
              <Label htmlFor="tenant-industry">Industry (Optional)</Label>
              <Input
                id="tenant-industry"
                type="text"
                placeholder="e.g. Retail"
                aria-invalid={errors.industry ? 'true' : 'false'}
                aria-describedby={errors.industry ? 'tenant-industry-error' : undefined}
                {...register('industry')}
              />
              {errors.industry && (
                <p id="tenant-industry-error" className="text-xs font-medium text-red-600">
                  {errors.industry.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Website */}
            <div className="space-y-1.5">
              <Label htmlFor="tenant-website">Website (Optional)</Label>
              <Input
                id="tenant-website"
                type="url"
                placeholder="https://acme.com"
                aria-invalid={errors.website ? 'true' : 'false'}
                aria-describedby={errors.website ? 'tenant-website-error' : undefined}
                {...register('website')}
              />
              {errors.website && (
                <p id="tenant-website-error" className="text-xs font-medium text-red-600">
                  {errors.website.message}
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
                  Creating client...
                </>
              ) : (
                'Create Client'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
