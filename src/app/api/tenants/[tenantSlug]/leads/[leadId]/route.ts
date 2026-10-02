import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService } from '@/shared/authorization/policy';
import { LeadService } from '@/modules/leads/lead-service';
import { handleRouteError } from '@/shared/errors';
import type { LeadStatus } from '@prisma/client';

const UpdateLeadSchema = z.object({
  status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'CLOSED', 'SPAM']),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; leadId: string }> }
) {
  try {
    const { tenantSlug, leadId } = await params;
    const cookieStore = await cookies();
    const token = SessionCookieManager.getSessionToken(cookieStore);

    const { tenant, authorizedContext } = await ContextResolver.resolveTenantContext(
      token,
      tenantSlug
    );

    if (!tenant || !authorizedContext) {
      return NextResponse.json({ error: 'Tenant context not found' }, { status: 404 });
    }

    AuthorizationService.assertCan(authorizedContext, Action.DASHBOARD_VIEW);

    const json = await request.json();
    const parsed = UpdateLeadSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid update payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const updated = await LeadService.updateLeadStatus({
      tenantId: tenant.id,
      leadId,
      status: parsed.data.status as LeadStatus,
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
