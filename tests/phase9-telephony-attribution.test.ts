import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'node:crypto';
import { prisma } from '../src/shared/database/client';
import { TenantContextService } from '../src/shared/database/tenant-context';
import { Role } from '../src/shared/authorization/policy';
import { TelephonyRegistry } from '../src/modules/telephony/telephony-registry';
import { TestTelephonyAdapter } from '../src/modules/telephony/test-telephony-adapter';
import { VirtualNumberService } from '../src/modules/telephony/virtual-number-service';
import { CallIngestionService } from '../src/modules/telephony/call-ingestion-service';
import { CallDashboardService } from '../src/modules/telephony/call-dashboard-service';
import { normalizeEmail } from '../src/modules/auth/email-normalizer';

describe('Phase 9: Virtual Number Mapping + Call Tracking + Telephony Attribution Engine', () => {
  let tenantAId: string;
  let tenantBId: string;
  let brandAId: string;
  let brandA2Id: string;
  let brandBId: string;
  let storeA1Id: string; // Mannadi Store (+919840111111)
  let storeA2Id: string; // T Nagar Store (+919840222222)
  let storeA3Id: string; // Anna Nagar Store (Brand A2)
  let storeB1Id: string; // Indiranagar Store (+919840333333)
  let webSurfaceA1Id: string;
  let webSurfaceB1Id: string;
  let userAId: string;
  let userViewerId: string;
  let userBId: string;
  let testAdapter: TestTelephonyAdapter;
  const testSecret = 'test_telephony_secret_key_12345';

  const trackingPhoneA1 = '+914441112222';
  const trackingPhoneA2 = '+914441113333';
  const trackingPhoneB1 = '+918041114444';

  beforeAll(async () => {
    // 0. Register TestTelephonyAdapter with deterministic secret
    testAdapter = new TestTelephonyAdapter(testSecret);
    TelephonyRegistry.registerProvider(testAdapter);
    TelephonyRegistry.setDefaultProviderName('TEST_ADAPTER');

    const idSuffix = crypto.randomBytes(4).toString('hex');

    // 1. Setup Tenant A
    const userA = await prisma.user.create({
      data: {
        email: normalizeEmail(`owner-a-call-${idSuffix}@example.com`),
        fullName: 'Tenant A Owner',
        status: 'ACTIVE',
      },
    });
    userAId = userA.id;

    const userViewer = await prisma.user.create({
      data: {
        email: normalizeEmail(`viewer-a-call-${idSuffix}@example.com`),
        fullName: 'Tenant A Viewer',
        status: 'ACTIVE',
      },
    });
    userViewerId = userViewer.id;

    const tenantA = await prisma.tenant.create({
      data: {
        name: `Tenant A Telephony ${idSuffix}`,
        slug: `tenant-a-telephony-${idSuffix}`,
        timezone: 'Asia/Kolkata',
      },
    });
    tenantAId = tenantA.id;

    // 1. Setup Tenant A under RLS context
    await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
      await tx.tenantMembership.createMany({
        data: [
          {
            tenantId: tenantAId,
            userId: userAId,
            role: Role.CLIENT_OWNER,
            scopeMode: 'ALL',
          },
          {
            tenantId: tenantAId,
            userId: userViewerId,
            role: Role.VIEWER,
            scopeMode: 'ALL',
          },
        ],
      });

      const brandA = await tx.brand.create({
        data: {
          tenantId: tenantAId,
          name: 'Aalim Perfumes',
          slug: `aalim-perfumes-${idSuffix}`,
        },
      });
      brandAId = brandA.id;

      const brandA2 = await tx.brand.create({
        data: {
          tenantId: tenantAId,
          name: 'Aalim Attar',
          slug: `aalim-attar-${idSuffix}`,
        },
      });
      brandA2Id = brandA2.id;

      const surfaceA1 = await tx.webSurface.create({
        data: {
          tenantId: tenantAId,
          brandId: brandAId,
          name: 'Aalim Perfumes Microsite',
          type: 'LOCALBI',
        },
      });
      webSurfaceA1Id = surfaceA1.id;

      const storeA1 = await tx.location.create({
        data: {
          tenantId: tenantAId,
          brandId: brandAId,
          name: 'Mannadi Store',
          storeCode: `CHE-MAN-${idSuffix}`,
          addressLine1: '12 Angappa Naicken St',
          city: 'Chennai',
          state: 'Tamil Nadu',
          postalCode: '600001',
          country: 'IN',
          phone: '+919840111111',
        },
      });
      storeA1Id = storeA1.id;

      const storeA2 = await tx.location.create({
        data: {
          tenantId: tenantAId,
          brandId: brandAId,
          name: 'T Nagar Store',
          storeCode: `CHE-TNG-${idSuffix}`,
          addressLine1: '45 Usman Road',
          city: 'Chennai',
          state: 'Tamil Nadu',
          postalCode: '600017',
          country: 'IN',
          phone: '+919840222222',
        },
      });
      storeA2Id = storeA2.id;

      const storeA3 = await tx.location.create({
        data: {
          tenantId: tenantAId,
          brandId: brandA2Id,
          name: 'Anna Nagar Store',
          storeCode: `CHE-ANN-${idSuffix}`,
          addressLine1: '78 2nd Avenue',
          city: 'Chennai',
          state: 'Tamil Nadu',
          postalCode: '600040',
          country: 'IN',
          phone: '+919840333333',
        },
      });
      storeA3Id = storeA3.id;
    });

    // 2. Setup Tenant B
    const userB = await prisma.user.create({
      data: {
        email: normalizeEmail(`owner-b-call-${idSuffix}@example.com`),
        fullName: 'Tenant B Owner',
        status: 'ACTIVE',
      },
    });
    userBId = userB.id;

    const tenantB = await prisma.tenant.create({
      data: {
        name: `Tenant B Telephony ${idSuffix}`,
        slug: `tenant-b-telephony-${idSuffix}`,
        timezone: 'Asia/Kolkata',
      },
    });
    tenantBId = tenantB.id;

    // Setup Tenant B under RLS context
    await TenantContextService.withTenantContext(prisma, tenantBId, async (tx) => {
      await tx.tenantMembership.create({
        data: {
          tenantId: tenantBId,
          userId: userBId,
          role: Role.CLIENT_OWNER,
          scopeMode: 'ALL',
        },
      });

      const brandB = await tx.brand.create({
        data: {
          tenantId: tenantBId,
          name: 'Lakshmi Retail',
          slug: `lakshmi-retail-${idSuffix}`,
        },
      });
      brandBId = brandB.id;

      const surfaceB1 = await tx.webSurface.create({
        data: {
          tenantId: tenantBId,
          brandId: brandBId,
          name: 'Lakshmi Retail Web',
          type: 'LOCALBI',
        },
      });
      webSurfaceB1Id = surfaceB1.id;

      const storeB1 = await tx.location.create({
        data: {
          tenantId: tenantBId,
          brandId: brandBId,
          name: 'Indiranagar Store',
          storeCode: `BLR-IND-${idSuffix}`,
          addressLine1: '100 Feet Road',
          city: 'Bengaluru',
          state: 'Karnataka',
          postalCode: '560038',
          country: 'IN',
          phone: '+919840444444',
        },
      });
      storeB1Id = storeB1.id;
    });

    // 3. Provision Virtual Tracking Numbers
    await VirtualNumberService.provisionAndAssignNumber({
      tenantId: tenantAId,
      brandId: brandAId,
      storeId: storeA1Id,
      webSurfaceId: webSurfaceA1Id,
      phoneNumber: trackingPhoneA1,
      providerName: 'TEST_ADAPTER',
    });

    await VirtualNumberService.provisionAndAssignNumber({
      tenantId: tenantAId,
      brandId: brandAId,
      storeId: storeA2Id,
      webSurfaceId: webSurfaceA1Id,
      phoneNumber: trackingPhoneA2,
      providerName: 'TEST_ADAPTER',
    });

    await VirtualNumberService.provisionAndAssignNumber({
      tenantId: tenantBId,
      brandId: brandBId,
      storeId: storeB1Id,
      webSurfaceId: webSurfaceB1Id,
      phoneNumber: trackingPhoneB1,
      providerName: 'TEST_ADAPTER',
    });
  });

  afterAll(async () => {
    // Clean up test data
    const tenantIds = [tenantAId, tenantBId].filter(Boolean);
    if (tenantIds.length > 0) {
      await prisma.tenant.deleteMany({
        where: { id: { in: tenantIds } },
      });
    }
    const userIds = [userAId, userViewerId, userBId].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: userIds } },
      });
    }
  });

  // ===========================================================================
  // TEST 1 — Inbound Answered Call Lifecycle & Lead Integration
  // ===========================================================================
  it('TEST 1: processes inbound answered call lifecycle and idempotently creates Lead', async () => {
    const callerPhone = '+919840155667';
    const callId = `call_ans_${Date.now()}`;

    // Step 1: Initiated
    const initPayload = {
      eventId: `evt_${callId}_init`,
      callId,
      status: 'INITIATED',
      from: callerPhone,
      to: trackingPhoneA1,
      startedAt: new Date().toISOString(),
    };
    const initSig = testAdapter.generateWebhookSignature(initPayload, testSecret);
    const initRes = await CallIngestionService.processWebhook({
      providerName: 'TEST_ADAPTER',
      rawPayload: initPayload,
      signature: initSig,
      headers: { 'x-test-signature': initSig },
      secret: testSecret,
    });
    expect(initRes.success).toBe(true);
    expect(initRes.status).toBe('INITIATED');

    // Step 2: Ringing
    const ringPayload = {
      eventId: `evt_${callId}_ring`,
      callId,
      status: 'RINGING',
      from: callerPhone,
      to: trackingPhoneA1,
    };
    const ringSig = testAdapter.generateWebhookSignature(ringPayload, testSecret);
    const ringRes = await CallIngestionService.processWebhook({
      providerName: 'TEST_ADAPTER',
      rawPayload: ringPayload,
      signature: ringSig,
      headers: { 'x-test-signature': ringSig },
      secret: testSecret,
    });
    expect(ringRes.success).toBe(true);
    expect(ringRes.status).toBe('RINGING');

    // Step 3: Answered
    const ansPayload = {
      eventId: `evt_${callId}_ans`,
      callId,
      status: 'ANSWERED',
      from: callerPhone,
      to: trackingPhoneA1,
      answeredAt: new Date().toISOString(),
      durationSeconds: 45,
      talkDurationSeconds: 40,
    };
    const ansSig = testAdapter.generateWebhookSignature(ansPayload, testSecret);
    const ansRes = await CallIngestionService.processWebhook({
      providerName: 'TEST_ADAPTER',
      rawPayload: ansPayload,
      signature: ansSig,
      headers: { 'x-test-signature': ansSig },
      secret: testSecret,
    });
    expect(ansRes.success).toBe(true);
    expect(ansRes.status).toBe('ANSWERED');
    expect(ansRes.leadId).toBeDefined();

    // Step 4: Completed
    const compPayload = {
      eventId: `evt_${callId}_comp`,
      callId,
      status: 'COMPLETED',
      from: callerPhone,
      to: trackingPhoneA1,
      endedAt: new Date().toISOString(),
      durationSeconds: 120,
      talkDurationSeconds: 115,
      recordingUrl: 'https://telephony-recordings.localbi.internal/rec_123.mp3',
    };
    const compSig = testAdapter.generateWebhookSignature(compPayload, testSecret);
    const compRes = await CallIngestionService.processWebhook({
      providerName: 'TEST_ADAPTER',
      rawPayload: compPayload,
      signature: compSig,
      headers: { 'x-test-signature': compSig },
      secret: testSecret,
    });
    expect(compRes.success).toBe(true);
    expect(compRes.status).toBe('COMPLETED');

    // Verify Call in DB
    const callRecord = await TenantContextService.withTenantContext(
      prisma,
      tenantAId,
      async (tx) => {
        return tx.call.findUnique({
          where: {
            uq_call_provider_call_id: {
              tenantId: tenantAId,
              provider: 'TEST_ADAPTER',
              providerCallId: callId,
            },
          },
          include: { lead: true, events: true },
        });
      }
    );

    expect(callRecord).toBeDefined();
    expect(callRecord?.status).toBe('COMPLETED');
    expect(callRecord?.durationSeconds).toBe(120);
    expect(callRecord?.talkDurationSeconds).toBe(115);
    expect(callRecord?.recordingUrl).toBe('https://telephony-recordings.localbi.internal/rec_123.mp3');
    expect(callRecord?.storeId).toBe(storeA1Id);
    expect(callRecord?.leadId).toBeDefined();
    expect(callRecord?.lead?.type).toBe('CALL');
    expect(callRecord?.lead?.phone).toBe(callerPhone);
    expect(callRecord?.events.length).toBe(4);
  });

  // ===========================================================================
  // TEST 2 — Missed Call Tracking (No fake duration or bogus answers)
  // ===========================================================================
  it('TEST 2: tracks missed calls factually with zero talk duration and no bogus lead', async () => {
    const callerPhone = '+919840177889';
    const callId = `call_missed_${Date.now()}`;

    const missedPayload = {
      eventId: `evt_${callId}_missed`,
      callId,
      status: 'MISSED',
      from: callerPhone,
      to: trackingPhoneA1,
      startedAt: new Date().toISOString(),
      durationSeconds: 22,
      talkDurationSeconds: 0,
    };
    const sig = testAdapter.generateWebhookSignature(missedPayload, testSecret);

    const res = await CallIngestionService.processWebhook({
      providerName: 'TEST_ADAPTER',
      rawPayload: missedPayload,
      signature: sig,
      headers: { 'x-test-signature': sig },
      secret: testSecret,
    });

    expect(res.success).toBe(true);
    expect(res.status).toBe('MISSED');
    expect(res.leadId).toBeFalsy();

    // Verify in DB
    const callRecord = await TenantContextService.withTenantContext(
      prisma,
      tenantAId,
      async (tx) => {
        return tx.call.findUnique({
          where: {
            uq_call_provider_call_id: {
              tenantId: tenantAId,
              provider: 'TEST_ADAPTER',
              providerCallId: callId,
            },
          },
        });
      }
    );

    expect(callRecord?.status).toBe('MISSED');
    expect(callRecord?.talkDurationSeconds).toBe(0);
    expect(callRecord?.durationSeconds).toBe(22);
    expect(callRecord?.leadId).toBeNull();
  });

  // ===========================================================================
  // TEST 3 — Duplicate Webhook Idempotency
  // ===========================================================================
  it('TEST 3: detects duplicate webhook payloads and returns idempotent acknowledgement', async () => {
    const callId = `call_idemp_${Date.now()}`;
    const payload = {
      eventId: `evt_${callId}_single`,
      callId,
      status: 'ANSWERED',
      from: '+919840122334',
      to: trackingPhoneA1,
      durationSeconds: 30,
      talkDurationSeconds: 25,
    };
    const sig = testAdapter.generateWebhookSignature(payload, testSecret);

    // First delivery
    const res1 = await CallIngestionService.processWebhook({
      providerName: 'TEST_ADAPTER',
      rawPayload: payload,
      signature: sig,
      headers: { 'x-test-signature': sig },
      secret: testSecret,
    });
    expect(res1.success).toBe(true);
    expect(res1.idempotent).toBeUndefined();

    // Second delivery (duplicate retry)
    const res2 = await CallIngestionService.processWebhook({
      providerName: 'TEST_ADAPTER',
      rawPayload: payload,
      signature: sig,
      headers: { 'x-test-signature': sig },
      secret: testSecret,
    });
    expect(res2.success).toBe(true);
    expect(res2.idempotent).toBe(true);
    expect(res2.callId).toBe(res1.callId);

    // Verify events count is strictly 1
    const eventCount = await TenantContextService.withTenantContext(
      prisma,
      tenantAId,
      async (tx) => {
        return tx.callEvent.count({
          where: { callId: res1.callId },
        });
      }
    );
    expect(eventCount).toBe(1);
  });

  // ===========================================================================
  // TEST 4 — Out-of-Order Lifecycle Handling (COMPLETED before ANSWERED)
  // ===========================================================================
  it('TEST 4: preserves terminal COMPLETED status when intermediate ANSWERED event arrives out of order', async () => {
    const callId = `call_ooo_${Date.now()}`;
    const callerPhone = '+919840555666';

    // Step 1: COMPLETED arrives first
    const compPayload = {
      eventId: `evt_${callId}_comp`,
      callId,
      status: 'COMPLETED',
      from: callerPhone,
      to: trackingPhoneA1,
      durationSeconds: 85,
      talkDurationSeconds: 80,
    };
    const compSig = testAdapter.generateWebhookSignature(compPayload, testSecret);
    const compRes = await CallIngestionService.processWebhook({
      providerName: 'TEST_ADAPTER',
      rawPayload: compPayload,
      signature: compSig,
      headers: { 'x-test-signature': compSig },
      secret: testSecret,
    });
    expect(compRes.status).toBe('COMPLETED');

    // Step 2: ANSWERED arrives late
    const ansPayload = {
      eventId: `evt_${callId}_ans_late`,
      callId,
      status: 'ANSWERED',
      from: callerPhone,
      to: trackingPhoneA1,
      durationSeconds: 30,
      talkDurationSeconds: 25,
    };
    const ansSig = testAdapter.generateWebhookSignature(ansPayload, testSecret);
    const ansRes = await CallIngestionService.processWebhook({
      providerName: 'TEST_ADAPTER',
      rawPayload: ansPayload,
      signature: ansSig,
      headers: { 'x-test-signature': ansSig },
      secret: testSecret,
    });

    // Expect status was preserved as COMPLETED and out-of-order was flagged
    expect(ansRes.status).toBe('COMPLETED');
    expect(ansRes.isOutOfOrder).toBe(true);

    const callRecord = await TenantContextService.withTenantContext(
      prisma,
      tenantAId,
      async (tx) => {
        return tx.call.findUnique({
          where: {
            uq_call_provider_call_id: {
              tenantId: tenantAId,
              provider: 'TEST_ADAPTER',
              providerCallId: callId,
            },
          },
        });
      }
    );
    expect(callRecord?.status).toBe('COMPLETED');
    expect(callRecord?.talkDurationSeconds).toBe(80);
  });

  // ===========================================================================
  // TEST 5 — Webhook Signature Verification
  // ===========================================================================
  it('TEST 5: rejects fraudulent or tampered webhook signatures with 401', async () => {
    const payload = {
      eventId: `evt_sig_fail`,
      callId: `call_sig_fail`,
      status: 'ANSWERED',
      from: '+919840111222',
      to: trackingPhoneA1,
    };

    // Fraudulent signature
    await expect(
      CallIngestionService.processWebhook({
        providerName: 'TEST_ADAPTER',
        rawPayload: payload,
        signature: 'sha256=invalid_tampered_signature_hex_value',
        headers: { 'x-test-signature': 'sha256=invalid_tampered_signature_hex_value' },
        secret: testSecret,
      })
    ).rejects.toThrowError();
  });

  // ===========================================================================
  // TEST 6 — Cross-Tenant Webhook Tampering Prevention
  // ===========================================================================
  it('TEST 6: derives tenant strictly from tracking number in DB and ignores spoofed payload tenantId', async () => {
    const callId = `call_tamper_${Date.now()}`;
    // Malicious payload attempting to inject Tenant B's ID while dialing Tenant A's number
    const tamperedPayload = {
      eventId: `evt_${callId}_tamper`,
      callId,
      status: 'ANSWERED',
      from: '+919840999111',
      to: trackingPhoneA1, // Owned by Tenant A
      tenant_id: tenantBId,
      tenantId: tenantBId,
      brand_id: brandBId,
    };
    const sig = testAdapter.generateWebhookSignature(tamperedPayload, testSecret);

    const res = await CallIngestionService.processWebhook({
      providerName: 'TEST_ADAPTER',
      rawPayload: tamperedPayload,
      signature: sig,
      headers: { 'x-test-signature': sig },
      secret: testSecret,
    });

    expect(res.success).toBe(true);

    // Call MUST exist under Tenant A
    const callA = await TenantContextService.withTenantContext(
      prisma,
      tenantAId,
      async (tx) => {
        return tx.call.findUnique({
          where: {
            uq_call_provider_call_id: {
              tenantId: tenantAId,
              provider: 'TEST_ADAPTER',
              providerCallId: callId,
            },
          },
        });
      }
    );
    expect(callA).toBeDefined();
    expect(callA?.tenantId).toBe(tenantAId);
    expect(callA?.brandId).toBe(brandAId);

    // Call MUST NOT exist under Tenant B
    const callB = await TenantContextService.withTenantContext(
      prisma,
      tenantBId,
      async (tx) => {
        return tx.call.findUnique({
          where: {
            uq_call_provider_call_id: {
              tenantId: tenantBId,
              provider: 'TEST_ADAPTER',
              providerCallId: callId,
            },
          },
        });
      }
    );
    expect(callB).toBeNull();
  });

  // ===========================================================================
  // TEST 7 — Unknown / Unassigned Number Rejection
  // ===========================================================================
  it('TEST 7: rejects webhooks for unrecognized or unassigned tracking numbers with 404', async () => {
    const unmappedPhone = '+914449999999';
    const payload = {
      eventId: `evt_unmapped`,
      callId: `call_unmapped`,
      status: 'INITIATED',
      from: '+919840111222',
      to: unmappedPhone,
    };
    const sig = testAdapter.generateWebhookSignature(payload, testSecret);

    await expect(
      CallIngestionService.processWebhook({
        providerName: 'TEST_ADAPTER',
        rawPayload: payload,
        signature: sig,
        headers: { 'x-test-signature': sig },
        secret: testSecret,
      })
    ).rejects.toThrowError();
  });

  // ===========================================================================
  // TEST 8 — Safe Number Release Preserves Historical Call Records
  // ===========================================================================
  it('TEST 8: releasing a virtual number preserves historical call records and foreign key integrity', async () => {
    // 1. Generate a call on Number A2
    const callId = `call_preserv_${Date.now()}`;
    const payload = {
      eventId: `evt_${callId}`,
      callId,
      status: 'COMPLETED',
      from: '+919840888999',
      to: trackingPhoneA2,
      durationSeconds: 60,
      talkDurationSeconds: 50,
    };
    const sig = testAdapter.generateWebhookSignature(payload, testSecret);
    await CallIngestionService.processWebhook({
      providerName: 'TEST_ADAPTER',
      rawPayload: payload,
      signature: sig,
      headers: { 'x-test-signature': sig },
      secret: testSecret,
    });

    // 2. Fetch VirtualNumber ID
    const vnum = await TenantContextService.withTenantContext(
      prisma,
      tenantAId,
      async (tx) => {
        return tx.virtualNumber.findUnique({
          where: {
            uq_virtual_number_phone: {
              tenantId: tenantAId,
              phoneNumber: trackingPhoneA2,
            },
          },
        });
      }
    );
    expect(vnum).toBeDefined();

    // 3. Release Number
    const released = await VirtualNumberService.releaseNumber({
      tenantId: tenantAId,
      virtualNumberId: vnum!.id,
    });
    expect(released.status).toBe('RELEASED');
    expect(released.releasedAt).toBeDefined();

    // 4. Verify historical Call STILL exists with foreign key intact
    const callRecord = await TenantContextService.withTenantContext(
      prisma,
      tenantAId,
      async (tx) => {
        return tx.call.findUnique({
          where: {
            uq_call_provider_call_id: {
              tenantId: tenantAId,
              provider: 'TEST_ADAPTER',
              providerCallId: callId,
            },
          },
          include: { virtualNumber: true },
        });
      }
    );
    expect(callRecord).toBeDefined();
    expect(callRecord?.virtualNumberId).toBe(vnum!.id);
    expect(callRecord?.virtualNumber?.status).toBe('RELEASED');
  });

  // ===========================================================================
  // TEST 9 — Store Destination Phone Update & Provider Synchronization
  // ===========================================================================
  it('TEST 9: updates store destination phone and synchronizes provider forwarding configuration', async () => {
    const newDestination = '+919840999888';

    const res = await VirtualNumberService.updateStoreDestinationPhone({
      tenantId: tenantAId,
      brandId: brandAId,
      storeId: storeA1Id,
      destinationPhone: newDestination,
    });

    expect(res.newDestinationPhone).toBe(newDestination);
    expect(res.updatedCount).toBeGreaterThanOrEqual(1);

    // Verify store in DB
    const store = await TenantContextService.withTenantContext(
      prisma,
      tenantAId,
      async (tx) => {
        return tx.location.findUnique({
          where: {
            uq_location_tenant_brand_id: {
              tenantId: tenantAId,
              brandId: brandAId,
              id: storeA1Id,
            },
          },
        });
      }
    );
    expect(store?.phone).toBe(newDestination);

    // Verify virtual number forwarding in DB
    const vnum = await TenantContextService.withTenantContext(
      prisma,
      tenantAId,
      async (tx) => {
        return tx.virtualNumber.findUnique({
          where: {
            uq_virtual_number_phone: {
              tenantId: tenantAId,
              phoneNumber: trackingPhoneA1,
            },
          },
        });
      }
    );
    expect(vnum?.forwardingNumber).toBe(newDestination);
  });

  // ===========================================================================
  // TEST 10 — Forwarding Failure Fail-Closed Behavior
  // ===========================================================================
  it('TEST 10: fails closed when provider call forwarding configuration fails', async () => {
    const invalidPhone = '+111'; // Malformed phone

    await expect(
      VirtualNumberService.updateStoreDestinationPhone({
        tenantId: tenantAId,
        brandId: brandAId,
        storeId: storeA1Id,
        destinationPhone: invalidPhone,
      })
    ).rejects.toThrowError();
  });

  // ===========================================================================
  // TEST 11 — CALL_CLICK without Real Call Separation
  // ===========================================================================
  it('TEST 11: separates browser CALL_CLICK attribution intent from real telephony inbound calls', async () => {
    // Record browser CALL_CLICK event
    await TenantContextService.withTenantContext(prisma, tenantAId, async (tx) => {
      return tx.attributionEvent.create({
        data: {
          tenantId: tenantAId,
          brandId: brandAId,
          webSurfaceId: webSurfaceA1Id,
          storeId: storeA1Id,
          eventType: 'CALL_CLICK',
          visitorId: 'vis_test_123',
          sessionId: 'ses_test_123',
          currentPath: '/chennai/mannadi',
          metadata: { cta: 'Header Call Button' },
        },
      });
    });

    // Check funnel metrics
    const funnel = await CallDashboardService.getCallFunnelComparison({
      tenantId: tenantAId,
      brandId: brandAId,
      storeId: storeA1Id,
    });

    expect(funnel.browserCallClicks).toBeGreaterThanOrEqual(1);
    expect(funnel.clickToCallDropOffCount).toBeGreaterThanOrEqual(0);

    // Real call was NOT fabricated
    const realCallsCount = await TenantContextService.withTenantContext(
      prisma,
      tenantAId,
      async (tx) => {
        return tx.call.count({
          where: { tenantId: tenantAId, storeId: storeA1Id, source: 'synthetic' },
        });
      }
    );
    expect(realCallsCount).toBe(0);
  });

  // ===========================================================================
  // TEST 12 — Real Call without CALL_CLICK
  // ===========================================================================
  it('TEST 12: records direct telephony call factually without requiring browser click event', async () => {
    const callId = `call_direct_${Date.now()}`;
    const payload = {
      eventId: `evt_${callId}`,
      callId,
      status: 'ANSWERED',
      from: '+919840333444',
      to: trackingPhoneA1,
      durationSeconds: 50,
      talkDurationSeconds: 45,
    };
    const sig = testAdapter.generateWebhookSignature(payload, testSecret);
    const res = await CallIngestionService.processWebhook({
      providerName: 'TEST_ADAPTER',
      rawPayload: payload,
      signature: sig,
      headers: { 'x-test-signature': sig },
      secret: testSecret,
    });

    expect(res.success).toBe(true);

    const callRecord = await TenantContextService.withTenantContext(
      prisma,
      tenantAId,
      async (tx) => {
        return tx.call.findUnique({
          where: {
            uq_call_provider_call_id: {
              tenantId: tenantAId,
              provider: 'TEST_ADAPTER',
              providerCallId: callId,
            },
          },
        });
      }
    );

    expect(callRecord).toBeDefined();
    expect(callRecord?.attributionConfidence).toBe('STORE_NUMBER');
  });

  // ===========================================================================
  // TEST 13 — Role-Based Caller PII Masking
  // ===========================================================================
  it('TEST 13: masks caller phone numbers for unauthorized roles and exposes for privileged roles', async () => {
    // 1. Query with Viewer role (non-privileged)
    const viewerCalls = await CallDashboardService.listCalls({
      tenantId: tenantAId,
      brandId: brandAId,
      hasFullPiiAccess: false,
    });

    expect(viewerCalls.items.length).toBeGreaterThan(0);
    const firstCallMasked = viewerCalls.items[0]!;
    expect(firstCallMasked.callerNumber).toMatch(/\*\*\*\*\*\*/);
    expect(firstCallMasked.recordingUrl).toBeNull(); // Recording URL hidden for non-privileged

    // 2. Query with Owner role (privileged)
    const ownerCalls = await CallDashboardService.listCalls({
      tenantId: tenantAId,
      brandId: brandAId,
      hasFullPiiAccess: true,
    });

    expect(ownerCalls.items.length).toBeGreaterThan(0);
    const firstCallUnmasked = ownerCalls.items[0]!;
    expect(firstCallUnmasked.callerNumber).not.toMatch(/\*\*\*\*\*\*/);

    // 3. CSV Export Formula Sanitization & PII
    const csvContent = await CallDashboardService.exportCallsCsv({
      tenantId: tenantAId,
      brandId: brandAId,
      hasFullPiiAccess: false,
    });
    expect(csvContent).toContain('******');
  });

  // ===========================================================================
  // TEST 14 — Multi-Tenant Dual-Role PostgreSQL 16 RLS Isolation
  // ===========================================================================
  it('TEST 14: strictly isolates calls and virtual numbers between Tenant A and Tenant B under RLS', async () => {
    // Query Tenant A calls under Tenant A context
    const callsA = await TenantContextService.withTenantContext(
      prisma,
      tenantAId,
      async (tx) => {
        return tx.call.findMany({ where: { tenantId: tenantAId } });
      }
    );
    expect(callsA.length).toBeGreaterThan(0);

    // Query Tenant B calls under Tenant B context
    const callsB = await TenantContextService.withTenantContext(
      prisma,
      tenantBId,
      async (tx) => {
        return tx.call.findMany({ where: { tenantId: tenantBId } });
      }
    );
    expect(callsB.length).toBeGreaterThanOrEqual(0);

    // Tenant B cannot see Tenant A's calls
    const crossTenantCalls = await TenantContextService.withTenantContext(
      prisma,
      tenantBId,
      async (tx) => {
        return tx.call.findMany({ where: { tenantId: tenantAId } });
      }
    );
    expect(crossTenantCalls.length).toBe(0);

    // Tenant B cannot see Tenant A's virtual numbers
    const crossTenantNumbers = await TenantContextService.withTenantContext(
      prisma,
      tenantBId,
      async (tx) => {
        return tx.virtualNumber.findMany({ where: { tenantId: tenantAId } });
      }
    );
    expect(crossTenantNumbers.length).toBe(0);
  });

  // ===========================================================================
  // TEST 15 — Cross-Brand Isolation
  // ===========================================================================
  it('TEST 15: cleanly filters calls and metrics between Brand A and Brand A2 in the same tenant', async () => {
    expect(storeA3Id).toBeDefined();

    // Calls created were under Brand A
    const brandACalls = await CallDashboardService.listCalls({
      tenantId: tenantAId,
      brandId: brandAId,
    });
    expect(brandACalls.items.length).toBeGreaterThan(0);

    // Brand A2 has no calls yet
    const brandA2Calls = await CallDashboardService.listCalls({
      tenantId: tenantAId,
      brandId: brandA2Id,
    });
    expect(brandA2Calls.items.length).toBe(0);

    // Summary reflects Brand A metrics
    const summaryA = await CallDashboardService.getCallSummary({
      tenantId: tenantAId,
      brandId: brandAId,
    });
    expect(summaryA.totalCalls).toBeGreaterThan(0);
  });
});
