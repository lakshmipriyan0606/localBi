import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '../../../../../modules/auth/cookies';
import { ContextResolver } from '../../../../../modules/auth/context-resolver';
import { InvitationService } from '../../../../../modules/invitations/invitation-service';
import { AppError } from '../../../../../shared/errors';

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
    if (error instanceof AppError) {
      return NextResponse.json(error.toClientResponse(), { status: error.statusCode });
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to list pending invitations.' } },
      { status: 500 }
    );
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

    return NextResponse.json({
      success: true,
      invitation: result.invitation,
      rawToken: result.rawToken, // Sent back for testing / development UI invite link generation
    }, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toClientResponse(), { status: error.statusCode });
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create invitation.' } },
      { status: 500 }
    );
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
    if (error instanceof AppError) {
      return NextResponse.json(error.toClientResponse(), { status: error.statusCode });
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to revoke invitation.' } },
      { status: 500 }
    );
  }
}
