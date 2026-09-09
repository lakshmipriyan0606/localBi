import type { Metadata } from 'next';
import Link from 'next/link';
import { InvitationService } from '@/modules/invitations/invitation-service';
import { AcceptInvitationForm } from '@/features/invitations/components/accept-invitation-form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Accept Invitation — localBi',
  description: 'Accept your invitation to join an enterprise workspace',
};

export default async function InvitationAcceptancePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let invitation = null;
  let validationError: string | null = null;

  try {
    invitation = await InvitationService.getInvitationByToken(token);
  } catch (err) {
    validationError =
      (err as Error).message ||
      'This invitation link is invalid, expired, or has already been used.';
  }

  if (validationError || !invitation) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Invitation Expired or Invalid
          </h2>
          <p className="text-sm text-slate-500">
            We could not verify this workspace invitation.
          </p>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription>
            {validationError || 'This invitation link is invalid, expired, or has already been accepted.'}
          </AlertDescription>
        </Alert>

        <p className="text-xs text-slate-500 leading-relaxed">
          Please contact your organization administrator to request a new invitation link.
        </p>

        <Button asChild variant="outline" className="w-full">
          <Link href="/login">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to sign in
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <AcceptInvitationForm
      token={token}
      invitation={{
        tenantName: invitation.tenantName,
        email: invitation.email,
        role: invitation.role,
      }}
    />
  );
}
