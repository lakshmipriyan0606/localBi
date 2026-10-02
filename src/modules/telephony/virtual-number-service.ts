import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { AppError, ErrorCode } from '@/shared/errors';
import { TelephonyRegistry } from './telephony-registry';
import {
  PhoneUtils,
  VirtualNumberDto,
  VirtualNumberStatus,
} from './telephony-types';
import { AvailableNumberItem } from './telephony-provider';

export interface ProvisionNumberInput {
  tenantId: string;
  brandId: string;
  storeId?: string | null | undefined;
  webSurfaceId?: string | null | undefined;
  phoneNumber: string;
  countryCode?: string | undefined;
  providerName?: string | undefined;
  capabilities?: Record<string, any> | undefined;
  webhookBaseUrl?: string | undefined;
}

export interface UpdateStoreDestinationInput {
  tenantId: string;
  brandId: string;
  storeId: string;
  destinationPhone: string;
  providerName?: string | undefined;
}

export interface ResolvePublicPhoneResult {
  displayPhone: string | null;
  isVirtual: boolean;
  virtualNumberId: string | null;
  realPhone: string | null;
}

export class VirtualNumberService {
  /**
   * List available virtual tracking numbers that can be provisioned from the provider pool.
   */
  public static async listAvailableNumbers(params: {
    providerName?: string | undefined;
    countryCode?: string | undefined;
    pattern?: string | undefined;
    limit?: number | undefined;
  }): Promise<AvailableNumberItem[]> {
    const provider = TelephonyRegistry.getProvider(params.providerName);
    return provider.listAvailableNumbers({
      countryCode: params.countryCode,
      pattern: params.pattern,
      limit: params.limit,
    });
  }

