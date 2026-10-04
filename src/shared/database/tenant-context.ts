import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from './client';

export type TenantTransactionClient = Prisma.TransactionClient;

export class TenantContextService {
  /**
   * Executes a database operation within an authorized context's tenant scope.
   */
  public static async runWithContext<T>(
    context: { tenantId: string },
    operation: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    return this.withTenantContext(prisma, context.tenantId, operation);
  }

  /**
   * Executes a database operation within a tenant scope using default prisma client.
   */
  public static async runWithTenantContext<T>(
    tenantId: string,
    operation: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    return this.withTenantContext(prisma, tenantId, operation);
  }

  /**
   * Alias for runWithTenantContext.
   */
  public static async runWithTenant<T>(
    tenantId: string,
    operation: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    return this.withTenantContext(prisma, tenantId, operation);
  }
  /**
   * Executes a database operation within a dedicated PostgreSQL transaction,
   * strictly setting `app.current_tenant_id` for row-level security enforcement.
   */
  public static async withTenantContext<T>(
    prisma: PrismaClient,
    tenantId: string,
    operation: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    if (!tenantId || typeof tenantId !== 'string' || tenantId.trim() === '') {
      throw new Error('SECURITY_VIOLATION: Valid tenantId is required for tenant data plane execution');
    }

    return prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Parameterized configuration parameter set inside transaction boundary (is_local = true)
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;

        return operation(tx);
      },
      { timeout: 15000 }
    );
  }

  /**
   * Executes a database operation within the Control Plane, setting `app.current_user_id`
   * for user-scoped tenant discovery queries.
   */
  public static async withUserControlPlaneContext<T>(
    prisma: PrismaClient,
    userId: string,
    operation: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('SECURITY_VIOLATION: Valid userId is required for control plane execution');
    }

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, true)`;

      return operation(tx);
    });
  }

  /**
   * Executes a database operation within a transaction boundary scoped strictly to
   * published public data (`app.public_read_scope = 'published_only'`).
   * Mutation attempts are rejected by RLS.
   */
  public static async withPublicReadContext<T>(
    prisma: PrismaClient,
    operation: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$executeRaw`SELECT set_config('app.public_read_scope', 'published_only', true)`;

      return operation(tx);
    });
  }

  /**
   * Executes a database operation within a transaction boundary scoped strictly to
   * virtual tracking number discovery for inbound telephony webhooks (`app.telephony_lookup_scope = 'number_lookup'`).
   * Mutation attempts are rejected by RLS.
   */
  public static async withTelephonyLookupContext<T>(
    prisma: PrismaClient,
    operation: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$executeRaw`SELECT set_config('app.telephony_lookup_scope', 'number_lookup', true)`;

      return operation(tx);
    });
  }
}
