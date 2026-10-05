import { PrismaClient } from '@prisma/client';

const migratorUrl =
  process.env.MIGRATOR_DATABASE_URL ||
  process.env.DIRECT_URL ||
  'postgresql://localbi_migrator:8c64a30a649493b0796970d65bdde5e7@127.0.0.1:5432/localbi?schema=public';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: migratorUrl,
    },
  },
});

async function main() {
  const statements = [
    // 1. Domains public read
    `DROP POLICY IF EXISTS "domains_public_select" ON "domains";`,
    `CREATE POLICY "domains_public_select" ON "domains"
      FOR SELECT TO localbi_app
      USING (
        is_verified = true 
        OR NULLIF(current_setting('app.public_read_scope', true), '') = 'published_only'
      );`,

    // 2. Web Surfaces public read
    `DROP POLICY IF EXISTS "web_surfaces_public_select" ON "web_surfaces";`,
    `CREATE POLICY "web_surfaces_public_select" ON "web_surfaces"
      FOR SELECT TO localbi_app
      USING (
        status = 'ACTIVE' 
        OR NULLIF(current_setting('app.public_read_scope', true), '') = 'published_only'
      );`,

    // 3. Brands public read
    `DROP POLICY IF EXISTS "brands_public_select" ON "brands";`,
    `CREATE POLICY "brands_public_select" ON "brands"
      FOR SELECT TO localbi_app
      USING (
        is_archived = false 
        OR NULLIF(current_setting('app.public_read_scope', true), '') = 'published_only'
      );`,

    // 4. Pages public read
    `DROP POLICY IF EXISTS "pages_public_select" ON "pages";`,
    `CREATE POLICY "pages_public_select" ON "pages"
      FOR SELECT TO localbi_app
      USING (
        status = 'PUBLISHED' 
        OR NULLIF(current_setting('app.public_read_scope', true), '') = 'published_only'
      );`,

    // 5. Page templates public read
    `DROP POLICY IF EXISTS "page_templates_public_select" ON "page_templates";`,
    `CREATE POLICY "page_templates_public_select" ON "page_templates"
      FOR SELECT TO localbi_app
      USING (
        NULLIF(current_setting('app.public_read_scope', true), '') = 'published_only'
      );`,

    // 6. Page template versions public read
    `DROP POLICY IF EXISTS "page_template_versions_public_select" ON "page_template_versions";`,
    `CREATE POLICY "page_template_versions_public_select" ON "page_template_versions"
      FOR SELECT TO localbi_app
      USING (
        status = 'PUBLISHED'
        OR NULLIF(current_setting('app.public_read_scope', true), '') = 'published_only'
      );`,
  ];

  for (const sql of statements) {
    await prisma.$executeRawUnsafe(sql);
  }
  console.log('Public read policies applied successfully via localbi_migrator!');
}

main().finally(() => prisma.$disconnect());
