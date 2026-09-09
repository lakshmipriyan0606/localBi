'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, AlertCircle, Shield } from 'lucide-react';
import {
  updateMemberRoleSchema,
  UpdateMemberRoleInput,
} from '../schemas/team-member-schema';
import { TeamMemberDto } from '../types/team-dto';
import { useUpdateMemberMutation } from '../hooks/use-team';
import { normalizeApiError } from '@/lib/http/api-error';
import { Button } from '@/components/ui/button';
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

interface BrandOption {
  id: string;
  name: string;
}

interface TeamEditModalProps {
  tenantSlug: string;
  member: TeamMemberDto | null;
  brands: BrandOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLES = [
  'OWNER',
  'ADMIN',
  'MANAGER',
  'ANALYST',
  'OPERATOR',
  'BILLING',
  'AUDITOR',
  'VIEWER',
] as const;

export function TeamEditModal({
  tenantSlug,
  member,
  brands,
  open,
  onOpenChange,
}: TeamEditModalProps) {
  const [generalError, setGeneralError] = useState<string | null>(null);
  const updateMutation = useUpdateMemberMutation(tenantSlug);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { isSubmitting },
  } = useForm<UpdateMemberRoleInput>({
    resolver: zodResolver(updateMemberRoleSchema),
    defaultValues: {
      role: 'ANALYST',
      scopeMode: 'ALL_BRANDS',
      brandIds: [],
    },
  });

  const scopeMode = watch('scopeMode');
  const selectedBrandIds = watch('brandIds') || [];

  useEffect(() => {
    if (member) {
      reset({
        role: member.role as UpdateMemberRoleInput['role'],
        scopeMode: member.scopeMode as UpdateMemberRoleInput['scopeMode'],
        brandIds: member.brandAccessScopes?.map((s) => s.brandId) || [],
      });
      setGeneralError(null);
    }
  }, [member, reset]);

  const toggleBrand = (brandId: string) => {
    if (selectedBrandIds.includes(brandId)) {
      setValue(
        'brandIds',
        selectedBrandIds.filter((id) => id !== brandId)
      );
    } else {
      setValue('brandIds', [...selectedBrandIds, brandId]);
    }
  };

  const onSubmit = async (data: UpdateMemberRoleInput) => {
    if (!member) return;
    setGeneralError(null);
    try {
      await updateMutation.mutateAsync({
        membershipId: member.id,
        data,
      });
      onOpenChange(false);
    } catch (err) {
      const normalized = normalizeApiError(err);
      setGeneralError(normalized.message);
    }
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Shield className="h-4 w-4" />
            </div>
            <DialogTitle>Edit Member Role & Scope</DialogTitle>
          </div>
          <DialogDescription>
            Configure administrative authorization and brand scope boundaries for{' '}
            <strong className="font-semibold text-slate-800">
              {member.fullName || member.email}
            </strong>
            .
          </DialogDescription>
        </DialogHeader>

        {generalError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription>{generalError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Role Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-member-role">Administrative Role</Label>
            <select
              id="edit-member-role"
              className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              {...register('role')}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Scope Mode Selection */}
          <div className="space-y-2">
            <Label>Access Scope Mode</Label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-xs font-medium cursor-pointer hover:bg-slate-50">
                <input
                  type="radio"
                  value="ALL_BRANDS"
                  {...register('scopeMode')}
                  className="text-indigo-600"
                />
                <span>All Brands</span>
              </label>

              <label className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-xs font-medium cursor-pointer hover:bg-slate-50">
                <input
                  type="radio"
                  value="RESTRICTED"
                  {...register('scopeMode')}
                  className="text-indigo-600"
                />
                <span>Restricted Brands</span>
              </label>
            </div>
          </div>

          {/* Restricted Brands Checkboxes */}
          {scopeMode === 'RESTRICTED' && (
            <div className="space-y-2 border rounded-lg p-3 bg-slate-50/50 max-h-40 overflow-y-auto">
              <Label className="text-xs">Select Allowed Brands</Label>
              {brands.length === 0 ? (
                <p className="text-xs text-slate-400">No brands available in this organization.</p>
              ) : (
                brands.map((b) => (
                  <label
                    key={b.id}
                    className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={selectedBrandIds.includes(b.id)}
                      onChange={() => toggleBrand(b.id)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{b.name}</span>
                  </label>
                ))
              )}
            </div>
          )}

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
              id="submit-member-update-btn"
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
