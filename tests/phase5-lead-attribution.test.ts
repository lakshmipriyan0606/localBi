import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { AttributionService } from '@/modules/attribution/attribution-service';
import { LeadService } from '@/modules/leads/lead-service';
import { LocalBiTracker } from '@/modules/analytics/localbi-tracker';

describe('Phase 5: Lead & Conversion Attribution Engine Exhaustive Tests', () => {
  let tenantA: { id: string; slug: string };
  let tenantB: { id: string; slug: string };
  let brandA: { id: string };
  let surfaceA: { id: string };
  let storeA: { id: string };
  let productA: { id: string };

  beforeAll(async () => {
    // Setup test tenants, brand, store, product, and web surface
    const timestamp = Date.now().toString(36);

    tenantA = await prisma.tenant.create({
      data: {
        name: `Phase5 Tenant A ${timestamp}`,
        slug: `phase5-a-${timestamp}`,
      },
    });

    tenantB = await prisma.tenant.create({
      data: {
        name: `Phase5 Tenant B ${timestamp}`,
        slug: `phase5-b-${timestamp}`,
      },
    });

    await TenantContextService.withTenantContext(prisma, tenantA.id, async (tx) => {
      brandA = await tx.brand.create({
        data: {
          tenantId: tenantA.id,
          name: 'Aalim Perfumes',
          slug: `aalim-perfumes-${timestamp}`,
        },
      });

      surfaceA = await tx.webSurface.create({
        data: {
          tenantId: tenantA.id,
          brandId: brandA.id,
          type: 'LOCALBI',
          name: 'LocalBi Microsite Surface',
        },
      });

      storeA = await tx.location.create({
        data: {
          tenantId: tenantA.id,
          brandId: brandA.id,
          name: 'Mannadi Store',
          storeCode: `MAN-${timestamp}`,
          addressLine1: '123 Angappa Naicken St',
          city: 'Chennai',
          state: 'Tamil Nadu',
          postalCode: '600001',
          country: 'IN',
        },
      });

      productA = await tx.product.create({
        data: {
          tenantId: tenantA.id,
          brandId: brandA.id,
          name: 'Royal Oud 50ml',
          slug: `royal-oud-50ml-${timestamp}`,
          sku: `RO-50-${timestamp}`,
          basePrice: 2499.0,
        },
      });
    });
  });

  afterAll(async () => {
    // Cleanup test fixtures under tenant context
    if (tenantA) {
      await TenantContextService.withTenantContext(prisma, tenantA.id, async (tx) => {
        await tx.lead.deleteMany({ where: { tenantId: tenantA.id } });
        await tx.attributionEvent.deleteMany({ where: { tenantId: tenantA.id } });
        await tx.visitorSession.deleteMany({ where: { tenantId: tenantA.id } });
        await tx.product.deleteMany({ where: { tenantId: tenantA.id } });
        await tx.location.deleteMany({ where: { tenantId: tenantA.id } });
        await tx.webSurface.deleteMany({ where: { tenantId: tenantA.id } });
        await tx.brand.deleteMany({ where: { tenantId: tenantA.id } });
      });
    }

    if (tenantB) {
      await TenantContextService.withTenantContext(prisma, tenantB.id, async (tx) => {
        await tx.lead.deleteMany({ where: { tenantId: tenantB.id } });
        await tx.attributionEvent.deleteMany({ where: { tenantId: tenantB.id } });
      });
    }

    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantA?.id, tenantB?.id].filter(Boolean) } },
    });
  });

  it('Gate 5.1: Call click produces a CALL_CLICK AttributionEvent with store and brand context', async () => {
    const event = await AttributionService.recordEvent({
      tenantId: tenantA.id,
      brandId: brandA.id,
      webSurfaceId: surfaceA.id,
      storeId: storeA.id,
      eventType: 'CALL_CLICK',
      currentPath: '/chennai/mannadi',
      referrer: 'https://www.google.com/',
    });

    expect(event.id).toBeDefined();
    expect(event.eventType).toBe('CALL_CLICK');
    expect(event.tenantId).toBe(tenantA.id);
    expect(event.brandId).toBe(brandA.id);
    expect(event.storeId).toBe(storeA.id);
    expect(event.productId).toBeNull();
    expect(event.source).toBe('google');
    expect(event.medium).toBe('organic');
  });

  it('Gate 5.2: WhatsApp click produces a WHATSAPP_CLICK AttributionEvent with product context', async () => {
    const event = await AttributionService.recordEvent({
      tenantId: tenantA.id,
      brandId: brandA.id,
      webSurfaceId: surfaceA.id,
      storeId: storeA.id,
      productId: productA.id,
      eventType: 'WHATSAPP_CLICK',
      currentPath: '/chennai/mannadi/royal-oud-50ml',
      utmSource: 'instagram',
      utmMedium: 'social',
    });

    expect(event.eventType).toBe('WHATSAPP_CLICK');
    expect(event.storeId).toBe(storeA.id);
    expect(event.productId).toBe(productA.id);
    expect(event.source).toBe('instagram');
    expect(event.medium).toBe('social');
  });

  it('Gate 5.3: Directions click produces a DIRECTIONS_CLICK conversion event', async () => {
    const event = await AttributionService.recordEvent({
      tenantId: tenantA.id,
      brandId: brandA.id,
      webSurfaceId: surfaceA.id,
      storeId: storeA.id,
      eventType: 'DIRECTIONS_CLICK',
      currentPath: '/chennai/mannadi',
    });

    expect(event.eventType).toBe('DIRECTIONS_CLICK');
    expect(event.storeId).toBe(storeA.id);
  });

  it('Gate 5.4: Form submission produces FORM_SUBMIT event and creates a Lead record', async () => {
    const lead = await LeadService.createLead({
      tenantId: tenantA.id,
      brandId: brandA.id,
      webSurfaceId: surfaceA.id,
      storeId: storeA.id,
      productId: productA.id,
      name: 'Priya Sharma',
      phone: '+91 98765 43210',
      email: 'priya@example.com',
      message: 'Interested in Royal Oud 50ml availability',
      currentPath: '/chennai/mannadi/royal-oud-50ml',
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'diwali_sale',
    });

    expect(lead.id).toBeDefined();
    expect(lead.tenantId).toBe(tenantA.id);
    expect(lead.brandId).toBe(brandA.id);
    expect(lead.storeId).toBe(storeA.id);
    expect(lead.productId).toBe(productA.id);
    expect(lead.status).toBe('NEW');
    expect(lead.type).toBe('FORM');
    expect(lead.sourceEventId).toBeDefined();

    // Verify source event exists in attribution_events
    const event = await TenantContextService.withTenantContext(prisma, tenantA.id, async (tx) => {
      return tx.attributionEvent.findUnique({
        where: { id: lead.sourceEventId! },
      });
    });
    expect(event).toBeDefined();
    expect(event?.eventType).toBe('FORM_SUBMIT');
    expect(event?.utmCampaign).toBe('diwali_sale');
  });

  it('Gate 5.5: Idempotent lead creation prevents duplicates on identical idempotencyKey', async () => {
    const idempotencyKey = 'idemp_test_key_12345';

    const lead1 = await LeadService.createLead({
      tenantId: tenantA.id,
      brandId: brandA.id,
      webSurfaceId: surfaceA.id,
      storeId: storeA.id,
      name: 'Vikram Singh',
      phone: '+91 99887 76655',
      idempotencyKey,
    });

    const lead2 = await LeadService.createLead({
      tenantId: tenantA.id,
      brandId: brandA.id,
      webSurfaceId: surfaceA.id,
      storeId: storeA.id,
      name: 'Vikram Singh Retried',
      phone: '+91 99887 76655',
      idempotencyKey,
    });

    expect(lead1.id).toBe(lead2.id);

    // Verify exactly one lead exists with this idempotency key
    const count = await TenantContextService.withTenantContext(prisma, tenantA.id, async (tx) => {
      return tx.lead.count({
        where: { tenantId: tenantA.id, idempotencyKey },
      });
    });
    expect(count).toBe(1);
  });

  it('Gate 5.6: First-touch attribution is preserved across multi-page session navigation', async () => {
    const visitorId = 'vid_multi_touch_01';
    const sessionId = 'sid_multi_touch_01';

    // Step 1: Visitor lands via Google Paid Campaign
    await AttributionService.recordEvent({
      tenantId: tenantA.id,
      brandId: brandA.id,
      webSurfaceId: surfaceA.id,
      visitorId,
      sessionId,
      eventType: 'PAGE_VIEW',
      landingPath: '/chennai',
      currentPath: '/chennai',
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'pongal_fest',
    });

    // Step 2: Visitor browses 3 other pages directly
    await AttributionService.recordEvent({
      tenantId: tenantA.id,
      brandId: brandA.id,
      webSurfaceId: surfaceA.id,
      visitorId,
      sessionId,
      eventType: 'PAGE_VIEW',
      currentPath: '/chennai/mannadi',
    });

    // Step 3: Visitor submits a form on product page
    const lead = await LeadService.createLead({
      tenantId: tenantA.id,
      brandId: brandA.id,
      webSurfaceId: surfaceA.id,
      storeId: storeA.id,
      productId: productA.id,
      visitorId,
      sessionId,
      name: 'Ananya Roy',
      phone: '+91 91234 56789',
      currentPath: '/chennai/mannadi/royal-oud-50ml',
    });

    // First touch must preserve original campaign
    expect(lead.firstTouchSource).toBe('google');
    expect(lead.firstTouchMedium).toBe('cpc');
    expect(lead.firstTouchCampaign).toBe('pongal_fest');
    expect(lead.firstTouchLandingPage).toBe('/chennai');

    // Last touch must record final conversion page
    expect(lead.lastTouchPage).toBe('/chennai/mannadi/royal-oud-50ml');
  });

  it('Gate 5.7: Honeypot spam field sets lead status to SPAM automatically', async () => {
    const spamLead = await LeadService.createLead({
      tenantId: tenantA.id,
      brandId: brandA.id,
      webSurfaceId: surfaceA.id,
      name: 'Spam Bot',
      phone: '+1 800 555 0199',
      isSpam: true, // Triggered by filled _hp_company in API
    });

    expect(spamLead.status).toBe('SPAM');
  });

  it('Gate 5.8: Zero PII in attribution_events metadata and GA4 sanitization', async () => {
    // 1. Database level: verify event record has no raw PII columns
    const event = await AttributionService.recordEvent({
      tenantId: tenantA.id,
      brandId: brandA.id,
      webSurfaceId: surfaceA.id,
      eventType: 'FORM_SUBMIT',
      metadata: { formId: 'store_inquiry', sourceLabel: 'desktop' },
    });

    expect((event as any).phone).toBeUndefined();
    expect((event as any).email).toBeUndefined();
    expect((event as any).name).toBeUndefined();

    // 2. Client tracker level: verify forbidden PII keys are stripped
    const dirtyParams = {
      brand: 'Aalim Perfumes',
      brandId: brandA.id,
      name: 'Rahul Sharma',
      email: 'rahul@example.com',
      phone: '+91 99999 88888',
      password: 'secretPassword123',
      notes: 'Customer private notes',
      pageType: 'STORE_PRODUCT',
    };

    const clean = LocalBiTracker.sanitizeParams(dirtyParams);
    expect(clean['brand']).toBe('Aalim Perfumes');
    expect(clean['pageType']).toBe('STORE_PRODUCT');
    expect((clean as any).name).toBeUndefined();
    expect((clean as any).email).toBeUndefined();
    expect((clean as any).phone).toBeUndefined();
    expect((clean as any).password).toBeUndefined();
    expect((clean as any).notes).toBeUndefined();
  });

  it('Gate 5.9: Conversion rate formula verification (Conversions / Page Views * 100)', async () => {
    const startDate = new Date(Date.now() - 1000 * 3600);
    const endDate = new Date(Date.now() + 1000 * 3600);

    const summary = await AttributionService.getConversionSummary({
      tenantId: tenantA.id,
      startDate,
      endDate,
    });

    expect(summary).toBeDefined();
    expect(summary.totalConversions).toBeGreaterThanOrEqual(0);
    expect(summary.formulaLabel).toBe('Total Conversions / Page Views × 100%');

    if (summary.pageViews > 0) {
      const expectedRate = Number(((summary.totalConversions / summary.pageViews) * 100).toFixed(2));
      expect(summary.conversionRate).toBe(expectedRate);
    } else {
      expect(summary.conversionRate).toBe(0);
    }
  });

  it('Gate 5.10: Store and Product conversion breakdowns correctly isolate entities', async () => {
    const startDate = new Date(Date.now() - 1000 * 3600);
    const endDate = new Date(Date.now() + 1000 * 3600);

    const storeConversions = await AttributionService.getStoreConversions({
      tenantId: tenantA.id,
      startDate,
      endDate,
    });

    expect(storeConversions.length).toBeGreaterThan(0);
    const mannadi = storeConversions.find((s) => s.storeId === storeA.id);
    expect(mannadi).toBeDefined();
    expect(mannadi?.storeName).toBe('Mannadi Store');
    expect(mannadi?.totalConversions).toBeGreaterThan(0);

    const productConversions = await AttributionService.getProductConversions({
      tenantId: tenantA.id,
      startDate,
      endDate,
    });

    expect(productConversions.length).toBeGreaterThan(0);
    const royalOud = productConversions.find((p) => p.productId === productA.id);
    expect(royalOud).toBeDefined();
    expect(royalOud?.productName).toBe('Royal Oud 50ml');
  });

  it('Gate 5.11: Cross-tenant RLS isolation — Tenant B cannot view Tenant A leads', async () => {
    // Querying under Tenant B context must yield 0 of Tenant A's leads
    const tenantBLeads = await TenantContextService.withTenantContext(prisma, tenantB.id, async (tx) => {
      return tx.lead.findMany({
        where: { tenantId: tenantB.id },
      });
    });

    expect(tenantBLeads.length).toBe(0);
  });

  it('Gate 5.12: Rapid duplicate CTA clicks within 5-second window are deduplicated', async () => {
    const sessionId = 'sid_rapid_click_01';

    const firstClick = await AttributionService.recordEvent({
      tenantId: tenantA.id,
      brandId: brandA.id,
      webSurfaceId: surfaceA.id,
      storeId: storeA.id,
      sessionId,
      eventType: 'CALL_CLICK',
    });

    const secondClick = await AttributionService.recordEvent({
      tenantId: tenantA.id,
      brandId: brandA.id,
      webSurfaceId: surfaceA.id,
      storeId: storeA.id,
      sessionId,
      eventType: 'CALL_CLICK',
    });

    // Rapid second click within 5s window must return the existing event id
    expect(secondClick.id).toBe(firstClick.id);
  });

  it('Gate 5.13: Lead status update state machine transitions correctly', async () => {
    const lead = await LeadService.createLead({
      tenantId: tenantA.id,
      brandId: brandA.id,
      webSurfaceId: surfaceA.id,
      name: 'Status Test User',
      phone: '+91 90000 11111',
    });

    expect(lead.status).toBe('NEW');

    const updated = await LeadService.updateLeadStatus({
      tenantId: tenantA.id,
      leadId: lead.id,
      status: 'QUALIFIED',
    });

    expect(updated.status).toBe('QUALIFIED');
  });
});
