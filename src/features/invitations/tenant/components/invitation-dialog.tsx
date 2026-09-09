'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus, Loader2, AlertCircle, Copy, Check } from 'lucide-react';
import {
  createInvitationSchema,
  CreateInvitationInput,
} from '../schemas/create-invitation-schema';
import { useCreateTenantInvitationMutation } from '../hooks/use-tenant-invitations';
import { normalizeApiError } from '@/lib/http/api-error';
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

interface BrandOption {
  id: string;
  name: string;
}

interface InvitationDialogProps {
  tenantSlug: string;
  brands: BrandOption[];
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

export function InvitationDialog({ tenantSlug, brands }: InvitationDialogProps) {
  const [open, setOpen] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createMutation = useCreateTenantInvitationMutation(tenantSlug);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateInvitationInput>({
    resolver: zodResolver(createInvitationSchema),
    defaultValues: {
      email: '',
      role: 'ANALYST',
      scopeMode: 'ALL_BRANDS',
      brandIds: [],
    },
    mode: 'onBlur',
  });

  const scopeMode = watch('scopeMode');
  const selectedBrandIds = watch('brandIds') || [];

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

  const onSubmit = async (data: CreateInvitationInput) => {
    setGeneralError(null);
    try {
      const res = await createMutation.mutateAsync(data);
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const fullUrl = `${origin}/invitations/${res.rawToken}`;
      setGeneratedInviteLink(fullUrl);
      reset();
    } catch (err) {
      const normalized = normalizeApiError(err);
      setGeneralError(normalized.message);
    }
  };

  const handleCopyLink = async () => {
    if (!generatedInviteLink) return;
    await navigator.clipboard.writeText(generatedInviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setGeneratedInviteLink(null);
      setGeneralError(null);
      setCopied(false);
    }
    setOpen(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button id="open-invite-modal-btn" className="gap-2">
          <UserPlus className="h-4 w-4" />
          Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <UserPlus className="h-4 w-4" />
            </div>
            <DialogTitle>Invite New Member</DialogTitle>
          </div>
          <DialogDescription>
            Dispatch a secure time-bounded invitation to onboarding team members with pre-assigned roles.
          </DialogDescription>
        </DialogHeader>

        {generalError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription>{generalError}</AlertDescription>
          </Alert>
        )}

        {generatedInviteLink ? (
          <div className="space-y-4 py-2">
            <Alert variant="success" className="bg-emerald-50 text-emerald-900 border-emerald-200">
              <Check className="h-4 w-4 text-emerald-600" />
              <AlertDescription>
                Invitation created successfully! Share this single-use link with the recipient.
              </AlertDescription>
            </Alert>

            <div className="space-y-1.5">
              <Label>Invitation Link</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={generatedInviteLink}
                  className="font-mono text-xs bg-slate-50 select-all"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="gap-1.5 flex-shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-slate-400">
                This link expires in 7 days and can only be used once.
              </p>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" onClick={() => handleClose(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Recipient Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@company.com"
                autoFocus
                aria-invalid={errors.email ? 'true' : 'false'}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs font-medium text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <Label htmlFor="invite-role">Assigned Role</Label>
              <select
                id="invite-role"
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

            {/* Scope Mode */}
            <div className="space-y-2">
              <Label>Brand Access Scope</Label>
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
                <Label className="text-xs">Select Authorized Brands</Label>
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
                onClick={() => handleClose(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                id="submit-create-invitation-btn"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating link...
                  </>
                ) : (
                  'Generate Invitation'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
