'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, AlertCircle, MapPin } from 'lucide-react';
import { locationFormSchema, LocationFormInput } from '../schemas/location-schema';
import { LocationDto } from '../types/location-dto';
import { useUpdateLocationMutation } from '../hooks/use-locations';
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

interface LocationEditDialogProps {
  tenantSlug: string;
  location: LocationDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LocationEditDialog({
  tenantSlug,
  location,
  open,
  onOpenChange,
}: LocationEditDialogProps) {
  const [generalError, setGeneralError] = useState<string | null>(null);
  const updateMutation = useUpdateLocationMutation(tenantSlug);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LocationFormInput>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      brandId: location?.brandId || '',
      storeCode: location?.storeCode || '',
      name: location?.name || '',
      addressLine1: location?.addressLine1 || '',
      city: location?.city || '',
      stateRegion: location?.stateRegion || '',
      postalCode: location?.postalCode || '',
      countryCode: location?.countryCode || 'US',
      timezone: location?.timezone || 'America/New_York',
    },
    mode: 'onBlur',
  });

  useEffect(() => {
    if (location) {
      reset({
        brandId: location.brandId,
        storeCode: location.storeCode,
        name: location.name,
        addressLine1: location.addressLine1,
        city: location.city,
        stateRegion: location.stateRegion,
        postalCode: location.postalCode,
        countryCode: location.countryCode,
        timezone: location.timezone,
      });
      setGeneralError(null);
    }
  }, [location, reset]);

  const onSubmit = async (data: LocationFormInput) => {
    if (!location) return;
    setGeneralError(null);
    try {
      await updateMutation.mutateAsync({
        locationId: location.id,
        data: {
          storeCode: data.storeCode,
          name: data.name,
          addressLine1: data.addressLine1,
          city: data.city,
          stateRegion: data.stateRegion,
          postalCode: data.postalCode,
          countryCode: data.countryCode,
          timezone: data.timezone,
          version: location.version,
        },
      });
      onOpenChange(false);
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

  if (!location) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <MapPin className="h-4 w-4" />
            </div>
            <DialogTitle>Edit Location</DialogTitle>
          </div>
          <DialogDescription>
            Update branch location details. Protected with optimistic concurrency locking.
          </DialogDescription>
        </DialogHeader>

        {generalError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription>{generalError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Store Code */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-loc-store-code">Store Code</Label>
              <Input
                id="edit-loc-store-code"
                aria-invalid={errors.storeCode ? 'true' : 'false'}
                {...register('storeCode')}
              />
              {errors.storeCode && (
                <p className="text-xs font-medium text-red-600">{errors.storeCode.message}</p>
              )}
            </div>

            {/* Location Name */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-loc-name">Location Name</Label>
              <Input
                id="edit-loc-name"
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
            <Label htmlFor="edit-loc-address">Street Address</Label>
            <Input
              id="edit-loc-address"
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
              <Label htmlFor="edit-loc-city">City</Label>
              <Input
                id="edit-loc-city"
                aria-invalid={errors.city ? 'true' : 'false'}
                {...register('city')}
              />
              {errors.city && (
                <p className="text-xs font-medium text-red-600">{errors.city.message}</p>
              )}
            </div>

            {/* State/Region */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-loc-state">State / Region</Label>
              <Input
                id="edit-loc-state"
                aria-invalid={errors.stateRegion ? 'true' : 'false'}
                {...register('stateRegion')}
              />
              {errors.stateRegion && (
                <p className="text-xs font-medium text-red-600">{errors.stateRegion.message}</p>
              )}
            </div>

            {/* Postal Code */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-loc-postal">Postal Code</Label>
              <Input
                id="edit-loc-postal"
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
              <Label htmlFor="edit-loc-country">Country Code</Label>
              <Input
                id="edit-loc-country"
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
              <Label htmlFor="edit-loc-tz">Reporting Timezone</Label>
              <Input
                id="edit-loc-tz"
                aria-invalid={errors.timezone ? 'true' : 'false'}
                {...register('timezone')}
              />
              {errors.timezone && (
                <p className="text-xs font-medium text-red-600">{errors.timezone.message}</p>
              )}
            </div>
          </div>

          <div className="rounded-md bg-slate-50 p-2.5 text-xs text-slate-500 border border-slate-200">
            Optimistic Concurrency Lock: Current Version{' '}
            <strong className="font-semibold text-slate-700">v{location.version}</strong>
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
              id="submit-location-update-btn"
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
