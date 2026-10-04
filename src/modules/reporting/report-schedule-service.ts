import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { ExecutiveReportingService } from './executive-reporting-service';
import { ClientReportContextService } from './client-report-context-service';
import { createResourceNotFoundError } from '@/shared/errors';
import { EmailService } from '@/modules/email/email-service';
import { getConfig } from '@/shared/config';

export interface CreateReportScheduleInput {
  tenantId: string;
  brandId: string;
  name: string;
  frequency: 'WEEKLY' | 'MONTHLY';
  timezone?: string;
  dayOfWeek?: number; // 0-6 (0=Sun, 1=Mon)
  dayOfMonth?: number; // 1-31
  hourOfDay?: number; // 0-23
  recipients: string[];
  format?: 'PDF' | 'EMAIL_SUMMARY' | 'CSV';
  surfaceId?: string;
  storeIds?: string[];
  userId?: string;
}

export class ReportScheduleService {
  /**
   * Creates a new scheduled reporting cadence.
   */
  public static async createSchedule(input: CreateReportScheduleInput) {
    return TenantContextService.withTenantContext(prisma, input.tenantId, async (tx) => {
      const nextRunAt = this.calculateNextRunAt(
        input.frequency,
        input.hourOfDay ?? 9,
        input.dayOfWeek ?? 1,
        input.dayOfMonth ?? 1
      );

      return tx.reportSchedule.create({
        data: {
          tenantId: input.tenantId,
          brandId: input.brandId,
          name: input.name,
          frequency: input.frequency,
          timezone: input.timezone || 'UTC',
          dayOfWeek: input.dayOfWeek ?? 1,
          dayOfMonth: input.dayOfMonth ?? 1,
          hourOfDay: input.hourOfDay ?? 9,
          recipients: input.recipients,
          format: input.format || 'PDF',
          status: 'ACTIVE',
          filterConfig: {
            webSurfaceId: input.surfaceId,
            storeIds: input.storeIds || [],
          },
          nextRunAt,
          createdBy: input.userId || null,
        },
      });
    });
  }

