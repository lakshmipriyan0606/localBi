import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionCookieManager } from '@/modules/auth/cookies';
import { ContextResolver } from '@/modules/auth/context-resolver';
import { Action, AuthorizationService, Role } from '@/shared/authorization/policy';
import { ExecutiveReportingService } from '@/modules/reporting/executive-reporting-service';
import { ReportExportService } from '@/modules/reporting/report-export-service';
import { handleRouteError } from '@/shared/errors';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params;
    const cookieStore = await cookies();
    const token = SessionCookieManager.getSessionToken(cookieStore);

    const { tenant, authorizedContext } = await ContextResolver.resolveTenantContext(
      token,
      tenantSlug
    );

    if (!tenant || !authorizedContext) {
      return NextResponse.json({ error: 'Tenant context not found' }, { status: 404 });
    }

    AuthorizationService.assertCan(authorizedContext, Action.REPORT_EXPORT);

    const body = await request.json();
    const format = body.format || 'csv'; // 'csv' | 'pdf'
    const exportType = body.type || 'stores'; // 'stores' | 'calls' | 'executive'
    const snapshotId = body.snapshotId as string | undefined;

    let reportDto;
    if (snapshotId) {
      reportDto = await ExecutiveReportingService.getSnapshot(tenant.id, snapshotId);
    } else {
      reportDto = await ExecutiveReportingService.getExecutiveReport({
        token,
        tenantSlug,
        brandId: body.brandId,
        webSurfaceId: body.webSurfaceId,
        storeIds: body.storeIds,
        datePreset: body.datePreset,
        customStartDate: body.startDate,
        customEndDate: body.endDate,
      });
    }

    if (format === 'pdf') {
      const html = ReportExportService.generatePrintableHtml(reportDto);
      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `inline; filename="executive-report-${tenantSlug}-${reportDto.dateRange.startDate}.html"`,
        },
      });
    }

    // Default: CSV export
    let csvContent = '';
    const dateTag = `${reportDto.dateRange.startDate}-to-${reportDto.dateRange.endDate}`;

    if (exportType === 'calls') {
      const isOwnerOrAdmin =
        authorizedContext.role === Role.CLIENT_OWNER || authorizedContext.role === Role.CLIENT_ADMIN;
      csvContent = ReportExportService.exportCallsCsv(reportDto, { allowPii: isOwnerOrAdmin });
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="calls-${tenantSlug}-${dateTag}.csv"`,
        },
      });
    }

    // Default: Store Performance Table CSV
    csvContent = ReportExportService.exportStoresCsv(reportDto);
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="store-performance-${tenantSlug}-${dateTag}.csv"`,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
