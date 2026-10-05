-- Row Level Security (RLS) policies for Public Domain & Surface Resolution
-- Allows incoming public traffic on verified custom domains to resolve tenant and published pages

-- 1. Domains public read for verified domains or published scope
DROP POLICY IF EXISTS "domains_public_select" ON "domains";
CREATE POLICY "domains_public_select" ON "domains"
  FOR SELECT TO localbi_app
  USING (
    is_verified = true 
    OR NULLIF(current_setting('app.public_read_scope', true), '') = 'published_only'
  );

-- 2. Web Surfaces public read for active surfaces or published scope
DROP POLICY IF EXISTS "web_surfaces_public_select" ON "web_surfaces";
CREATE POLICY "web_surfaces_public_select" ON "web_surfaces"
  FOR SELECT TO localbi_app
  USING (
    status = 'ACTIVE' 
    OR NULLIF(current_setting('app.public_read_scope', true), '') = 'published_only'
  );

-- 3. Brands public read for active brands or published scope
DROP POLICY IF EXISTS "brands_public_select" ON "brands";
CREATE POLICY "brands_public_select" ON "brands"
  FOR SELECT TO localbi_app
  USING (
    is_archived = false 
    OR NULLIF(current_setting('app.public_read_scope', true), '') = 'published_only'
  );

-- 4. Pages public read for published pages
DROP POLICY IF EXISTS "pages_public_select" ON "pages";
CREATE POLICY "pages_public_select" ON "pages"
  FOR SELECT TO localbi_app
  USING (
    status = 'PUBLISHED' 
    OR NULLIF(current_setting('app.public_read_scope', true), '') = 'published_only'
  );

-- 5. Page templates public read
DROP POLICY IF EXISTS "page_templates_public_select" ON "page_templates";
CREATE POLICY "page_templates_public_select" ON "page_templates"
  FOR SELECT TO localbi_app
  USING (
    NULLIF(current_setting('app.public_read_scope', true), '') = 'published_only'
  );

-- 6. Page template versions public read
DROP POLICY IF EXISTS "page_template_versions_public_select" ON "page_template_versions";
CREATE POLICY "page_template_versions_public_select" ON "page_template_versions"
  FOR SELECT TO localbi_app
  USING (
    status = 'PUBLISHED'
    OR NULLIF(current_setting('app.public_read_scope', true), '') = 'published_only'
  );
