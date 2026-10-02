-- Phase 9: Virtual Number Mapping + Call Tracking + Telephony Attribution
-- Inbound Calls + Provider Webhooks + Store/Page Attribution
--
-- Creates tables for Virtual Numbers, Inbound Calls, and Call Events
-- with strict Dual-Role PostgreSQL 16 Row Level Security (RLS).

-- ============================================================
-- 1. Alter Locations table to add store destination phone
-- ============================================================

ALTER TABLE locations ADD COLUMN IF NOT EXISTS phone TEXT;

-- ============================================================
-- 2. Virtual Numbers Table
-- ============================================================

CREATE TABLE IF NOT EXISTS virtual_numbers (
  id                   TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  tenant_id            TEXT        NOT NULL,
  brand_id             TEXT        NOT NULL,
  store_id             TEXT,
  web_surface_id       TEXT,
  provider             TEXT        NOT NULL, -- TWILIO, EXOTEL, TEST_ADAPTER, MANUAL
  provider_number_id   TEXT,
  phone_number         TEXT        NOT NULL, -- Normalized E.164 (e.g. +914441234567)
  country_code         TEXT        NOT NULL DEFAULT 'IN',
  forwarding_number    TEXT,                 -- Destination phone number (real store phone)
  status               TEXT        NOT NULL DEFAULT 'AVAILABLE', -- AVAILABLE, PROVISIONING, ACTIVE, SUSPENDED, RELEASE_PENDING, RELEASED, ERROR
  capabilities         JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at         TIMESTAMPTZ,
  released_at          TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_virtual_numbers PRIMARY KEY (id),
  CONSTRAINT uq_virtual_number_tenant_id UNIQUE (tenant_id, id),
  CONSTRAINT uq_virtual_number_phone UNIQUE (tenant_id, phone_number),
  CONSTRAINT fk_virtual_numbers_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_virtual_numbers_brand  FOREIGN KEY (tenant_id, brand_id) REFERENCES brands(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_virtual_numbers_store  FOREIGN KEY (store_id) REFERENCES locations(id) ON DELETE SET NULL,
  CONSTRAINT fk_virtual_numbers_surface FOREIGN KEY (web_surface_id) REFERENCES web_surfaces(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_vnumber_brand_status
  ON virtual_numbers (tenant_id, brand_id, status);

CREATE INDEX IF NOT EXISTS idx_vnumber_store_status
  ON virtual_numbers (tenant_id, store_id, status);

-- ============================================================
-- 3. Inbound Calls Table
-- ============================================================

CREATE TABLE IF NOT EXISTS calls (
  id                     TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  tenant_id              TEXT        NOT NULL,
  brand_id               TEXT        NOT NULL,
  store_id               TEXT,
  web_surface_id         TEXT,
  page_id                TEXT,
  product_id             TEXT,
  virtual_number_id      TEXT        NOT NULL,
  provider               TEXT        NOT NULL, -- TWILIO, EXOTEL, TEST_ADAPTER, MANUAL
  provider_call_id       TEXT        NOT NULL, -- Provider's Call SID / ID
  direction              TEXT        NOT NULL DEFAULT 'INBOUND',
  caller_number          TEXT,                 -- E.164 caller phone (PII)
  caller_number_masked   TEXT,                 -- Masked for non-PII roles (e.g. +91 ******1234)
  destination_number     TEXT,                 -- Forwarded destination
  status                 TEXT        NOT NULL, -- INITIATED, RINGING, ANSWERED, COMPLETED, MISSED, BUSY, FAILED, CANCELLED
  started_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  answered_at            TIMESTAMPTZ,
  ended_at               TIMESTAMPTZ,
  duration_seconds       INTEGER     NOT NULL DEFAULT 0,
  talk_duration_seconds  INTEGER     NOT NULL DEFAULT 0,
  recording_url          TEXT,
  attribution_confidence TEXT        NOT NULL DEFAULT 'STORE_NUMBER', -- STORE_NUMBER, SESSION_DNI, CALL_CLICK_CORRELATED, DIRECT, UNKNOWN
  source                 TEXT,                 -- google_organic, direct, google_ads, gbp
  medium                 TEXT,
  campaign               TEXT,
  attribution_session_id TEXT,
  lead_id                TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_calls PRIMARY KEY (id),
  CONSTRAINT uq_call_tenant_id UNIQUE (tenant_id, id),
  CONSTRAINT uq_call_provider_call_id UNIQUE (tenant_id, provider, provider_call_id),
  CONSTRAINT fk_calls_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_calls_brand  FOREIGN KEY (tenant_id, brand_id) REFERENCES brands(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_calls_store  FOREIGN KEY (store_id) REFERENCES locations(id) ON DELETE SET NULL,
  CONSTRAINT fk_calls_surface FOREIGN KEY (web_surface_id) REFERENCES web_surfaces(id) ON DELETE SET NULL,
  CONSTRAINT fk_calls_vnumber FOREIGN KEY (virtual_number_id) REFERENCES virtual_numbers(id) ON DELETE CASCADE,
  CONSTRAINT fk_calls_lead   FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_calls_brand_started
  ON calls (tenant_id, brand_id, started_at);

CREATE INDEX IF NOT EXISTS idx_calls_store_started
  ON calls (tenant_id, store_id, started_at);

CREATE INDEX IF NOT EXISTS idx_calls_status_started
  ON calls (tenant_id, status, started_at);

-- ============================================================
-- 4. Call Events Lifecycle Table
-- ============================================================

CREATE TABLE IF NOT EXISTS call_events (
  id                 TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  tenant_id          TEXT        NOT NULL,
  call_id            TEXT        NOT NULL,
  provider           TEXT        NOT NULL,
  provider_event_id  TEXT        NOT NULL,
  event_type         TEXT        NOT NULL, -- initiated, ringing, answered, completed, hangup, etc.
  occurred_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload_hash       TEXT        NOT NULL, -- SHA-256 for idempotency
  details            JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pk_call_events PRIMARY KEY (id),
  CONSTRAINT uq_call_event_tenant_id UNIQUE (tenant_id, id),
  CONSTRAINT uq_call_event_provider_event UNIQUE (tenant_id, provider, provider_event_id),
  CONSTRAINT fk_call_events_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_call_events_call   FOREIGN KEY (call_id) REFERENCES calls(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_call_events_call_occurred
  ON call_events (tenant_id, call_id, occurred_at);

-- ============================================================
-- 5. Row Level Security (RLS) Policies
-- ============================================================

-- Table 1: virtual_numbers
ALTER TABLE virtual_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE virtual_numbers FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON virtual_numbers;
CREATE POLICY tenant_isolation_policy ON virtual_numbers
  FOR ALL
  TO localbi_app
  USING (
    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text
    OR (
      NULLIF(current_setting('app.telephony_lookup_scope', true), '') = 'number_lookup'
      AND status IN ('ACTIVE', 'RELEASE_PENDING', 'RELEASED')
    )
  )
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text);

-- Table 2: calls
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON calls;
CREATE POLICY tenant_isolation_policy ON calls
  FOR ALL
  TO localbi_app
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text);

-- Table 3: call_events
ALTER TABLE call_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON call_events;
CREATE POLICY tenant_isolation_policy ON call_events
  FOR ALL
  TO localbi_app
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::text);