  /**
   * Lists all report schedules for a tenant brand.
   */
  public static async listSchedules(tenantId: string, brandId: string) {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      return tx.reportSchedule.findMany({
        where: { tenantId, brandId },
        include: {
          deliveries: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  }

  /**
   * Executes a scheduled delivery with strictly enforced idempotency using [tenantId, scheduleId, periodKey, recipient].
   */
  public static async executeScheduledRun(
    tenantId: string,
    scheduleId: string,
    options: { forceResend?: boolean | undefined; token?: string | undefined } = {}
  ) {
    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const schedule = await tx.reportSchedule.findFirst({
        where: { tenantId, id: scheduleId },
        include: { brand: true, tenant: true },
      });

      if (!schedule) {
        throw createResourceNotFoundError('ReportSchedule', scheduleId);
      }

      const periodKey = this.computePeriodKey(schedule.frequency, new Date());
      const recipients = (schedule.recipients as string[]) || [];

      // 1. Generate ReportSnapshot
      const filterCfg = (schedule.filterConfig as { webSurfaceId?: string; storeIds?: string[] }) || {};
      const context = await ClientReportContextService.resolveContext({
        token: options.token || 'system-scheduler',
        tenantSlug: schedule.tenant.slug,
        brandId: schedule.brandId,
        datePreset: schedule.frequency === 'MONTHLY' ? '30d' : '7d',
        webSurfaceId: filterCfg.webSurfaceId ?? undefined,
        storeIds: filterCfg.storeIds ?? undefined,
      });

      const { id: snapshotId } = await ExecutiveReportingService.createSnapshot(
        context,
        `${schedule.name} — ${periodKey}`,
        schedule.createdBy || undefined
      );

      const deliveryResults = [];

      // 2. Deliver to each recipient with idempotency protection
      for (const recipient of recipients) {
        // Check existing delivery for same periodKey
        const existing = await tx.reportDelivery.findUnique({
          where: {
            uq_report_delivery_idempotency: {
              tenantId,
              scheduleId,
              periodKey,
              recipient,
            },
          },
        });

        if (existing && existing.status === 'SENT' && !options.forceResend) {
          deliveryResults.push({
            recipient,
            status: 'SKIPPED',
            reason: 'Already delivered for this period (Idempotency protected)',
          });
          continue;
        }

        // Perform real email delivery with EmailService
        const config = getConfig();
        const reportUrl = `${config.APP_URL}/t/${schedule.tenant.slug}/reports/executive?snapshotId=${snapshotId}`;

        let sendError: string | null = null;
        try {
          const emailResult = await EmailService.sendReport({
            recipientEmail: recipient,
            tenantName: schedule.tenant.name,
            brandName: schedule.brand.name,
            reportName: schedule.name,
            periodKey,
            format: schedule.format as any,
            reportUrl,
          });

          if (!emailResult.success) {
            sendError = emailResult.error || 'Failed to dispatch email';
          }
        } catch (err: any) {
          sendError = err?.message || 'Email delivery exception';
        }

        const deliveryStatus = sendError ? 'FAILED' : 'SENT';

        const delivery = await tx.reportDelivery.upsert({
          where: {
            uq_report_delivery_idempotency: {
              tenantId,
              scheduleId,
              periodKey,
              recipient,
            },
          },
          create: {
            tenantId,
            scheduleId,
            snapshotId,
            periodKey,
            recipient,
            format: schedule.format,
            status: deliveryStatus,
            attempts: 1,
            sentAt: deliveryStatus === 'SENT' ? new Date() : null,
            errorMessage: sendError,
          },
          update: {
            snapshotId,
            status: deliveryStatus,
            attempts: { increment: 1 },
            sentAt: deliveryStatus === 'SENT' ? new Date() : null,
            errorMessage: sendError,
          },
        });

        deliveryResults.push({
          recipient,
          status: deliveryStatus,
          deliveryId: delivery.id,
          error: sendError || undefined,
        });
      }

      // 3. Update schedule timestamps
      const nextRunAt = this.calculateNextRunAt(
        schedule.frequency,
        schedule.hourOfDay,
        schedule.dayOfWeek ?? 1,
        schedule.dayOfMonth ?? 1
      );

      await tx.reportSchedule.update({
        where: { id: scheduleId },
        data: {
          lastRunAt: new Date(),
          nextRunAt,
        },
      });

      return {
        scheduleId,
        periodKey,
        snapshotId,
        deliveries: deliveryResults,
      };
    });
  }

  /**
   * Computes a deterministic period key (e.g. weekly_2026_w40, monthly_2026_10) for idempotency.
   */
  public static computePeriodKey(frequency: string, date: Date): string {
    const year = date.getUTCFullYear();
    if (frequency === 'MONTHLY') {
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      return `monthly_${year}_${month}`;
    }
    // Weekly calculation (ISO week number)
    const firstDayOfYear = new Date(Date.UTC(year, 0, 1));
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getUTCDay() + 1) / 7);
    return `weekly_${year}_w${weekNum}`;
  }

  /**
   * Computes next timestamp when report schedule should trigger.
   */
  public static calculateNextRunAt(
    frequency: string,
    hourOfDay: number,
    dayOfWeek: number,
    dayOfMonth: number
  ): Date {
    const now = new Date();
    const next = new Date(now);
    next.setUTCHours(hourOfDay, 0, 0, 0);

    if (frequency === 'WEEKLY') {
      const currentDay = next.getUTCDay();
      const diff = (dayOfWeek + 7 - currentDay) % 7;
      next.setUTCDate(next.getUTCDate() + (diff === 0 && next <= now ? 7 : diff));
    } else if (frequency === 'MONTHLY') {
      next.setUTCDate(dayOfMonth);
      if (next <= now) {
        next.setUTCMonth(next.getUTCMonth() + 1);
      }
    } else {
      // Daily fallback
      if (next <= now) {
        next.setUTCDate(next.getUTCDate() + 1);
      }
    }

    return next;
  }
}
