/**
 * Ensures production database has Sastikaa Travel Agency single-page website and subdomain mapping
 */
const { PrismaClient } = require('@prisma/client');

async function main() {
  const appUrl =
    process.env.DATABASE_URL ||
    process.env.DIRECT_URL ||
    'postgresql://localbi_app:app_password@127.0.0.1:5432/localbi?schema=public';

  const prisma = new PrismaClient({
    datasources: { db: { url: appUrl } },
  });

  try {
    console.log('[ensure-production-seeds] Verifying tenant and brand mappings...');

    let existingDomain = await prisma.domain.findFirst({
      where: { hostname: 'sub.sastikaatravel.com' },
    });

    let tenant = null;
    if (existingDomain) {
      tenant = await prisma.tenant.findUnique({
        where: { id: existingDomain.tenantId },
      });
    }

    if (!tenant) {
      tenant = await prisma.tenant.findFirst({
        where: {
          OR: [
            { slug: 'lakshmi-food' },
            { name: { contains: 'Lakshmi', mode: 'insensitive' } },
          ],
        },
      });
    }

    if (!tenant) {
      tenant = await prisma.tenant.findFirst({
        where: { status: 'ACTIVE' },
      });
    }

    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          name: 'Lakshmi food',
          slug: 'lakshmi-food',
          status: 'ACTIVE',
        },
      });
      console.log(`[ensure-production-seeds] Created default tenant: ${tenant.name} (${tenant.id})`);
    }

    const tenantId = tenant.id;

    await prisma.$transaction(async (tx) => {
      // Set RLS context
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;

      // 1. Ensure Brand
      let brand = await tx.brand.findFirst({
        where: {
          tenantId,
          OR: [
            { slug: 'sastikaa-travel-agency' },
            { slug: 'sastikaa-travel' },
            { name: { contains: 'Sastikaa', mode: 'insensitive' } },
          ],
        },
      });

      if (!brand) {
        brand = await tx.brand.create({
          data: {
            tenantId,
            name: 'Sastikaa Travel Agency',
            slug: 'sastikaa-travel-agency',
          },
        });
        console.log(`[ensure-production-seeds] Created brand: ${brand.name} (${brand.id})`);
      } else {
        await tx.brand.update({
          where: { id: brand.id },
          data: { name: 'Sastikaa Travel Agency' },
        });
      }

      const brandId = brand.id;

      // 2. Ensure LOCALBI WebSurface
      let localBiSurface = await tx.webSurface.findFirst({
        where: {
          tenantId,
          brandId,
          type: 'LOCALBI',
        },
      });

      if (!localBiSurface) {
        localBiSurface = await tx.webSurface.create({
          data: {
            tenantId,
            brandId,
            name: 'Sastikaa Travel Agency Website',
            type: 'LOCALBI',
            status: 'ACTIVE',
          },
        });
        console.log(`[ensure-production-seeds] Created LOCALBI WebSurface: ${localBiSurface.id}`);
      }

      // 3. Ensure sub.sastikaatravel.com Domain mapped to LOCALBI surface
      let subDomain = await tx.domain.findFirst({
        where: { hostname: 'sub.sastikaatravel.com' },
      });

      if (!subDomain) {
        subDomain = await tx.domain.create({
          data: {
            tenantId,
            brandId,
            webSurfaceId: localBiSurface.id,
            hostname: 'sub.sastikaatravel.com',
            isPrimary: true,
            isVerified: true,
            sslStatus: 'ACTIVE',
          },
        });
        console.log(`[ensure-production-seeds] Mapped sub.sastikaatravel.com to LOCALBI surface.`);
      } else {
        await tx.domain.update({
          where: { id: subDomain.id },
          data: {
            webSurfaceId: localBiSurface.id,
            isPrimary: true,
            isVerified: true,
            sslStatus: 'ACTIVE',
          },
        });
      }

      // 4. Ensure ORIGINAL WebSurface & www.sastikaatravel.com
      let originalSurface = await tx.webSurface.findFirst({
        where: {
          tenantId,
          brandId,
          type: 'ORIGINAL',
        },
      });

      if (!originalSurface) {
        originalSurface = await tx.webSurface.create({
          data: {
            tenantId,
            brandId,
            name: 'Original Website',
            type: 'ORIGINAL',
            status: 'ACTIVE',
          },
        });
      }

      let wwwDomain = await tx.domain.findFirst({
        where: { hostname: 'www.sastikaatravel.com' },
      });

      if (!wwwDomain) {
        await tx.domain.create({
          data: {
            tenantId,
            brandId,
            webSurfaceId: originalSurface.id,
            hostname: 'www.sastikaatravel.com',
            isPrimary: true,
            isVerified: true,
            sslStatus: 'ACTIVE',
          },
        });
      } else {
        await tx.domain.update({
          where: { id: wwwDomain.id },
          data: {
            webSurfaceId: originalSurface.id,
            isPrimary: true,
          },
        });
      }

      // 5. Ensure Single-Page HOME template with sections
      let template = await tx.pageTemplate.findFirst({
        where: {
          webSurfaceId: localBiSurface.id,
          type: 'HOME',
        },
      });

      if (!template) {
        template = await tx.pageTemplate.create({
          data: {
            tenantId,
            brandId,
            webSurfaceId: localBiSurface.id,
            name: 'Home Template',
            type: 'HOME',
          },
        });
      }

      const singlePagePuckData = {
        content: [
          {
            type: 'BrandHeader',
            props: {
              id: 'BrandHeader-nav',
              showCta: true,
              ctaLabel: 'Plan Journey',
              link1Label: 'Home',
              link1Url: '/#home',
              link2Label: 'About',
              link2Url: '/#about',
            },
          },
          {
            type: 'HeroBanner',
            props: {
              id: 'home',
              badgeText: 'Premier Travel & Holiday Solutions',
              headline: 'Discover the World with Sastikaa Travel Agency',
              subheading:
                'Your trusted travel partner for international flight ticketing, customized world tour packages, express visa assistance, and verified luxury hotel stays.',
              primaryCtaText: 'Explore Tour Packages',
              primaryCtaUrl: '/#services',
              secondaryCtaText: 'Get Free Travel Quote',
              secondaryCtaUrl: '/#contact',
              showStatChips: true,
              statChip1: '✈️ 50,000+ Happy Travelers',
              statChip2: '⭐ 4.9 Verified Reviews',
              backgroundImage:
                'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1600&q=80',
              overlayGradient: 'indigo',
            },
          },
          {
            type: 'WhyChooseUs',
            props: {
              id: 'about',
              headline: 'Why Travelers Choose Sastikaa Travel Agency',
              point1Title: 'Decade of Trusted Travel Expertise',
              point1Desc:
                'We craft seamless international and domestic journeys with precision itineraries, certified guides, and personalized destination care.',
              point2Title: 'Unbeatable Rates & Zero Hidden Fees',
              point2Desc:
                'Direct partnerships with premier global airlines, resort chains, and local operators ensure you always get unmatched value.',
              point3Title: '24/7 Dedicated Concierge Support',
              point3Desc:
                'From your first flight booking until you safely return home, our personal travel concierge is on call to assist you round the clock.',
            },
          },
          {
            type: 'ServicesGrid',
            props: {
              id: 'services',
              headline: 'Our Core Travel Services & Offerings',
              subheading:
                'Comprehensive solutions designed for family holidays, honeymoon escapes, solo adventures, and corporate travel.',
              columns: 4,
              service1Title: 'Worldwide Flight Ticketing',
              service1Desc:
                'Instant booking on premier global carriers with exclusive discounted airfares, flexible rescheduling, and zero hassle.',
              service2Title: 'Custom Tour Packages',
              service2Desc:
                'Curated vacation packages covering Europe, Southeast Asia, Dubai, Maldives, Bali, and scenic Indian destinations.',
              service3Title: 'Express Visa Assistance',
              service3Desc:
                'Fast-track tourist and business visa filing with high approval rates, step-by-step document verification, and guidance.',
              service4Title: 'Verified Hotels & Stays',
              service4Desc:
                'Handpicked beachfront resorts, boutique hotels, and luxury accommodations with best-rate guarantees and complimentary perks.',
            },
          },
          {
            type: 'ContactForm',
            props: {
              id: 'contact',
              title: 'Plan Your Next Journey With Us',
              subtitle:
                'Share your destination wishlist or flight inquiry and our experienced travel specialists will send you a tailored itinerary within 2 hours.',
            },
          },
          {
            type: 'BrandFooter',
            props: {
              id: 'BrandFooter-site',
              copyrightText:
                '© 2026 Sastikaa Travel Agency. All rights reserved. Connecting travelers to the world.',
              showSocialLinks: true,
            },
          },
        ],
        root: {
          props: {
            navigation: {
              headerItems: [
                { id: 'nav-home', label: 'Home', type: 'INTERNAL_PAGE', target: '/#home', order: 1, openInNewTab: false },
                { id: 'nav-about', label: 'About', type: 'INTERNAL_PAGE', target: '/#about', order: 2, openInNewTab: false },
                { id: 'nav-services', label: 'Services', type: 'INTERNAL_PAGE', target: '/#services', order: 3, openInNewTab: false },
                { id: 'nav-contact', label: 'Contact', type: 'INTERNAL_PAGE', target: '/#contact', order: 4, openInNewTab: false },
              ],
              footerItems: [
                { id: 'foot-home', label: 'Home', type: 'INTERNAL_PAGE', target: '/#home', order: 1, openInNewTab: false },
                { id: 'foot-about', label: 'About', type: 'INTERNAL_PAGE', target: '/#about', order: 2, openInNewTab: false },
                { id: 'foot-services', label: 'Services', type: 'INTERNAL_PAGE', target: '/#services', order: 3, openInNewTab: false },
                { id: 'foot-contact', label: 'Contact', type: 'INTERNAL_PAGE', target: '/#contact', order: 4, openInNewTab: false },
              ],
            },
          },
        },
      };

      // Ensure ALL versions (draft and published) of this template have the single-page layout
      await tx.pageTemplateVersion.updateMany({
        where: { pageTemplateId: template.id },
        data: { puckData: singlePagePuckData },
      });

      const publishedVersion = await tx.pageTemplateVersion.findFirst({
        where: {
          pageTemplateId: template.id,
          status: 'PUBLISHED',
        },
      });

      if (!publishedVersion) {
        await tx.pageTemplateVersion.create({
          data: {
            tenantId,
            pageTemplateId: template.id,
            version: 1,
            status: 'PUBLISHED',
            publishedAt: new Date(),
            puckData: singlePagePuckData,
          },
        });
      }

      console.log('[ensure-production-seeds] Single-page website verified and configured successfully.');
    });
  } catch (err) {
    console.error('[ensure-production-seeds] Error during seed execution:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
