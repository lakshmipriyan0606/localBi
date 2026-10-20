-- =============================================================================
-- Migration: 20261020000000_secure_rls_recovery_and_hostname_resolution
--
-- PURPOSE:
-- 1. Tighten public RLS policies on brands, domains, web_surfaces, pages,
--    and page_template_versions so they strictly require app.public_read_scope = 'published_only'.
--    Eliminates broad `is_archived = false OR` and `status = 'ACTIVE' OR` clauses that
--    leaked tenant data without context.
-- 2. Provide hardened SECURITY DEFINER functions for custom portal domain and
--    storefront domain resolution with strict normalization, verification guards,
--    and least-privilege execution permissions.
-- 3. Standardize RLS policy naming on the 26 tenant tables from generic
--    'tenant_isolation_policy' to '<tablename>_tenant_isolation' using safe,
--    idempotent ALTER POLICY RENAME statements.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. HARDEN PUBLIC RLS POLICIES (ELIMINATE CROSS-TENANT DATA EXPOSURE)
-- -----------------------------------------------------------------------------

-- 1.1 Brands: Strictly enforce published-only scope; eliminate global read of all unarchived brands
DROP POLICY IF EXISTS "brands_public_select" ON "brands";
CREATE POLICY "brands_public_select" ON "brands"
  FOR SELECT TO localbi_app
  USING (
    NULLIF(current_setting('app.public_read_scope', true), '') = 'published_only'
    AND is_archived = false
  );

-- 1.2 Domains: Strictly enforce published-only scope; eliminate global read of all verified domains
DROP POLICY IF EXISTS "domains_public_select" ON "domains";
CREATE POLICY "domains_public_select" ON "domains"
  FOR SELECT TO localbi_app
  USING (
    NULLIF(current_setting('app.public_read_scope', true), '') = 'published_only'
    AND is_verified = true
  );

-- 1.3 Web Surfaces: Strictly enforce published-only scope; eliminate global read of all active surfaces
DROP POLICY IF EXISTS "web_surfaces_public_select" ON "web_surfaces";
CREATE POLICY "web_surfaces_public_select" ON "web_surfaces"
  FOR SELECT TO localbi_app
  USING (
    NULLIF(current_setting('app.public_read_scope', true), '') = 'published_only'
    AND status = 'ACTIVE'
  );

-- 1.4 Pages: Strictly enforce published-only scope
DROP POLICY IF EXISTS "pages_public_select" ON "pages";
CREATE POLICY "pages_public_select" ON "pages"
  FOR SELECT TO localbi_app
  USING (
    NULLIF(current_setting('app.public_read_scope', true), '') = 'published_only'
    AND status = 'PUBLISHED'
  );

-- 1.5 Page Template Versions: Strictly enforce published-only scope
DROP POLICY IF EXISTS "page_template_versions_public_select" ON "page_template_versions";
CREATE POLICY "page_template_versions_public_select" ON "page_template_versions"
  FOR SELECT TO localbi_app
  USING (
    NULLIF(current_setting('app.public_read_scope', true), '') = 'published_only'
    AND status = 'PUBLISHED'
  );

-- 1.5 Scoped Portal Domain Resolution Policy
DROP POLICY IF EXISTS portal_domains_resolution_select ON portal_domains;
CREATE POLICY portal_domains_resolution_select ON portal_domains
  FOR SELECT TO localbi_app, localbi_migrator
  USING (
    status = 'ACTIVE'
    AND NULLIF(current_setting('app.hostname_resolution_scope', true), '') = 'active_domain_only'
  );

-- -----------------------------------------------------------------------------
-- 2. HARDENED SECURITY DEFINER FUNCTIONS FOR HOSTNAME RESOLUTION
-- -----------------------------------------------------------------------------

