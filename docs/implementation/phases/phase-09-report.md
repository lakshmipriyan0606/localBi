# Phase 9: Virtual Number Mapping + Call Tracking + Telephony Attribution Engine Report

**Phase:** 09  
**Status:** COMPLETED  
**Date:** October 2026  
**Author:** AI Agent (Antigravity)  
**Corpus/Repo:** `localBi`

---

## 1. Executive Summary

Phase 9 implements the enterprise-grade **Virtual Number Mapping + Call Tracking + Telephony Attribution Engine** for LocalBi, strictly adhering to the architectural requirements defined in `prompt.md` (Sections 7395–9260).

The engine enables LocalBi clients to factually answer:
> *"How many real phone calls did LocalBi generate, from which page, which store, and which source?"*

Key Architectural Accomplishments:
1. **Factual Telephony Attribution (No Synthetic Data)**:
   - Complete separation of browser button clicks (`AttributionEvent` with type `CALL_CLICK`) from actual provider inbound calls (`Call`).
   - Browser click intent does not create fake telephony calls. Unanswered or cancelled calls are tracked factually with zero talk duration and zero bogus conversions.
2. **Virtual Number Mapping & Safe Display Resolution**:
   - Store real telephone number preserved in `Location.phone`.
   - Virtual tracking numbers stored in `VirtualNumber.phoneNumber`.
   - Public store pages and CTA buttons resolve tracking numbers dynamically when active assignments exist, falling back safely to `Location.phone`.
   - Releasing numbers preserves full historical call logs (`status = RELEASED`, preserving foreign key relationships).
3. **Webhook Security & Server-Side Tenant Derivation**:
   - Cryptographic HMAC-SHA256 signature verification.
   - SHA-256 payload hashing for idempotent webhook deduplication.
   - Strict server-side tenant derivation: dialed tracking number resolves `tenantId`, `brandId`, `storeId`, and `webSurfaceId` from PostgreSQL. Inbound webhook payloads claiming arbitrary tenant IDs are unconditionally ignored.
4. **Out-of-Order Lifecycle State Machine**:
   - Resilient call lifecycle state machine (`CallStateMachine.resolveNextStatus`) handles network reordering. Terminal statuses (`COMPLETED`, `MISSED`, `BUSY`) are preserved even if intermediate events (`ANSWERED`, `RINGING`) arrive late.
5. **PII Masking & Dual-Role PostgreSQL 16 RLS**:
   - Caller phone numbers are masked (`+91 ******1234`) for standard roles (`VIEWER`, `ANALYST`, `LOCATION_MANAGER`) and only unmasked for privileged roles (`CLIENT_OWNER`, `CLIENT_ADMIN`).
   - Call recordings are protected and inaccessible to unauthorized roles.
   - Dual-Role RLS enforced on all new tables (`virtual_numbers`, `calls`, `call_events`), bringing total protected tenant tables to 62.
6. **Automatic Lead Generation**:
   - When a call enters `ANSWERED` or `COMPLETED` with non-zero duration, a `Lead` of type `CALL` is created or linked idempotently (`idempotencyKey = 'call_${call.id}'`).

---

## 2. Architecture & Data Model

### 2.1 Database Schema Additions (`prisma/schema.prisma`)

1. **`Location` model update**:
   - Added `phone String?` to store the real physical store telephone number.
2. **`VirtualNumber` model (`virtual_numbers`)**:
   - `id`, `tenantId`, `brandId`, `storeId`, `webSurfaceId`, `provider`, `providerNumberId`, `phoneNumber`, `countryCode`, `forwardingNumber`, `status`, `capabilities`, `createdAt`, `activatedAt`, `releasedAt`, `updatedAt`.
   - Unique constraints: `[tenantId, id]`, `[tenantId, phoneNumber]`.
3. **`Call` model (`calls`)**:
   - `id`, `tenantId`, `brandId`, `storeId`, `webSurfaceId`, `pageId`, `productId`, `virtualNumberId`, `provider`, `providerCallId`, `direction`, `callerNumber`, `callerNumberMasked`, `destinationNumber`, `status`, `startedAt`, `answeredAt`, `endedAt`, `durationSeconds`, `talkDurationSeconds`, `recordingUrl`, `attributionConfidence`, `source`, `medium`, `campaign`, `attributionSessionId`, `leadId`, `createdAt`, `updatedAt`.
   - Unique constraints: `[tenantId, id]`, `[tenantId, provider, providerCallId]`.
