-- =============================================================================
-- Migration: 20261020010000_phase02_resolver_role_isolation
-- Purpose:   Phase 0.2 Security Hardening: Neutralize Custom GUC Scope Vulnerability
--            and Isolate Hostname Resolution to Dedicated Non-Login Resolver Role
-- =============================================================================

-- 1. Create Dedicated Non-Login Hostname Resolver Role
-- Attributes: Strictly NOLOGIN, NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOREPLICATION, BYPASSRLS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'localbi_resolver') THEN
    BEGIN
      CREATE ROLE localbi_resolver WITH
        NOLOGIN
        NOSUPERUSER
        NOCREATEDB
        NOCREATEROLE
        NOREPLICATION
        BYPASSRLS;
    EXCEPTION
      WHEN insufficient_privilege THEN
        RAISE EXCEPTION 'Role localbi_resolver must be pre-created by database administrator or init-db.sh: CREATE ROLE localbi_resolver WITH NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION BYPASSRLS;';
    END;
  END IF;
END $$;

-- 2. Grant Column-Level Minimal SELECT Privileges to localbi_resolver
GRANT USAGE ON SCHEMA public TO localbi_resolver;
GRANT SELECT (id, tenant_id, hostname, status) ON public.portal_domains TO localbi_resolver;
GRANT SELECT (id, name, slug, status) ON public.tenants TO localbi_resolver;
GRANT SELECT (id, tenant_id, brand_id, web_surface_id, hostname, is_primary, is_verified, ssl_status) ON public.domains TO localbi_resolver;
GRANT SELECT (id, tenant_id, brand_id, type, name, status) ON public.web_surfaces TO localbi_resolver;
GRANT SELECT (id, tenant_id, name, slug, is_archived) ON public.brands TO localbi_resolver;

-- 3. Drop all GUC-based Permissive Select Policies (Neutralizing GUC Scope Bypass)
DROP POLICY IF EXISTS portal_domains_resolution_select ON portal_domains;
DROP POLICY IF EXISTS brands_public_select ON brands;
DROP POLICY IF EXISTS domains_public_select ON domains;
DROP POLICY IF EXISTS web_surfaces_public_select ON web_surfaces;
DROP POLICY IF EXISTS pages_public_select ON pages;
DROP POLICY IF EXISTS page_template_versions_public_select ON page_template_versions;

-- 4. Hardened resolve_portal_domain (Owned by localbi_resolver, no GUC dependency)
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
  IF p_hostname IS NULL THEN RETURN; END IF;
  v_clean_host := lower(trim(p_hostname));
  IF v_clean_host LIKE '%.' THEN
    v_clean_host := substring(v_clean_host from 1 for length(v_clean_host) - 1);
  END IF;

  -- Validate length and RFC 1123 hostname format (alphanumeric and hyphens, no underscores)
  IF length(v_clean_host) = 0 OR length(v_clean_host) > 255 OR v_clean_host !~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$' THEN
    RETURN;
  END IF;

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
END;
$$;

-- 5. Hardened resolve_storefront_domain (Owned by localbi_resolver, supports custom domain & brand slug)
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
  IF p_hostname IS NULL THEN RETURN; END IF;
  v_clean_host := lower(trim(p_hostname));
  IF v_clean_host LIKE '%.' THEN
    v_clean_host := substring(v_clean_host from 1 for length(v_clean_host) - 1);
  END IF;

  -- Validate length and RFC 1123 hostname/slug format (alphanumeric and hyphens, no underscores)
  IF length(v_clean_host) = 0 OR length(v_clean_host) > 255 OR v_clean_host !~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$' THEN
    RETURN;
  END IF;

  -- 1. Try exact verified custom storefront domain match
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

  IF FOUND THEN RETURN; END IF;

  -- 2. Fallback: Try brand slug / subdomain match
  -- Note: Brand slugs are unique per tenant (uq_brand_tenant_slug), NOT globally unique.
  -- If more than one active tenant has an active brand matching this slug, the query MUST NOT
  -- choose an arbitrary tenant (which would violate tenant isolation). It must fail closed.
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
    NULL::TEXT AS domain_id,
    NULL::TEXT AS hostname,
    false AS is_primary,
    true AS is_verified,
    'ACTIVE'::TEXT AS ssl_status
  FROM public.brands b
  JOIN public.tenants t ON t.id = b.tenant_id
  JOIN public.web_surfaces ws ON ws.brand_id = b.id AND ws.tenant_id = b.tenant_id
  WHERE b.slug = v_clean_host
    AND ws.status = 'ACTIVE'
    AND t.status = 'ACTIVE'
    AND b.is_archived = false
    AND (
      SELECT count(DISTINCT b2.tenant_id)
      FROM public.brands b2
      JOIN public.tenants t2 ON t2.id = b2.tenant_id
      JOIN public.web_surfaces ws2 ON ws2.brand_id = b2.id AND ws2.tenant_id = b2.tenant_id
      WHERE b2.slug = v_clean_host
        AND ws2.status = 'ACTIVE'
        AND t2.status = 'ACTIVE'
        AND b2.is_archived = false
    ) = 1
  LIMIT 1;
END;
$$;

-- 6. Set function ownership to localbi_resolver
ALTER FUNCTION resolve_portal_domain(TEXT) OWNER TO localbi_resolver;
ALTER FUNCTION resolve_storefront_domain(TEXT) OWNER TO localbi_resolver;

-- 7. Restrict function execution strictly to localbi_app
REVOKE ALL ON FUNCTION resolve_portal_domain(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resolve_portal_domain(TEXT) TO localbi_app;

REVOKE ALL ON FUNCTION resolve_storefront_domain(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resolve_storefront_domain(TEXT) TO localbi_app;
