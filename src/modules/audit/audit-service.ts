import { prisma } from '../../shared/database/client';
import { Prisma } from '@prisma/client';
import { TenantContextService } from '../../shared/database/tenant-context';
import { AuthorizedContext, AuthorizationService, Action } from '../../shared/authorization/policy';
import { createTenantAccessDeniedError } from '../../shared/errors';

export interface AuditEventInput {
  tenantId?: string | null;
  actorId: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogDto {
  id: string;
  tenantId: string | null;
  actorId: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  oldValues: unknown;
  newValues: unknown;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
}

// Redact sensitive keys from stored audit logs
const SENSITIVE_AUDIT_KEYS = new Set([
  'password',
  'passwordHash',
  'rawToken',
  'tokenHash',
  'sessionToken',
  'sessionTokenHash',
  'secret',
  'clientSecret',
  'refreshToken',
  'encryptedRefreshToken',
]);

function redactPayload(payload?: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (SENSITIVE_AUDIT_KEYS.has(key)) {
      cleaned[key] = '[REDACTED_SECRET]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      cleaned[key] = redactPayload(value as Record<string, unknown>);
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

export class AuditService {
  /**
   * Records an append-only audit event with strict secret redaction.
   */
  public static async recordEvent(input: AuditEventInput): Promise<AuditLogDto> {
    const safeOld = redactPayload(input.oldValues);
    const safeNew = redactPayload(input.newValues);

    const logData: Prisma.AuditLogUncheckedCreateInput = {
      tenantId: input.tenantId || null,
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      ipAddress: input.ipAddress || 'UNKNOWN',
      userAgent: input.userAgent || 'UNKNOWN',
      ...(safeOld ? { oldValues: safeOld as Prisma.InputJsonValue } : {}),
      ...(safeNew ? { newValues: safeNew as Prisma.InputJsonValue } : {}),
    };

    if (input.tenantId) {
      return TenantContextService.withTenantContext(prisma, input.tenantId, async (tx) => {
        return tx.auditLog.create({ data: logData });
      });
    }

    return prisma.auditLog.create({ data: logData });
  }

  /**
   * Lists audit logs for an authorized tenant admin with pagination.
   */
  public static async listTenantAuditLogs(
    tenantId: string,
    options: { page?: number; limit?: number; resourceType?: string; actorId?: string } = {},
    context: AuthorizedContext
  ): Promise<{ items: AuditLogDto[]; totalCount: number; page: number; totalPages: number }> {
    AuthorizationService.assertCan(context, Action.TENANT_VIEW);

    if (context.tenantId !== tenantId) {
      throw createTenantAccessDeniedError(tenantId);
    }

    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const whereClause = {
        tenantId,
        ...(options.resourceType ? { resourceType: options.resourceType } : {}),
        ...(options.actorId ? { actorId: options.actorId } : {}),
      };

      const [totalCount, items] = await Promise.all([
        tx.auditLog.count({ where: whereClause }),
        tx.auditLog.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
      ]);

      return {
        items,
        totalCount,
        page,
        totalPages: Math.ceil(totalCount / limit) || 1,
      };
    });
  }
}