4. **`CallEvent` model (`call_events`)**:
   - `id`, `tenantId`, `callId`, `provider`, `providerEventId`, `eventType`, `occurredAt`, `payloadHash`, `details`, `createdAt`.
   - Unique constraints: `[tenantId, id]`, `[tenantId, provider, providerEventId]`.

### 2.2 Dual-Role PostgreSQL 16 RLS Migration

Applied migration `prisma/migrations/20261010000000_phase9_telephony_attribution/migration.sql`:
- Enabled and forced Dual-Role RLS on `virtual_numbers`, `calls`, and `call_events`.
- Enforces strict tenant isolation for application runtime role `localbi_app`:
  - `virtual_numbers`: write operations require `tenant_id = app.current_tenant_id`; read operations support scoped telephony webhook discovery via `app.telephony_lookup_scope = 'number_lookup'`.
  - `calls`: `tenant_id = app.current_tenant_id`.
  - `call_events`: `tenant_id = app.current_tenant_id`.
- Total RLS-protected tenant tables: **62 tables**.

---

## 3. Telephony Abstraction & Engine Services

### 3.1 Provider Abstraction Layer (`src/modules/telephony/`)
- [telephony-types.ts](file:///e:/project/localBi/src/modules/telephony/telephony-types.ts): Canonical DTOs, CallStatus, VirtualNumberStatus, AttributionConfidence, PhoneUtils (E.164 normalization, PII masking, SHA-256 payload hashing, spreadsheet CSV formula injection sanitization).
- [telephony-provider.ts](file:///e:/project/localBi/src/modules/telephony/telephony-provider.ts): Strict `TelephonyProvider` contract interface.
- [test-telephony-adapter.ts](file:///e:/project/localBi/src/modules/telephony/test-telephony-adapter.ts): Deterministic in-memory adapter supporting full lifecycle simulations, HMAC-SHA256 signature verification, forwarding failure simulation, and out-of-order delivery.
- [twilio-telephony-adapter.ts](file:///e:/project/localBi/src/modules/telephony/twilio-telephony-adapter.ts): Production adapter supporting Twilio Voice API, Twilio webhook signature validation (`X-Twilio-Signature`), and payload normalization.
- [telephony-registry.ts](file:///e:/project/localBi/src/modules/telephony/telephony-registry.ts): Provider registry resolving active provider dynamically.
- [call-state-machine.ts](file:///e:/project/localBi/src/modules/telephony/call-state-machine.ts): Precedence-aware state machine preserving terminal states against late-arriving non-terminal retries.

### 3.2 Core Services
- [virtual-number-service.ts](file:///e:/project/localBi/src/modules/telephony/virtual-number-service.ts):
  - `listAvailableNumbers`: Provider pool number discovery.
  - `provisionAndAssignNumber`: Provisions tracking number, validates E.164 format, configures provider forwarding to store phone (fail-closed rollback on forwarding rejection), and persists active `VirtualNumber`.
  - `updateStoreDestinationPhone`: Updates physical store phone in `Location.phone`, updates provider forwarding rules on all assigned virtual numbers, and updates `forwardingNumber` in DB.
  - `releaseNumber`: Releases number with provider and updates status to `RELEASED` without deleting historical call records.
  - `resolvePublicPhone`: Dynamically returns virtual tracking number when active, falling back to real store phone.
  - `listVirtualNumbers`: Scoped number queries.
- [call-ingestion-service.ts](file:///e:/project/localBi/src/modules/telephony/call-ingestion-service.ts):
  - Inbound webhook handler with HMAC signature verification, SHA-256 payload deduplication, server-side tenant derivation via `withTelephonyLookupContext`, state machine transition resolution, call record upsert, call event logging, and automatic lead creation.
- [call-dashboard-service.ts](file:///e:/project/localBi/src/modules/telephony/call-dashboard-service.ts):
  - `getCallSummary`: High-level KPIs (Total Calls, Answer Rate %, Avg Talk Duration, Unique Callers, Top Call Pages, Traffic Sources).
  - `getStoreCallSummaries`: Store-by-store breakdown of calls, answer rates, and talk durations.
  - `listCalls`: Paginated call listings with role-based PII masking and recording URL protection.
  - `getCallFunnelComparison`: Intent click vs telephony call conversion analytics.
  - `exportCallsCsv`: CSV export with formula injection sanitization (`=`, `+`, `-`, `@`).

---

## 4. API Endpoints & UI Explorer

### 4.1 API Endpoints
- `POST /api/webhooks/telephony/[provider]`: Inbound webhook endpoint supporting JSON and URL-encoded payloads with HMAC verification.
- `GET /api/tenants/[tenantSlug]/telephony/numbers`: List tenant numbers or search available numbers.
- `POST /api/tenants/[tenantSlug]/telephony/numbers`: Provision and assign number (`CALL_MANAGE_NUMBERS`).
- `DELETE /api/tenants/[tenantSlug]/telephony/numbers/[numberId]`: Release number (`CALL_MANAGE_NUMBERS`).
- `PATCH /api/tenants/[tenantSlug]/telephony/numbers/[numberId]/forwarding`: Update forwarding destination (`CALL_MANAGE_NUMBERS`).
- `GET /api/tenants/[tenantSlug]/telephony/calls`: Paginated call logs with role-based PII masking (`CALL_VIEW`).
- `GET /api/tenants/[tenantSlug]/telephony/dashboard`: Overview summary, store summaries, and funnel metrics (`CALL_VIEW`).
- `GET /api/tenants/[tenantSlug]/telephony/export`: Stream CSV export (`CALL_EXPORT`).

### 4.2 UI & Navigation
- Added `Call Tracking & Numbers` nav item with `PhoneCall` icon to [sidebar-nav-config.ts](file:///e:/project/localBi/src/components/layout/sidebar-nav-config.ts).
- Created [call-tracking-explorer.tsx](file:///e:/project/localBi/src/features/telephony/components/call-tracking-explorer.tsx) with Overview KPIs, Click-to-Call Reality Funnel, Live Call Logs with PII masking, Store Virtual Numbers & Forwarding, and Store-by-Store Attribution breakdown.
- Created server page [page.tsx](file:///e:/project/localBi/src/app/client/[tenantSlug]/telephony/page.tsx).

---

## 5. Verification & Test Results

### 5.1 Vitest Suite (`tests/phase9-telephony-attribution.test.ts`)
15/15 tests passing:
- `TEST 1`: Inbound answered call lifecycle & lead integration.
- `TEST 2`: Missed call tracking factually with zero talk duration.
- `TEST 3`: Duplicate webhook payload idempotency.
- `TEST 4`: Out-of-order lifecycle handling (COMPLETED before ANSWERED).
- `TEST 5`: Rejection of fraudulent/tampered webhook signatures (401).
- `TEST 6`: Cross-tenant webhook tampering prevention (untrusted payload tenantId).
- `TEST 7`: Rejection of unrecognized tracking numbers (404).
- `TEST 8`: Safe virtual number release preserving historical call records.
- `TEST 9`: Store destination phone update & telephony provider forwarding sync.
- `TEST 10`: Forwarding failure fail-closed behavior.
- `TEST 11`: Browser CALL_CLICK separation from real provider calls.
- `TEST 12`: Direct telephony call tracking without browser click event.
- `TEST 13`: Role-based caller PII masking and recording URL security.
- `TEST 14`: Multi-tenant Dual-Role PostgreSQL 16 RLS isolation.
- `TEST 15`: Cross-brand isolation within the same tenant.

### 5.2 Regression Verification
- Phase 5 Lead Attribution: **13/13 passed**
- Phase 6 GBP Operations: **24/24 passed**
- Phase 7 Hyper Rank Engine: **14/14 passed**
- Phase 8 Google Merchant Center: **22/22 passed**
- Cumulative Test Suite: **88/88 passed**

### 5.3 Typecheck & Production Build
- TypeScript (`tsc --noEmit`): **0 errors**
- Next.js 16.3.4 (Turbopack) Production Build: **Successfully generated all 18 static/dynamic routes**

---

## 6. Status & Sign-off

Phase 9 is **COMPLETE**. All negative boundaries respected (no AI transcription, no AI lead qualification, no outbound dialer, no IVR builder). Ready to advance to Phase 10.
