import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '../../../../../modules/auth/cookies';
import { ContextResolver } from '../../../../../modules/auth/context-resolver';
import { InvitationService } from '../../../../../modules/invitations/invitation-service';
import { EmailService } from '../../../../../modules/email/email-service';
import { getConfig } from '../../../../../shared/config';
import { prisma } from '../../../../../shared/database/client';
import { handleRouteError } from '../../../../../shared/errors';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized context missing');

    const invitations = await InvitationService.listPendingInvitations(
      authorizedContext.tenantId,
      authorizedContext
    );

    return NextResponse.json({ success: true, invitations });
  } catch (error) {
    return handleRouteError(error, 'Failed to list pending invitations.');
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized context missing');

    const body = await request.json();
    const { email, role, scopeMode, brandIds, locationIds } = body;

    const result = await InvitationService.createInvitation(
      authorizedContext.tenantId,
      { email, role, scopeMode, brandIds, locationIds },
      authorizedContext
    );

    // Dispatch invitation email via EmailService
    const config = getConfig();
    const inviteUrl = `${config.APP_URL}/auth/accept-invite?token=${result.rawToken}`;

    const [tenant, inviter] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: authorizedContext.tenantId },
        select: { name: true },
      }),
      prisma.user.findUnique({
        where: { id: authorizedContext.userId },
        select: { fullName: true, email: true },
      }),
    ]);

    const emailResult = await EmailService.sendInvitation({
      recipientEmail: email,
      inviterName: inviter?.fullName || inviter?.email || 'A team member',
      tenantName: tenant?.name || tenantSlug,
      role: result.invitation.role,
      inviteUrl,
      expiresAt: result.invitation.expiresAt,
    }).catch((err) => {
      return { success: false, error: err?.message || 'Email delivery failed' };
    });

    return NextResponse.json({
      success: true,
      invitation: result.invitation,
      rawToken: result.rawToken, // Sent back for testing / development UI invite link generation
      emailSent: emailResult.success,
    }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, 'Failed to create invitation.');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized context missing');

    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get('invitationId');

    if (!invitationId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'invitationId parameter is required' } },
        { status: 400 }
      );
    }

    await InvitationService.revokeInvitation(authorizedContext.tenantId, invitationId, authorizedContext);
    return NextResponse.json({ success: true, message: 'Invitation revoked.' });
  } catch (error) {
    return handleRouteError(error, 'Failed to revoke invitation.');
  }
}
