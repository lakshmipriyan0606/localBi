import { PrismaClient } from '@prisma/client';

async function main() {
  const directUrl = process.env['DIRECT_URL'] || process.env['MIGRATOR_DATABASE_URL'] || '';
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: directUrl,
      },
    },
  });

  const statements = [
    `DROP POLICY IF EXISTS "categories_tenant_isolation" ON "categories";`,
    `CREATE POLICY "categories_tenant_isolation" ON "categories"
        FOR ALL
        TO localbi_app
        USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
        WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));`,

    `DROP POLICY IF EXISTS "store_products_tenant_isolation" ON "store_products";`,
    `CREATE POLICY "store_products_tenant_isolation" ON "store_products"
        FOR ALL
        TO localbi_app
        USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
        WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));`,

    `DROP POLICY IF EXISTS "product_media_tenant_isolation" ON "product_media";`,
    `CREATE POLICY "product_media_tenant_isolation" ON "product_media"
        FOR ALL
        TO localbi_app
        USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
        WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));`,

    `DROP POLICY IF EXISTS "products_tenant_isolation" ON "products";`,
    `CREATE POLICY "products_tenant_isolation" ON "products"
        FOR ALL
        TO localbi_app
        USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
        WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));`,
  ];

  for (const stmt of statements) {
    await prisma.$executeRawUnsafe(stmt);
  }
  console.log('Catalog RLS policies successfully updated as table owner!');
  await prisma.$disconnect();
}

main().catch(console.error);
