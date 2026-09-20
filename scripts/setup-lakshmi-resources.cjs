/**
 * Setup brand and storefront location for lakshmi-food
 */

const { PrismaClient } = require('@prisma/client');

async function main() {
  const appUrl =
    process.env.DATABASE_URL ||
    'postgresql://localbi_app:app_password@127.0.0.1:5432/localbi?schema=public';

  const prisma = new PrismaClient({
    datasources: { db: { url: appUrl } },
  });

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: 'lakshmi-food' },
    });

    if (!tenant) {
      console.error('Tenant lakshmi-food not found!');
      process.exit(1);
    }

    console.log(`Found tenant: ${tenant.name} (${tenant.id})`);

    // Run inside transaction setting app.current_tenant_id
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenant.id}, true)`;

      let brand = await tx.brand.findFirst({
        where: { tenantId: tenant.id, slug: 'lakshmi-food' },
      });

      if (!brand) {
        brand = await tx.brand.create({
          data: {
            tenantId: tenant.id,
            name: 'Lakshmi Food',
            slug: 'lakshmi-food',
          },
        });
        console.log(`[OK] Created Brand: ${brand.name} (ID: ${brand.id})`);
      } else {
        console.log(`[OK] Brand already exists: ${brand.name} (ID: ${brand.id})`);
      }

      let location = await tx.location.findFirst({
        where: { tenantId: tenant.id, brandId: brand.id },
      });

      if (!location) {
        location = await tx.location.create({
          data: {
            tenantId: tenant.id,
            brandId: brand.id,
            name: 'Lakshmi Food - Main Storefront',
            storeCode: 'LF-01',
            addressLine1: 'Chennai Main Storefront',
            city: 'Chennai',
            state: 'Tamil Nadu',
            postalCode: '600001',
            country: 'IN',
            timezone: 'Asia/Kolkata',
          },
        });
        console.log(`[OK] Created Storefront Location: ${location.name} (ID: ${location.id})`);
      } else {
        console.log(`[OK] Location already exists: ${location.name} (ID: ${location.id})`);
      }
    });

    console.log('\n[SUCCESS] Brand and Location configured for lakshmi-food!');
  } catch (err) {
    console.error('Error setting up resources:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
