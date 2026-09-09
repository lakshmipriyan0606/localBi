'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, AlertCircle, Tag } from 'lucide-react';
import { brandFormSchema, BrandFormInput } from '../schemas/brand-schema';
import { BrandDto } from '../types/brand-dto';
import { useUpdateBrandMutation } from '../hooks/use-brands';
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
} from '@/components/ui/dialog';

interface BrandEditDialogProps {
  tenantSlug: string;
  brand: BrandDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BrandEditDialog({
  tenantSlug,
  brand,
  open,
  onOpenChange,
}: BrandEditDialogProps) {
  const [generalError, setGeneralError] = useState<string | null>(null);
  const updateMutation = useUpdateBrandMutation(tenantSlug);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BrandFormInput>({
    resolver: zodResolver(brandFormSchema),
    defaultValues: {
      name: brand?.name || '',
      slug: brand?.slug || '',
    },
    mode: 'onBlur',
  });

  useEffect(() => {
    if (brand) {
      reset({
        name: brand.name,
        slug: brand.slug,
      });
      setGeneralError(null);
    }
  }, [brand, reset]);

  const onSubmit = async (data: BrandFormInput) => {
    if (!brand) return;
    setGeneralError(null);
    try {
      await updateMutation.mutateAsync({
        brandId: brand.id,
        data: {
          ...data,
          version: brand.version,
        },
      });
      onOpenChange(false);
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

  if (!brand) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Tag className="h-4 w-4" />
            </div>
            <DialogTitle>Edit Brand</DialogTitle>
          </div>
          <DialogDescription>
            Update brand identity details. Changes are protected with optimistic concurrency control.
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
            <Label htmlFor="edit-brand-name">Brand Name</Label>
            <Input
              id="edit-brand-name"
              type="text"
              aria-invalid={errors.name ? 'true' : 'false'}
              aria-describedby={errors.name ? 'edit-brand-name-error' : undefined}
              {...register('name')}
            />
            {errors.name && (
              <p id="edit-brand-name-error" className="text-xs font-medium text-red-600">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Brand Slug */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-brand-slug">Brand Slug</Label>
            <Input
              id="edit-brand-slug"
              type="text"
              aria-invalid={errors.slug ? 'true' : 'false'}
              aria-describedby={errors.slug ? 'edit-brand-slug-error' : undefined}
              {...register('slug')}
            />
            {errors.slug && (
              <p id="edit-brand-slug-error" className="text-xs font-medium text-red-600">
                {errors.slug.message}
              </p>
            )}
          </div>

          <div className="rounded-md bg-slate-50 p-2.5 text-xs text-slate-500 border border-slate-200">
            Optimistic Concurrency Lock: Current Version{' '}
            <strong className="font-semibold text-slate-700">v{brand.version}</strong>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              id="submit-brand-update-btn"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving changes...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
