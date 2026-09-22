'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Loader2,
  AlertCircle,
  Tag,
  BarChart3,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { brandFormSchema, BrandFormInput } from '../schemas/brand-schema';
import { BrandDto } from '../types/brand-dto';
import { useUpdateBrandMutation } from '../hooks/use-brands';
import { normalizeApiError, AppApiError } from '@/lib/http/api-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/cn';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/** Small status pill — mirrors CloseBI integration badges */
function IntegrationBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border',
        active
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-slate-100 text-slate-500 border-slate-200'
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          active ? 'bg-emerald-500' : 'bg-slate-400'
        )}
      />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

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
      ga4MeasurementId: brand?.ga4MeasurementId || '',
    },
    mode: 'onBlur',
  });

  useEffect(() => {
    if (brand) {
      reset({
        name: brand.name,
        slug: brand.slug,
        ga4MeasurementId: brand.ga4MeasurementId || '',
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

  const hasGsc = Boolean(brand.gscWebsiteUrl);
  const hasGa4 = Boolean(brand.ga4MeasurementId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Tag className="h-4 w-4" />
            </div>
            <DialogTitle>Edit Brand</DialogTitle>
          </div>
          <DialogDescription>
            Update brand identity details and configure analytics integrations.
          </DialogDescription>
        </DialogHeader>

        {generalError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription>{generalError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

          {/* ── BRAND IDENTITY ── */}
          <div className="space-y-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Brand Identity
            </p>
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
          </div>

          {/* ── INTEGRATION SETTINGS ── */}
          <div className="space-y-3">
            <div className="border-t border-slate-100 pt-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Integration Settings
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Configure analytics connections for this brand.
              </p>
            </div>

            <div className="space-y-2.5">
              {/* Google Analytics */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center flex-shrink-0">
                      <BarChart3 className="h-3.5 w-3.5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Google Analytics</p>
                      <p className="text-[11px] text-slate-500">GA4 Measurement ID</p>
                    </div>
                  </div>
                  <IntegrationBadge active={hasGa4} />
                </div>

                <div className="space-y-1">
                  <Input
                    id="edit-brand-ga4"
                    type="text"
                    placeholder="e.g. G-ABC123DEF4"
                    className="text-xs font-mono h-8"
                    aria-invalid={errors.ga4MeasurementId ? 'true' : 'false'}
                    aria-describedby={
                      errors.ga4MeasurementId ? 'edit-brand-ga4-error' : undefined
                    }
                    {...register('ga4MeasurementId')}
                  />
                  {errors.ga4MeasurementId && (
                    <p id="edit-brand-ga4-error" className="text-xs font-medium text-red-600">
                      {errors.ga4MeasurementId.message}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400">
                    Found in Google Analytics → Admin → Data Streams
                  </p>
                </div>
              </div>

              {/* Google Search Console */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                      <Globe className="h-3.5 w-3.5 text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Google Search Console</p>
                      <p className="text-[11px] text-slate-500">Linked website property</p>
                    </div>
                  </div>
                  <IntegrationBadge active={hasGsc} />
                </div>

                {hasGsc ? (
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
                    <Globe className="h-3 w-3 text-indigo-500 flex-shrink-0" />
                    <span className="text-xs font-mono text-slate-700 truncate flex-1">
                      {brand.gscWebsiteUrl}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-slate-500">
                      No website linked to this brand yet.
                    </p>
                    <a
                      href={`/client/${tenantSlug}/integrations`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      Go to Google Connect
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
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
