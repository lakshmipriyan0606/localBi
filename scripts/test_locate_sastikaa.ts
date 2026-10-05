import { prisma } from '@/shared/database/client';
import { TenantContextService } from '@/shared/database/tenant-context';
import { SurfaceService } from '@/modules/page-builder/surface-service';
import { PageContextService } from '@/modules/page-builder/page-context-service';
import { SiteStudioService } from '@/modules/page-builder/site-studio-service';

async function main() {
  try {
    console.log('1. Finding tenant and brand "Sastikaa Travel Agency"...');
    const tenant = await prisma.tenant.findFirst({
      where: { status: 'ACTIVE' },
    });
    if (!tenant) throw new Error('No active tenant found');

    const brand = await TenantContextService.withTenantContext(prisma, tenant.id, (tx) =>
      tx.brand.findFirst({
        where: { slug: 'sastikaa-travel' },
      })
    );

    if (!brand) {
      console.error('Brand sastikaa-travel not found.');
      return;
    }
    console.log(`Found Brand: ${brand.name} (${brand.id}) in Tenant: ${brand.tenantId}`);

    const tenantId = brand.tenantId;

    console.log('\n2. Fetching WebSurface for Sastikaa Travel...');
    const surface = await SiteStudioService.getOrCreateLocalBiSurface(tenantId, brand.id);
    console.log(`Surface ID: ${surface.id}, Name: ${surface.name}`);

    console.log('\n3. Adding Subdomain "locate.sastikaatravel.com" ...');
    const targetSubdomain = 'locate.sastikaatravel.com';

    let domain = await TenantContextService.withTenantContext(prisma, tenantId, (tx) =>
      tx.domain.findFirst({
        where: { hostname: targetSubdomain },
      })
    );

    if (!domain) {
      domain = await SurfaceService.addDomain(
        tenantId,
        brand.id,
        surface.id,
        targetSubdomain,
        true // make it primary
      );
      console.log(`Successfully added and set primary: ${domain.hostname} (isPrimary: ${domain.isPrimary})`);
    } else {
      console.log(`Domain ${targetSubdomain} already exists (isPrimary: ${domain.isPrimary}).`);
      if (!domain.isPrimary) {
        await SurfaceService.setPrimaryDomain(tenantId, surface.id, domain.id);
        console.log(`Set ${targetSubdomain} as PRIMARY domain.`);
      }
    }

    console.log('\n4. Testing SurfaceService.resolveHost("locate.sastikaatravel.com")...');
    const resolvedHost = await SurfaceService.resolveHost(targetSubdomain);
    if (!resolvedHost) {
      console.error('Failed to resolve host!');
      return;
    }
    console.log('Resolved Host:', {
      tenant: resolvedHost.tenant.name,
      brand: resolvedHost.brand.name,
      webSurface: resolvedHost.webSurface.name,
      hostname: resolvedHost.domain?.hostname,
      isPrimary: resolvedHost.domain?.isPrimary,
    });

    console.log('\n5. Testing PageContextService.resolveByHostnameOrSubdomain("locate.sastikaatravel.com", [])...');
    const pageContext = await PageContextService.resolveByHostnameOrSubdomain(targetSubdomain, []);
    if (!pageContext) {
      console.error('Failed to resolve page context!');
      return;
    }
    console.log('\nResolved Page Context for locate.sastikaatravel.com:');
    console.log(' - Brand:', pageContext.brand.name);
    console.log(' - Primary Domain:', pageContext.domain?.hostname);
    console.log(' - SEO Title:', pageContext.seo.title);
    console.log(' - SEO Canonical:', pageContext.seo.canonicalUrl);
    console.log(' - SEO Robots:', pageContext.seo.robots);
    console.log(' - Tracking Context:', pageContext.trackingContext);
    console.log(' - Structured Data Count:', pageContext.structuredData?.length || 0);

    console.log('\n✓ SUBDOMAIN locate.sastikaatravel.com VERIFIED AND RESOLVES CLEANLY ON LOCALBI!');
  } catch (err) {
    console.error('Error during testing:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
