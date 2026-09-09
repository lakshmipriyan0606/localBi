'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Loader2, AlertCircle, Tag } from 'lucide-react';
import { brandFormSchema, BrandFormInput } from '../schemas/brand-schema';
import { useCreateBrandMutation } from '../hooks/use-brands';
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

interface BrandCreateDialogProps {
  tenantSlug: string;
}

export function BrandCreateDialog({ tenantSlug }: BrandCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const createMutation = useCreateBrandMutation(tenantSlug);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BrandFormInput>({
    resolver: zodResolver(brandFormSchema),
    defaultValues: {
      name: '',
      slug: '',
    },
    mode: 'onBlur',
  });

  const slugValue = watch('slug');

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue('name', val, { shouldValidate: true });
    const autoSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    setValue('slug', autoSlug, { shouldValidate: false });
  };

  const onSubmit = async (data: BrandFormInput) => {
    setGeneralError(null);
    try {
      await createMutation.mutateAsync(data);
      reset();
      setOpen(false);
    } catch (err) {
      const normalized = normalizeApiError(err);
      if (normalized instanceof AppApiError && normalized.fieldErrors) {
        for (const [field, messages] of Object.entries(normalized.fieldErrors)) {
          setError(field as keyof BrandFormInput, {
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
        <Button id="create-brand-btn" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Brand
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Tag className="h-4 w-4" />
            </div>
            <DialogTitle>Create New Brand</DialogTitle>
          </div>
          <DialogDescription>
            Register a client brand entity. Slugs must be unique within your organization.
          </DialogDescription>
        </DialogHeader>

        {generalError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription>{generalError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Brand Name */}
          <div className="space-y-1.5">
            <Label htmlFor="brand-name">Brand Name</Label>
            <Input
              id="brand-name"
              type="text"
              placeholder="e.g. Acme Coffee Roasters"
              autoFocus
              aria-invalid={errors.name ? 'true' : 'false'}
              aria-describedby={errors.name ? 'brand-name-error' : undefined}
              {...register('name', { onChange: handleNameChange })}
            />
            {errors.name && (
              <p id="brand-name-error" className="text-xs font-medium text-red-600">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Brand Slug */}
          <div className="space-y-1.5">
            <Label htmlFor="brand-slug">Brand Slug (Tenant Unique)</Label>
            <Input
              id="brand-slug"
              type="text"
              placeholder="e.g. acme-coffee-roasters"
              value={slugValue}
              aria-invalid={errors.slug ? 'true' : 'false'}
              aria-describedby={errors.slug ? 'brand-slug-error' : undefined}
              {...register('slug')}
            />
            {errors.slug && (
              <p id="brand-slug-error" className="text-xs font-medium text-red-600">
                {errors.slug.message}
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
              id="submit-brand-create-btn"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating brand...
                </>
              ) : (
                'Create Brand'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