  /**
   * Provision a virtual tracking number from telephony provider and assign it
   * to a store (and optional web surface) with fail-closed forwarding configuration.
   */
  public static async provisionAndAssignNumber(
    input: ProvisionNumberInput
  ): Promise<VirtualNumberDto> {
    const {
      tenantId,
      brandId,
      storeId,
      webSurfaceId,
      phoneNumber,
      countryCode = 'IN',
      providerName,
      capabilities,
      webhookBaseUrl,
    } = input;

    const normalizedPhone = PhoneUtils.normalizePhoneNumber(phoneNumber);
    if (!PhoneUtils.isValidE164(normalizedPhone)) {
      throw new AppError({
        code: ErrorCode.INVALID_PHONE_NUMBER,
        message: `Invalid phone number format: ${phoneNumber}. Must be E.164 compliant.`,
        statusCode: 400,
      });
    }

    const provider = TelephonyRegistry.getProvider(providerName);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // 1. Verify tenant & brand existence
      const brand = await tx.brand.findUnique({
        where: {
          uq_brand_tenant_id: {
            tenantId,
            id: brandId,
          },
        },
      });
      if (!brand) {
        throw new AppError({
          code: ErrorCode.RESOURCE_NOT_FOUND,
          message: `Brand ${brandId} not found in tenant`,
          statusCode: 404,
        });
      }

      // 2. Check if virtual number already exists in tenant
      const existing = await tx.virtualNumber.findUnique({
        where: {
          uq_virtual_number_phone: {
            tenantId,
            phoneNumber: normalizedPhone,
          },
        },
      });

      if (existing && existing.status === 'ACTIVE') {
        throw new AppError({
          code: ErrorCode.VIRTUAL_NUMBER_ALREADY_ASSIGNED,
          message: `Virtual number ${normalizedPhone} is already active in this tenant`,
          statusCode: 409,
        });
      }

      // 3. Resolve store destination phone if assigned to a store
      let forwardingNumber: string | null = null;
      if (storeId) {
        const store = await tx.location.findUnique({
          where: {
            uq_location_tenant_brand_id: {
              tenantId,
              brandId,
              id: storeId,
            },
          },
        });

        if (!store) {
          throw new AppError({
            code: ErrorCode.RESOURCE_NOT_FOUND,
            message: `Store ${storeId} not found in brand`,
            statusCode: 404,
          });
        }

        forwardingNumber = store.phone ? PhoneUtils.normalizePhoneNumber(store.phone) : null;
      }

      // 4. Provision number on the telephony provider
      const baseUrl = webhookBaseUrl || process.env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000';
      const webhookUrl = `${baseUrl}/api/webhooks/telephony/${provider.name.toLowerCase()}`;
      const provResult = await provider.provisionNumber({
        phoneNumber: normalizedPhone,
        countryCode,
        webhookUrl,
        label: `Store_${storeId || 'Unassigned'}`,
      });

      if (!provResult.success) {
        throw new AppError({
          code: ErrorCode.TELEPHONY_PROVIDER_ERROR,
          message: `Provider ${provider.name} failed to provision number: ${provResult.error || 'Unknown error'}`,
          statusCode: 502,
        });
      }

      // 5. If store has a forwarding number, configure forwarding immediately (fail-closed)
      if (forwardingNumber) {
        const fwdResult = await provider.configureForwarding({
          providerNumberId: provResult.providerNumberId,
          phoneNumber: normalizedPhone,
          destinationNumber: forwardingNumber,
        });

        if (!fwdResult.success) {
          // Attempt rollback/release to not leave an unforwarded active number
          await provider.releaseNumber({
            providerNumberId: provResult.providerNumberId,
            phoneNumber: normalizedPhone,
          }).catch(() => {});

          throw new AppError({
            code: ErrorCode.FORWARDING_UPDATE_FAILED,
            message: `Failed to configure call forwarding to store phone ${forwardingNumber}: ${fwdResult.error || 'Provider rejection'}`,
            statusCode: 502,
          });
        }
      }

      // 6. Upsert/Create VirtualNumber record in PostgreSQL
      const created = await tx.virtualNumber.upsert({
        where: {
          uq_virtual_number_phone: {
            tenantId,
            phoneNumber: normalizedPhone,
          },
        },
        create: {
          tenantId,
          brandId,
          storeId: storeId || null,
          webSurfaceId: webSurfaceId || null,
          provider: provider.name,
          providerNumberId: provResult.providerNumberId,
          phoneNumber: normalizedPhone,
          countryCode,
          forwardingNumber,
          status: 'ACTIVE',
          capabilities: (capabilities || { voice: true, sms: false }) as any,
          activatedAt: new Date(),
        },
        update: {
          brandId,
          storeId: storeId || null,
          webSurfaceId: webSurfaceId || null,
          provider: provider.name,
          providerNumberId: provResult.providerNumberId,
          forwardingNumber,
          status: 'ACTIVE',
          capabilities: (capabilities || { voice: true, sms: false }) as any,
          activatedAt: new Date(),
          releasedAt: null,
        },
      });

      return {
        id: created.id,
        tenantId: created.tenantId,
        brandId: created.brandId,
        storeId: created.storeId,
        webSurfaceId: created.webSurfaceId,
        provider: created.provider,
        providerNumberId: created.providerNumberId,
        phoneNumber: created.phoneNumber,
        countryCode: created.countryCode,
        forwardingNumber: created.forwardingNumber,
        status: created.status as VirtualNumberStatus,
        capabilities: created.capabilities as Record<string, any> | null,
        createdAt: created.createdAt,
        activatedAt: created.activatedAt,
        releasedAt: created.releasedAt,
      };
    });
  }

  /**
   * Updates store's real destination phone and synchronizes provider forwarding
   * on all virtual tracking numbers assigned to that store.
   */
  public static async updateStoreDestinationPhone(
    input: UpdateStoreDestinationInput
  ): Promise<{ updatedCount: number; newDestinationPhone: string }> {
    const { tenantId, brandId, storeId, destinationPhone, providerName } = input;
    const normalizedDest = PhoneUtils.normalizePhoneNumber(destinationPhone);

    if (!PhoneUtils.isValidE164(normalizedDest)) {
      throw new AppError({
        code: ErrorCode.INVALID_PHONE_NUMBER,
        message: `Invalid destination phone number: ${destinationPhone}`,
        statusCode: 400,
      });
    }

    const provider = TelephonyRegistry.getProvider(providerName);

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      // 1. Verify store exists
      const store = await tx.location.findUnique({
        where: {
          uq_location_tenant_brand_id: {
            tenantId,
            brandId,
            id: storeId,
          },
        },
      });

      if (!store) {
        throw new AppError({
          code: ErrorCode.RESOURCE_NOT_FOUND,
          message: `Store ${storeId} not found`,
          statusCode: 404,
        });
      }

      // 2. Fetch all active virtual numbers assigned to this store
      const activeNumbers = await tx.virtualNumber.findMany({
        where: {
          tenantId,
          brandId,
          storeId,
          status: 'ACTIVE',
        },
      });

      // 3. Update forwarding on provider for each active number (fail-closed)
      for (const num of activeNumbers) {
        const fwdResult = await provider.configureForwarding({
          providerNumberId: num.providerNumberId || undefined,
          phoneNumber: num.phoneNumber,
          destinationNumber: normalizedDest,
        });

        if (!fwdResult.success) {
          throw new AppError({
            code: ErrorCode.FORWARDING_UPDATE_FAILED,
            message: `Failed to update call forwarding on virtual number ${num.phoneNumber}: ${fwdResult.error || 'Provider rejected'}`,
            statusCode: 502,
          });
        }
      }

      // 4. Update store's real destination phone
      await tx.location.update({
        where: {
          uq_location_tenant_brand_id: {
            tenantId,
            brandId,
            id: storeId,
          },
        },
        data: {
          phone: normalizedDest,
        },
      });

      // 5. Update forwardingNumber on all active virtual numbers in DB
      if (activeNumbers.length > 0) {
        await tx.virtualNumber.updateMany({
          where: {
            tenantId,
            brandId,
            storeId,
            status: 'ACTIVE',
          },
          data: {
            forwardingNumber: normalizedDest,
          },
        });
      }

      return {
        updatedCount: activeNumbers.length,
        newDestinationPhone: normalizedDest,
      };
    });
  }

  /**
   * Release a virtual tracking number back to the provider.
   * Preserves historical call records (does NOT delete the row, only marks RELEASED).
   */
  public static async releaseNumber(input: {
    tenantId: string;
    virtualNumberId: string;
    providerName?: string | undefined;
  }): Promise<VirtualNumberDto> {
    const { tenantId, virtualNumberId, providerName } = input;

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const vnum = await tx.virtualNumber.findUnique({
        where: {
          uq_virtual_number_tenant_id: {
            tenantId,
            id: virtualNumberId,
          },
        },
      });

      if (!vnum) {
        throw new AppError({
          code: ErrorCode.VIRTUAL_NUMBER_NOT_FOUND,
          message: `Virtual number ${virtualNumberId} not found`,
          statusCode: 404,
        });
      }

      const provider = TelephonyRegistry.getProvider(providerName || vnum.provider);

      // Release on provider
      const relResult = await provider.releaseNumber({
        providerNumberId: vnum.providerNumberId || undefined,
        phoneNumber: vnum.phoneNumber,
      });

      if (!relResult.success) {
        throw new AppError({
          code: ErrorCode.TELEPHONY_PROVIDER_ERROR,
          message: `Failed to release number ${vnum.phoneNumber}: ${relResult.error || 'Provider rejected'}`,
          statusCode: 502,
        });
      }

      // Update DB status to RELEASED while preserving calls relation
      const updated = await tx.virtualNumber.update({
        where: {
          uq_virtual_number_tenant_id: {
            tenantId,
            id: virtualNumberId,
          },
        },
        data: {
          status: 'RELEASED',
          releasedAt: relResult.releasedAt || new Date(),
        },
      });

      return {
        id: updated.id,
        tenantId: updated.tenantId,
        brandId: updated.brandId,
        storeId: updated.storeId,
        webSurfaceId: updated.webSurfaceId,
        provider: updated.provider,
        providerNumberId: updated.providerNumberId,
        phoneNumber: updated.phoneNumber,
        countryCode: updated.countryCode,
        forwardingNumber: updated.forwardingNumber,
        status: updated.status as VirtualNumberStatus,
        capabilities: updated.capabilities as Record<string, any> | null,
        createdAt: updated.createdAt,
        activatedAt: updated.activatedAt,
        releasedAt: updated.releasedAt,
      };
    });
  }

  /**
   * Resolves the phone number that should be rendered on a public store page or CTA button.
   * If an active virtual tracking number is mapped to the store/surface, it is returned.
   * Otherwise, falls back to the store's real telephone number.
   */
  public static async resolvePublicPhone(input: {
    tenantId: string;
    storeId: string;
    webSurfaceId?: string | null | undefined;
  }): Promise<ResolvePublicPhoneResult> {
    const { tenantId, storeId, webSurfaceId } = input;

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const store = await tx.location.findUnique({
        where: {
          id: storeId,
        },
        select: {
          id: true,
          name: true,
          phone: true,
        },
      });

      const realPhone = store?.phone || null;

      // 1. Try webSurface-specific virtual number first
      if (webSurfaceId) {
        const surfaceNum = await tx.virtualNumber.findFirst({
          where: {
            tenantId,
            storeId,
            webSurfaceId,
            status: 'ACTIVE',
          },
        });

        if (surfaceNum) {
          return {
            displayPhone: surfaceNum.phoneNumber,
            isVirtual: true,
            virtualNumberId: surfaceNum.id,
            realPhone,
          };
        }
      }

      // 2. Try store-level virtual number
      const storeNum = await tx.virtualNumber.findFirst({
        where: {
          tenantId,
          storeId,
          status: 'ACTIVE',
        },
      });

      if (storeNum) {
        return {
          displayPhone: storeNum.phoneNumber,
          isVirtual: true,
          virtualNumberId: storeNum.id,
          realPhone,
        };
      }

      // 3. Fallback to store real phone
      return {
        displayPhone: realPhone,
        isVirtual: false,
        virtualNumberId: null,
        realPhone,
      };
    });
  }

  /**
   * Lists virtual numbers for a tenant with optional brand, store, and status filtering.
   */
  public static async listVirtualNumbers(input: {
    tenantId: string;
    brandId?: string | undefined;
    storeId?: string | undefined;
    status?: VirtualNumberStatus | undefined;
  }): Promise<VirtualNumberDto[]> {
    const { tenantId, brandId, storeId, status } = input;

    return TenantContextService.withTenantContext(prisma, tenantId, async (tx) => {
      const where: any = { tenantId };
      if (brandId) where.brandId = brandId;
      if (storeId) where.storeId = storeId;
      if (status) where.status = status;

      const numbers = await tx.virtualNumber.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      return numbers.map((n) => ({
        id: n.id,
        tenantId: n.tenantId,
        brandId: n.brandId,
        storeId: n.storeId,
        webSurfaceId: n.webSurfaceId,
        provider: n.provider,
        providerNumberId: n.providerNumberId,
        phoneNumber: n.phoneNumber,
        countryCode: n.countryCode,
        forwardingNumber: n.forwardingNumber,
        status: n.status as VirtualNumberStatus,
        capabilities: n.capabilities as Record<string, any> | null,
        createdAt: n.createdAt,
        activatedAt: n.activatedAt,
        releasedAt: n.releasedAt,
      }));
    });
  }
}
