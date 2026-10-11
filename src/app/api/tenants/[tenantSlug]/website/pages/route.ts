import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { SiteStudioService } from '@/modules/page-builder/site-studio-service';
import { prisma } from '@/shared/database/client';
import { handleRouteError } from '@/shared/errors';

export async function GET(
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
    const brandId = await SiteStudioService.resolveBrandId(
      authorizedContext.tenantId,
      searchParams.get('brandId')
    );

    if (!brandId) {
      return NextResponse.json({ success: true, pages: [] });
    }

    const [pages, brandRecord, domainRecord] = await Promise.all([
      SiteStudioService.listSitePages(authorizedContext.tenantId, brandId),
      prisma.brand.findUnique({
        where: { id: brandId },
        select: { id: true, name: true, slug: true },
      }),
      prisma.domain.findFirst({
        where: { tenantId: authorizedContext.tenantId, brandId, isPrimary: true },
        select: { id: true, hostname: true, isPrimary: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      pages,
      brandId,
      brand: brandRecord,
      domain: domainRecord,
    });
  } catch (error) {
    return handleRouteError(error, 'Failed to list website pages.');
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
    const brandId = await SiteStudioService.resolveBrandId(
      authorizedContext.tenantId,
      body.brandId
    );

    if (!brandId) {
      return NextResponse.json(
        { success: false, error: 'A brand is required to create a landing page.' },
        { status: 400 }
      );
    }

    // Handle Page Duplication
    if (body.action === 'DUPLICATE') {
      if (!body.pageId) {
        return NextResponse.json(
          { success: false, error: 'pageId is required for duplication.' },
          { status: 400 }
        );
      }
      const duplicated = await SiteStudioService.duplicatePage(
        authorizedContext.tenantId,
        brandId,
        body.pageId
      );
      return NextResponse.json({ success: true, page: duplicated });
    }

    // Handle standard Landing Page Creation
    const newPage = await SiteStudioService.createLandingPage(
      authorizedContext.tenantId,
      brandId,
      {
        name: body.name,
        pageType: body.pageType || 'LANDING',
        slug: body.slug,
        citySlug: body.citySlug,
        storeId: body.storeId,
        categoryId: body.categoryId,
        productId: body.productId,
      }
    );

    return NextResponse.json({ success: true, page: newPage });
  } catch (error) {
    return handleRouteError(error, 'Failed to create or duplicate page.');
  }
}

export async function PATCH(
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
    const brandId = await SiteStudioService.resolveBrandId(
      authorizedContext.tenantId,
      body.brandId
    );

    if (!brandId) {
      return NextResponse.json(
        { success: false, error: 'A brand is required to publish.' },
        { status: 400 }
      );
    }

    if (body.action === 'PUBLISH_ALL') {
      const result = await SiteStudioService.publishAllDrafts(
        authorizedContext.tenantId,
        brandId
      );
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json(
      { success: false, error: `Unsupported action: "${body.action}"` },
      { status: 400 }
    );
  } catch (error) {
    return handleRouteError(error, 'Failed to update pages.');
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
    const pageId = searchParams.get('pageId');

    if (!pageId) {
      return NextResponse.json(
        { success: false, error: 'pageId is required to delete.' },
        { status: 400 }
      );
    }

    // 1. Look up the page first within the tenant context
    const existingPage = await prisma.page.findFirst({
      where: {
        id: pageId,
        tenantId: authorizedContext.tenantId,
      },
    });

    // 2. If already deleted, return success idempotently
    if (!existingPage) {
      return NextResponse.json({
        success: true,
        message: 'Page already removed or does not exist.',
      });
    }

    // 3. Protect Root Home Page from deletion
    if (existingPage.slug === '/' || existingPage.pageType === 'HOME') {
      return NextResponse.json(
        {
          success: false,
          error: 'The Home page (/) is required for the storefront and cannot be deleted.',
        },
        { status: 400 }
      );
    }

    // 4. Safely delete the page
    const templateId = existingPage.templateId;
    await prisma.page.delete({
      where: {
        id: existingPage.id,
      },
    });

    // 5. Clean up associated template if no other pages share it
    if (templateId) {
      const remainingPagesWithTemplate = await prisma.page.count({
        where: {
          templateId,
        },
      });

      if (remainingPagesWithTemplate === 0) {
        try {
          await prisma.pageTemplate.delete({
            where: { id: templateId },
          });
        } catch (templateErr) {
          // Non-blocking cleanup: page is already deleted
          console.warn('Orphaned template cleanup skipped:', templateErr);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, 'Failed to delete page.');
  }
}
