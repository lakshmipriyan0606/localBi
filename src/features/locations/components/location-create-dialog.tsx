'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Loader2, AlertCircle, MapPin } from 'lucide-react';
import { locationFormSchema, LocationFormInput } from '../schemas/location-schema';
import { BrandOptionDto } from '../types/location-dto';
import { useCreateLocationMutation } from '../hooks/use-locations';
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

interface LocationCreateDialogProps {
  tenantSlug: string;
  brands: BrandOptionDto[];
}

export function LocationCreateDialog({ tenantSlug, brands }: LocationCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const createMutation = useCreateLocationMutation(tenantSlug);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LocationFormInput>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      brandId: brands[0]?.id || '',
      storeCode: '',
      name: '',
      addressLine1: '',
      city: '',
      stateRegion: '',
      postalCode: '',
      countryCode: 'US',
      timezone: 'America/New_York',
    },
    mode: 'onBlur',
  });

  const onSubmit = async (data: LocationFormInput) => {
    setGeneralError(null);
    try {
      await createMutation.mutateAsync(data);
      reset();
      setOpen(false);
    } catch (err) {
      const normalized = normalizeApiError(err);
      if (normalized instanceof AppApiError && normalized.fieldErrors) {
        for (const [field, messages] of Object.entries(normalized.fieldErrors)) {
          setError(field as keyof LocationFormInput, {
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
        <Button id="add-location-btn" className="gap-2" disabled={brands.length === 0}>
          <Plus className="h-4 w-4" />
          Add Location
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <MapPin className="h-4 w-4" />
            </div>
            <DialogTitle>Register New Location</DialogTitle>
          </div>
          <DialogDescription>
            Register a physical store or office branch with ISO country and IANA timezone parameters.
          </DialogDescription>
        </DialogHeader>

        {generalError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription>{generalError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Brand Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="loc-brand-id">Brand Organization</Label>
            <select
              id="loc-brand-id"
              className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              aria-invalid={errors.brandId ? 'true' : 'false'}
              {...register('brandId')}
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {errors.brandId && (
              <p className="text-xs font-medium text-red-600">{errors.brandId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Store Code */}
            <div className="space-y-1.5">
              <Label htmlFor="loc-store-code">Store Code</Label>
              <Input
                id="loc-store-code"
                placeholder="e.g. STORE-001"
                aria-invalid={errors.storeCode ? 'true' : 'false'}
                {...register('storeCode')}
              />
              {errors.storeCode && (
                <p className="text-xs font-medium text-red-600">{errors.storeCode.message}</p>
              )}
            </div>

            {/* Location Name */}
            <div className="space-y-1.5">
              <Label htmlFor="loc-name">Location Name</Label>
              <Input
                id="loc-name"
                placeholder="e.g. Downtown Flagship"
                aria-invalid={errors.name ? 'true' : 'false'}
                {...register('name')}
              />
              {errors.name && (
                <p className="text-xs font-medium text-red-600">{errors.name.message}</p>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label htmlFor="loc-address">Street Address</Label>
            <Input
              id="loc-address"
              placeholder="e.g. 100 Broadway Suite 400"
              aria-invalid={errors.addressLine1 ? 'true' : 'false'}
              {...register('addressLine1')}
            />
            {errors.addressLine1 && (
              <p className="text-xs font-medium text-red-600">{errors.addressLine1.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* City */}
            <div className="space-y-1.5">
              <Label htmlFor="loc-city">City</Label>
              <Input
                id="loc-city"
                placeholder="New York"
                aria-invalid={errors.city ? 'true' : 'false'}
                {...register('city')}
              />
              {errors.city && (
                <p className="text-xs font-medium text-red-600">{errors.city.message}</p>
              )}
            </div>

            {/* State/Region */}
            <div className="space-y-1.5">
              <Label htmlFor="loc-state">State / Region</Label>
              <Input
                id="loc-state"
                placeholder="NY"
                aria-invalid={errors.stateRegion ? 'true' : 'false'}
                {...register('stateRegion')}
              />
              {errors.stateRegion && (
                <p className="text-xs font-medium text-red-600">{errors.stateRegion.message}</p>
              )}
            </div>

            {/* Postal Code */}
            <div className="space-y-1.5">
              <Label htmlFor="loc-postal">Postal Code</Label>
              <Input
                id="loc-postal"
                placeholder="10001"
                aria-invalid={errors.postalCode ? 'true' : 'false'}
                {...register('postalCode')}
              />
              {errors.postalCode && (
                <p className="text-xs font-medium text-red-600">{errors.postalCode.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Country Code */}
            <div className="space-y-1.5">
              <Label htmlFor="loc-country">Country Code (ISO 3166-1)</Label>
              <Input
                id="loc-country"
                placeholder="US"
                maxLength={2}
                aria-invalid={errors.countryCode ? 'true' : 'false'}
                {...register('countryCode')}
              />
              {errors.countryCode && (
                <p className="text-xs font-medium text-red-600">{errors.countryCode.message}</p>
              )}
            </div>

            {/* Timezone */}
            <div className="space-y-1.5">
              <Label htmlFor="loc-tz">Reporting Timezone (IANA)</Label>
              <Input
                id="loc-tz"
                placeholder="America/New_York"
                aria-invalid={errors.timezone ? 'true' : 'false'}
                {...register('timezone')}
              />
              {errors.timezone && (
                <p className="text-xs font-medium text-red-600">{errors.timezone.message}</p>
              )}
            </div>
          </div>

          <DialogFooter className="pt-3">
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
              id="submit-location-create-btn"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating location...
                </>
              ) : (
                'Register Location'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
