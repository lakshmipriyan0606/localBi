'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, AlertCircle, CheckCircle2, Save } from 'lucide-react';
import {
  tenantSettingsSchema,
  TenantSettingsInput,
} from '../schemas/tenant-settings-schema';
import { TenantSettingsDto } from '../types/settings-dto';
import { useUpdateTenantSettingsMutation } from '../hooks/use-settings';
import { normalizeApiError } from '@/lib/http/api-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface OrganizationSettingsFormProps {
  tenant: TenantSettingsDto;
}

export function OrganizationSettingsForm({ tenant }: OrganizationSettingsFormProps) {
  const [currentTenant, setCurrentTenant] = useState<TenantSettingsDto>(tenant);
  const [success, setSuccess] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const updateMutation = useUpdateTenantSettingsMutation(tenant.slug);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TenantSettingsInput>({
    resolver: zodResolver(tenantSettingsSchema),
    defaultValues: {
      name: currentTenant.name,
      timezone: currentTenant.timezone,
    },
    mode: 'onBlur',
  });

  const onSubmit = async (data: TenantSettingsInput) => {
    setGeneralError(null);
    setSuccess(false);

    try {
      const res = await updateMutation.mutateAsync({
        ...data,
        version: currentTenant.version,
      });
      setCurrentTenant(res.tenant);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      const normalized = normalizeApiError(err);
      setGeneralError(normalized.message);
    }
  };

  return (
    <Card className="border-slate-200/80 shadow-xs">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-slate-900">
          Organization Preferences
        </CardTitle>
        <CardDescription>
          Changes are saved safely to avoid any accidental overwrites.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {success && (
          <Alert variant="success" className="bg-emerald-50 text-emerald-900 border-emerald-200 mb-4">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <AlertDescription>Organization preferences updated successfully!</AlertDescription>
          </Alert>
        )}

        {generalError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription>{generalError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Organization Name */}
            <div className="space-y-1.5">
              <Label htmlFor="org-name-input">Organization Name</Label>
              <Input
                id="org-name-input"
                aria-invalid={errors.name ? 'true' : 'false'}
                aria-describedby={errors.name ? 'org-name-error' : undefined}
                {...register('name')}
              />
              {errors.name && (
                <p id="org-name-error" className="text-xs font-medium text-red-600">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Workspace Slug (Immutable) */}
            <div className="space-y-1.5">
              <Label htmlFor="org-slug-input">Workspace Address (cannot be changed)</Label>
              <Input
                id="org-slug-input"
                value={currentTenant.slug}
                disabled
                className="bg-slate-100 text-slate-500 cursor-not-allowed font-mono text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Reporting Timezone */}
            <div className="space-y-1.5">
              <Label htmlFor="org-tz-input">Reporting Timezone</Label>
              <Input
                id="org-tz-input"
                aria-invalid={errors.timezone ? 'true' : 'false'}
                aria-describedby={errors.timezone ? 'org-tz-error' : undefined}
                {...register('timezone')}
              />
              {errors.timezone && (
                <p id="org-tz-error" className="text-xs font-medium text-red-600">
                  {errors.timezone.message}
                </p>
              )}
            </div>

            {/* Subscription Plan (Immutable) */}
            <div className="space-y-1.5">
              <Label htmlFor="org-plan-input">Subscription Tier</Label>
              <Input
                id="org-plan-input"
                value={currentTenant.plan}
                disabled
                className="bg-slate-100 text-slate-500 cursor-not-allowed text-xs uppercase"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4">
            <span className="text-xs text-slate-400">
              Last saved: version {currentTenant.version}
            </span>

            <Button
              type="submit"
              disabled={isSubmitting}
              id="save-tenant-settings-btn"
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving preferences...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
