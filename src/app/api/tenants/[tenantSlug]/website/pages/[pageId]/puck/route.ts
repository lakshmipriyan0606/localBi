import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { handleRouteError, createNotFoundError } from '@/shared/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; pageId: string }> }
) {
  try {
    const { tenantSlug, pageId } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized context missing');

    const result = await TenantContextService.withTenantContext(
      prisma,
      authorizedContext.tenantId,
      async (tx) => {
        const page = await tx.page.findFirst({
          where: { tenantId: authorizedContext.tenantId, id: pageId },
        });

        if (!page) {
          throw createNotFoundError('Page not found.');
        }

        const template = await tx.pageTemplate.findUniqueOrThrow({
          where: { id: page.templateId },
          include: {
            versions: {
              orderBy: { version: 'desc' },
            },
          },
        });

        const latestVersion = template.versions[0];
        const publishedVersion = template.versions.find((v) => v.status === 'PUBLISHED');

        // Safe fallback puck data if content is empty
        const puckData = (latestVersion?.puckData as any) || {
          content: [],
          root: { props: {} },
        };

        const historicalVersions = template.versions.map((v) => ({
          id: v.id,
          version: v.version,
          status: v.status,
          publishedAt: v.publishedAt,
          createdAt: v.createdAt,
        }));

        return {
          page: {
            id: page.id,
            slug: page.slug,
            pageType: page.pageType,
            status: page.status,
          },
          template: {
            id: template.id,
            name: template.name,
            type: template.type,
          },
          puckData,
          currentVersion: latestVersion?.version || 1,
          publishedVersion: publishedVersion?.version || null,
          historicalVersions,
        };
      }
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return handleRouteError(error, 'Failed to fetch page builder data.');
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; pageId: string }> }
) {
  try {
    const { tenantSlug, pageId } = await params;
    const cookieStore = await cookies();
    const rawToken = SessionCookieManager.getSessionToken(cookieStore);

    const { authorizedContext, user } = await ContextResolver.resolveTenantContext(rawToken, tenantSlug);
    if (!authorizedContext) throw new Error('Unauthorized context missing');

    const body = await request.json();
    const { puckData } = body;

    if (!puckData || typeof puckData !== 'object') {
      return NextResponse.json(
        { success: false, error: 'puckData object is required.' },
        { status: 400 }
      );
    }

    const updated = await TenantContextService.withTenantContext(
      prisma,
      authorizedContext.tenantId,
      async (tx) => {
        const page = await tx.page.findFirst({
          where: { tenantId: authorizedContext.tenantId, id: pageId },
        });

        if (!page) {
          throw createNotFoundError('Page not found.');
        }

        const template = await tx.pageTemplate.findUniqueOrThrow({
          where: { id: page.templateId },
          include: {
            versions: {
              orderBy: { version: 'desc' },
              take: 1,
            },
          },
        });

        const latestVersion = template.versions[0];

        if (latestVersion && latestVersion.status === 'DRAFT') {
          // Update the existing draft version
          const v = await tx.pageTemplateVersion.update({
            where: { id: latestVersion.id },
            data: {
              puckData,
              createdBy: user?.id,
            },
          });
          return { version: v.version, status: v.status };
        } else {
          // Latest is published or none exists; create new draft version
          const nextVer = latestVersion ? latestVersion.version + 1 : 1;
          const v = await tx.pageTemplateVersion.create({
            data: {
              tenantId: authorizedContext.tenantId,
              pageTemplateId: template.id,
              version: nextVer,
              puckData,
              status: 'DRAFT',
              createdBy: user?.id,
            },
          });
          return { version: v.version, status: v.status };
        }
      }
    );

    return NextResponse.json({ success: true, ...updated });
  } catch (error) {
    return handleRouteError(error, 'Failed to save page builder draft.');
  }
}