-- 2.1 Portal Domain Resolution (Phase 14 Agency White-Label Portals)
CREATE OR REPLACE FUNCTION resolve_portal_domain(p_hostname TEXT)
RETURNS TABLE (
  tenant_id TEXT,
  tenant_name TEXT,
  tenant_slug TEXT,
  tenant_status TEXT,
  domain_id TEXT,
  hostname TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clean_host TEXT;
BEGIN
  -- Strict sanitization: trim, lowercase, strip trailing dot
  IF p_hostname IS NULL THEN
    RETURN;
  END IF;

  v_clean_host := lower(trim(p_hostname));
  IF v_clean_host LIKE '%.' THEN
    v_clean_host := substring(v_clean_host from 1 for length(v_clean_host) - 1);
  END IF;

  -- Validate length and basic hostname structure (alphanumeric, hyphens, underscores, dots)
  IF length(v_clean_host) = 0 OR length(v_clean_host) > 255 OR v_clean_host !~ '^[a-z0-9]([a-z0-9_-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9_-]{0,61}[a-z0-9])?)*$' THEN
    RETURN;
  END IF;

  PERFORM set_config('app.hostname_resolution_scope', 'active_domain_only', true);

  RETURN QUERY
  SELECT
    t.id AS tenant_id,
    t.name AS tenant_name,
    t.slug AS tenant_slug,
    t.status AS tenant_status,
    pd.id AS domain_id,
    pd.hostname,
    pd.status
  FROM public.portal_domains pd
  JOIN public.tenants t ON t.id = pd.tenant_id
  WHERE pd.hostname = v_clean_host
    AND pd.status = 'ACTIVE'
    AND t.status = 'ACTIVE'
  LIMIT 1;

  PERFORM set_config('app.hostname_resolution_scope', '', true);
END;
$$;

REVOKE ALL ON FUNCTION resolve_portal_domain(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resolve_portal_domain(TEXT) TO localbi_app;

-- 2.2 Storefront Domain Resolution (Phase 3/4 Website Engine)
CREATE OR REPLACE FUNCTION resolve_storefront_domain(p_hostname TEXT)
RETURNS TABLE (
  tenant_id TEXT,
  tenant_name TEXT,
  tenant_slug TEXT,
  brand_id TEXT,
  brand_name TEXT,
  brand_slug TEXT,
  web_surface_id TEXT,
  web_surface_name TEXT,
  web_surface_type TEXT,
  web_surface_status TEXT,
  domain_id TEXT,
  hostname TEXT,
  is_primary BOOLEAN,
  is_verified BOOLEAN,
  ssl_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clean_host TEXT;
BEGIN
  IF p_hostname IS NULL THEN
    RETURN;
  END IF;

  v_clean_host := lower(trim(p_hostname));
  IF v_clean_host LIKE '%.' THEN
    v_clean_host := substring(v_clean_host from 1 for length(v_clean_host) - 1);
  END IF;

  IF length(v_clean_host) = 0 OR length(v_clean_host) > 255 OR v_clean_host !~ '^[a-z0-9]([a-z0-9_-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9_-]{0,61}[a-z0-9])?)*$' THEN
    RETURN;
  END IF;

  PERFORM set_config('app.public_read_scope', 'published_only', true);

  RETURN QUERY
  SELECT
    t.id AS tenant_id,
    t.name AS tenant_name,
    t.slug AS tenant_slug,
    b.id AS brand_id,
    b.name AS brand_name,
    b.slug AS brand_slug,
    ws.id AS web_surface_id,
    ws.name AS web_surface_name,
    ws.type AS web_surface_type,
    ws.status AS web_surface_status,
    d.id AS domain_id,
    d.hostname,
    d.is_primary,
    d.is_verified,
    d.ssl_status
  FROM public.domains d
  JOIN public.tenants t ON t.id = d.tenant_id
  JOIN public.brands b ON b.id = d.brand_id
  JOIN public.web_surfaces ws ON ws.id = d.web_surface_id
  WHERE d.hostname = v_clean_host
    AND d.is_verified = true
    AND ws.status = 'ACTIVE'
    AND t.status = 'ACTIVE'
    AND b.is_archived = false
  LIMIT 1;

  PERFORM set_config('app.public_read_scope', '', true);
END;
$$;

REVOKE ALL ON FUNCTION resolve_storefront_domain(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resolve_storefront_domain(TEXT) TO localbi_app;

-- -----------------------------------------------------------------------------
-- 3. STANDARDIZE RLS POLICY NAMES (RESOLVE GATE 5.4 CATALOG CONTRACT)
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  tables_to_rename TEXT[] := ARRAY[
    'virtual_numbers',
    'calls',
    'call_events',
    'opportunities',
    'opportunity_evidence',
    'content_authors',
    'content_categories',
    'content_briefs',
    'content_items',
    'content_versions',
    'content_relations',
    'redirects',
    'listing_store_hours',
    'directory_listings',
    'duplicate_listing_candidates',
    'listing_change_sets',
    'report_snapshots',
    'report_schedules',
    'report_deliveries',
    'report_presets',
    'client_accounts',
    'access_grants',
    'white_label_configs',
    'portal_domains',
    'tenant_entitlements',
    'client_feature_entitlements',
    'referring_domains',
    'backlink_records'
  ];
  t TEXT;
  target_policy TEXT;
BEGIN
  FOREACH t IN ARRAY tables_to_rename LOOP
    target_policy := t || '_tenant_isolation';
    IF EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = 'tenant_isolation_policy'
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = target_policy
    ) THEN
      EXECUTE format('ALTER POLICY "tenant_isolation_policy" ON %I RENAME TO %I', t, target_policy);
    END IF;

    -- Ensure explicit WITH CHECK clause is attached to meet Gate 5.4 contract
    IF EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = target_policy
    ) THEN
      EXECUTE format('ALTER POLICY %I ON %I WITH CHECK (tenant_id = NULLIF(current_setting(''app.current_tenant_id'', true), ''''))', target_policy, t);
    END IF;
  END LOOP;
END $$;
