import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '../../../../../modules/auth/cookies';
import { ContextResolver } from '../../../../../modules/auth/context-resolver';
import { MembershipService } from '../../../../../modules/memberships/membership-service';
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

    const members = await MembershipService.listMembers(authorizedContext.tenantId, authorizedContext);
    return NextResponse.json({ success: true, members });
  } catch (error) {
    return handleRouteError(error, 'Failed to list team members.');
  }
}

export async function PUT(
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
    const { membershipId, role, scopeMode, brandIds, locationIds } = body;

    await MembershipService.updateMemberRoleAndScope(
      authorizedContext.tenantId,
      membershipId,
      role,
      scopeMode,
      brandIds,
      locationIds,
      authorizedContext
    );

    return NextResponse.json({ success: true, message: 'Member role and scopes updated.' });
  } catch (error) {
    return handleRouteError(error, 'Failed to update member.');
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
    const membershipId = searchParams.get('membershipId');
    const action = searchParams.get('action'); // 'suspend' | 'remove'

    if (!membershipId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'membershipId parameter is required' } },
        { status: 400 }
      );
    }

    if (action === 'suspend') {
      await MembershipService.suspendMember(authorizedContext.tenantId, membershipId, authorizedContext);
      return NextResponse.json({ success: true, message: 'Member suspended.' });
    }

    await MembershipService.removeMember(authorizedContext.tenantId, membershipId, authorizedContext);
    return NextResponse.json({ success: true, message: 'Member removed.' });
  } catch (error) {
    return handleRouteError(error, 'Failed to process member removal.');
  }
}
