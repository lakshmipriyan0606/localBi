# ADR-001: Native Opaque Database Session Service with Hashed Tokens

## Status
Accepted

## Context
Phase 2 requires an enterprise-grade authentication and session management architecture for `localBi` with the following non-negotiable security requirements:
1. Email and password authentication using RFC 9106 Argon2id with memory-hardness and concurrency limiting.
2. Stateful, server-revocable sessions stored in PostgreSQL.
3. Cryptographically random, opaque session tokens in browser cookies (no sensitive claims, roles, or tenant IDs in cookies).
4. Storage of only the SHA-256 cryptographic hash of the session token in the database (`sessionTokenHash`). Raw tokens must never be persisted.
5. Immediate server-side revocation on logout, account suspension, or password reset.
6. Support for sign-out current device and sign-out all devices.
7. Both absolute session expiration (e.g. 30 days) and configurable idle session expiration (e.g. 24 hours) with session rotation on security-sensitive operations.
8. Zero trust of client-submitted authorization claims. Every request re-evaluates user status, active tenant membership, and assigned brand/location scopes on the server.

### Evaluation of Auth.js / NextAuth
We evaluated using Auth.js (NextAuth.js v5):
- **Credentials Provider Limitation**: Official Auth.js documentation states: *"The Credentials provider cannot be used with database sessions. It only supports JWT sessions."*
- **Database Schema Mismatch**: The standard Prisma adapter for Auth.js expects a table with a plaintext `sessionToken` column. Storing plaintext tokens in PostgreSQL violates the core security requirement that the database contains only token hashes so that a read-only database leak does not grant immediate session impersonation.
- **Complexity and Brittleness**: Circumventing Auth.js's restrictions requires patching internal callbacks, overriding private adapter methods, or mixing JWT and database hooks. This creates brittle dependencies on undocumented internals that break across minor framework releases.

## Decision
We will implement a native, lightweight, zero-external-dependency **Opaque Session Service** (`src/modules/auth/session-service.ts`) designed around our existing `user_sessions` PostgreSQL schema.

### Architecture Specification
1. **Token Generation**:
   - Generated using Node.js cryptographically secure pseudorandom number generator (`crypto.randomBytes(32)`), formatted as a 43-character URL-safe base64url string (256 bits of entropy).
2. **Token Hashing**:
   - `sessionTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')`.
   - Only this 64-character hexadecimal digest is stored in `user_sessions.session_token_hash`.
3. **Cookie Storage**:
   - The raw token is stored in an `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Secure` (in production) cookie (`__Host-localbi_session` in production, `localbi_session` in development).
   - No user ID, tenant ID, or permission scopes are included in the cookie.
4. **Session Resolution & Expiry**:
   - When a request arrives, the cookie token is hashed and queried against `user_sessions`.
   - The service asserts:
     - `session.revokedAt === null`
     - `session.expiresAt > new Date()` (absolute timeout)
     - `Date.now() - session.lastActiveAt.getTime() < IDLE_TIMEOUT_MS` (idle timeout)
     - `session.user.status === 'ACTIVE'`
   - If `lastActiveAt` is older than a configurable refresh window (e.g. 15 minutes), it is refreshed to extend idle validity.
5. **Immediate Revocation**:
   - Single device sign-out: Sets `revokedAt = now()` or deletes the session record.
   - All-device sign-out: `UPDATE user_sessions SET revoked_at = now() WHERE user_id = $userId`.
   - Password reset: Automatically triggers all-device session revocation inside the password reset transaction.
6. **Row-Level Security (RLS)**:
   - In PostgreSQL, `user_sessions` allows `SELECT` by `session_token_hash`. Because the hash is of a 256-bit high-entropy secret, unauthenticated enumeration is computationally impossible.
   - All mutations (`INSERT`, `UPDATE`, `DELETE`) on `user_sessions` require explicit `app.current_user_id` context.

## Consequences
### Positive
- Strict adherence to least-privilege credential security (raw tokens never touch the database).
- True database-backed, instant session revocation without waiting for JWT expiration.
- Zero external authentication package vulnerabilities or version churn.
- Clean integration with existing Phase 1 error handling (`AppError`), logging (Pino with redaction), and tenant context.

### Tradeoffs
- Requires maintaining our own session lifecycle logic, cookie handlers, and unit/integration tests (addressed by thorough automated test suites).
