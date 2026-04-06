# Auth — Security & Data Integrity Review

## Status: APPROVED WITH NOTES

---

## Blockers (must fix before implementation)

### BLOCKER-1: `timingSafeEqual` does not exist on `crypto.subtle`

**Spec section**: EC-12, Implementation Notes ("verify against the Workers API docs")

The spec instructs implementers to use `crypto.subtle.timingSafeEqual` for constant-time HMAC comparison. This method does NOT exist on the Web Crypto `SubtleCrypto` interface. `timingSafeEqual` is a Node.js `crypto` module method — unavailable in the Cloudflare Workers V8 isolate.

The correct constant-time approach in the Workers runtime is to use the HMAC `verify` operation natively:

```ts
const isValid = await crypto.subtle.verify(
  { name: "HMAC", hash: "SHA-256" },
  key,           // CryptoKey imported from API_KEY_SALT
  expectedBytes, // computed HMAC as ArrayBuffer
  receivedBytes  // received HMAC decoded to ArrayBuffer
);
```

`crypto.subtle.verify` with HMAC is guaranteed constant-time by the Web Crypto spec. The spec's Implementation Notes acknowledge this fallback but make `timingSafeEqual` the primary recommendation — this must be corrected to avoid an implementer reaching for a non-existent API, falling back to string equality (`===`), and silently introducing a timing oracle.

**Fix required**: Remove `crypto.subtle.timingSafeEqual` from the spec entirely. Make `crypto.subtle.verify` (HMAC verify operation) the sole specified approach.

---

### BLOCKER-2: HMAC key material: string vs. raw bytes

**Spec section**: BR-5, NFR-2

The spec says to compute `HMAC-SHA256(API_KEY_SALT, userId + computerName + gitUserId)` but does not specify how `API_KEY_SALT` is imported as a `CryptoKey`. If the implementer calls `TextEncoder().encode(saltString)` as the raw key material, an `API_KEY_SALT` of fewer than 32 bytes (e.g., a short human-readable value) would produce a cryptographically weak HMAC key. More critically, the spec does not define the minimum entropy or format of `API_KEY_SALT` (e.g., must it be hex-encoded, base64, or arbitrary string?).

This becomes a blocker because:
1. If `API_KEY_SALT` is a short low-entropy string, the HMAC binding provides negligible security.
2. The format ambiguity means a deployment could set it to a short placeholder (e.g., `"salt"` instead of a 32-byte random value), which would pass the `!API_KEY_SALT` check (NFR-2 / EC-9) while being essentially worthless.

**Fix required**: The spec must define a minimum requirement for `API_KEY_SALT` (e.g., "must be at least 32 bytes of entropy; recommend generating with `openssl rand -hex 32`") and specify how it is imported as a `CryptoKey` (`algorithm: { name: "HMAC", hash: "SHA-256" }`, `extractable: false`, `keyUsages: ["sign", "verify"]`).

---

## Concerns (should address)

### CONCERN-1: Session token is a `crypto.randomUUID()` — only 122 bits of entropy

**Spec section**: FR-2, NFR-6

The spec specifies the session ID as a UUID (implied by EC-10 referencing wrong-length/not-a-UUID tampered cookies). `crypto.randomUUID()` produces a UUID v4 with 122 bits of randomness — this is acceptable, but the spec never explicitly states what format the session token takes or how it is generated. The Implementation Notes say "insert row into `sessions` (id=crypto.randomUUID())" in the project profile, which is fine, but the spec itself does not mention it.

An implementer could use a non-random ID (e.g., a counter or timestamp-based UUID) without contradicting the spec. The spec should explicitly state: "Session ID must be generated with `crypto.randomUUID()`."

**Impact**: Low for this project (single developer implementing), but worth a one-line clarification in NFR-6 or BR-2 (session creation).

---

### CONCERN-2: `installs.hmac` stored in plaintext — HMAC replay risk

**Spec section**: FR-5, Data Model

The schema stores `installs.hmac` (the HMAC submitted at registration). This is necessary for future re-verification, but it means a database read exposes the HMAC value. If an attacker reads the `installs` table (e.g., via a SQL injection in a future route), they could replay the HMAC to register additional installs from the same machine identity.

The more important concern: the spec's threat model for the HMAC check (BR-5) is "binds the API key to a specific machine identity." However, once the HMAC is verified and the install row is created, storing the original HMAC provides no ongoing security benefit — it cannot be used to re-verify future requests (the API key bearer token serves that function).

This is not a blocker because: (a) there is no HMAC-authenticated endpoint beyond registration, and (b) the stored HMAC is the same value the client submitted, so it is already known to the attacker if they sent it. The concern is that storing it suggests future re-use that could create a misuse surface.

**Recommendation**: Add a note in the spec that `installs.hmac` is stored for audit/traceability only and must never be used as a re-authentication mechanism in future routes.

---

### CONCERN-3: No input length limits beyond password (DoS via computerName / gitUserId / orgName)

**Spec section**: NFR-3 covers password; no equivalent for other string fields

NFR-3 correctly limits password length to 1000 characters. However, the spec imposes no length limits on `computerName`, `gitUserId`, `orgName`, or `email`. A malicious CLI call to `POST /api/v1/installs` could submit a 1 MB `computerName` that is stored in D1 and later rendered in the dashboard.

On D1 free tier (5 GB storage), this is a storage-exhaustion vector. Each CLI registration event is usually a one-time operation, but there is no re-registration protection before the HMAC check passes (BR-5), so an attacker with a valid `API_KEY_SALT` (or a weak salt per BLOCKER-2) could flood registrations with large payloads.

**Recommendation**: Add explicit max-length validations: `email` ≤ 254 chars (RFC 5321), `orgName` ≤ 255 chars, `computerName` ≤ 255 chars, `gitUserId` ≤ 255 chars. Reject with 400 before any D1 write.

---

### CONCERN-4: `POST /api/v1/installs` — orgId validation before HMAC check creates an information oracle

**Spec section**: BR-6, Error Handling table

The error handling table lists:
- 400 for missing fields
- 400 for invalid UUID format
- 500 for missing `API_KEY_SALT`
- 403 for HMAC mismatch
- 404 for org not found
- 409 for duplicate userId

The spec does not define the order of these checks. If `orgId` existence is checked before HMAC verification, an unauthenticated caller can enumerate valid `orgId` values by observing the difference between a 404 (org not found) and a 403 (HMAC mismatch). This leaks org existence.

**Recommended order**: (1) validate required fields, (2) validate UUID format, (3) check `API_KEY_SALT`, (4) verify HMAC, (5) check org exists, (6) check duplicate userId. Org existence must be checked only after HMAC verification passes.

---

### CONCERN-5: Session cleanup query runs after session insert — window for table bloat

**Spec section**: BR-3

BR-3 says "after session creation, run `DELETE FROM sessions WHERE expires_at < now AND user_id = ?`". The order matters: if the cleanup runs first and an error occurs, the session is created but no cleanup happened. More importantly, if the cleanup query runs and then the session insert fails, the user is left with expired sessions deleted but no new session — they get a 500 with no session set. This is the opposite problem from what the spec is trying to prevent.

The spec correctly says cleanup is fire-and-forget and should not fail login, but it does not specify that cleanup must run after the session insert completes successfully. The implementation order should be: (1) insert new session, (2) set cookie, (3) fire-and-forget cleanup. The spec should make this ordering explicit.

**Impact**: Minor — the main risk is a confusing code ordering choice, not a security issue.

---

### CONCERN-6: `(dashboard)/layout.tsx` — D1 query on every page render (no cache)

**Spec section**: FR-9, BR-10

BR-10 correctly requires a D1 lookup to validate session existence (not cookie-only). This is correct for security. However, in a Server Component layout, this query runs on every navigation within the dashboard route group. In Next.js 16 App Router, layouts re-render on navigation.

This is noted as acceptable given the project's scale (handful of CTOs), but the spec should acknowledge this cost so the implementer doesn't add `use cache` to the layout (which NFR-10 / Structural Notes already warn against), or use `React.cache()` within a single request. This is a performance note more than a security concern, but it is worth calling out to prevent a future "optimization" that breaks revocation.

**Recommendation**: Add a note in BR-10 or the Implementation Notes: "Do not cache the session lookup. `React.cache()` is acceptable within a single request, but no cross-request caching."

---

### CONCERN-7: FK constraints not enforced at the D1 level

**Spec section**: Data Model, BR-1, BR-6

The Drizzle schema does not declare `REFERENCES` constraints. D1 (SQLite) supports FK enforcement with `PRAGMA foreign_keys = ON`, but Drizzle ORM for D1 does not enable this pragma by default, and Cloudflare D1 does not guarantee FK enforcement is on for the connection.

This means:
- `installs.orgId` → `orgs.id`: if `orgs` row is deleted (currently impossible since there is no delete org route, but future risk), orphaned install rows would exist silently.
- `sessions.userId` → `users.id`: a deleted user leaves a dangling session that `requireCtoSession` would look up, find no org association, and behave undefined unless the join is explicit.
- `events.installId` → `installs.id`: orphaned events if installs are ever deleted.

The spec relies on application-level checks (BR-6 checks org existence manually). This is correct for `POST /api/v1/installs`, but there is no spec coverage for the `sessions.userId` FK — if a user row were ever deleted (no route exists today), the session lookup would return a session row with a `userId` that no longer exists, and `requireCtoSession` must handle that join returning null.

**Recommendation**: Add explicit `.references(() => orgs.id)` and `.references(() => users.id)` on the FK columns in the schema so the migration SQL includes FK declarations (even if D1 doesn't enforce them at runtime, they document intent). More importantly, ensure `requireCtoSession` joins `sessions` to `users` and handles null user gracefully.

---

### CONCERN-8: `__Host-` cookie prefix — `SameSite=Lax` vs. subdomain considerations

**Spec section**: NFR-6

The `__Host-` prefix is specified correctly (Secure + Path=/ + no Domain). `SameSite=Lax` is the right default. One subtlety: `SameSite=Lax` permits cookie sending on top-level cross-site navigations (e.g., following a link from an external site). For a dashboard with only `GET` read routes protected, this is fine. There are no `GET` routes that mutate state in this spec, so CSRF is not a practical concern here. Logging this as validated.

---

## Key Decisions Validated

- **PBKDF2 format `<base64salt>:<base64key>` with per-hash random 32-byte salt** (NFR-1): Correct. The self-describing format with a fresh salt per hash is the right approach and enables future algorithm migration.

- **100,000 PBKDF2 iterations** (project profile, `lib/auth/password.ts`): Reasonable for the Cloudflare Workers isolate. Not specified explicitly in the spec body (only in the project profile comment) — the spec should canonicalize this number in NFR-1 or Implementation Notes so it is not left to the implementer's discretion.

- **API key as 32-byte random hex, stored plaintext** (BR-8): Correct for the threat model. The key is already unguessable (256 bits of entropy); hashing it before storage adds bcrypt/PBKDF2 latency on every CLI request with no security gain, since the value in `installs.apiKey` is not a secret derivable from a human-memorable input.

- **Opaque session token in D1 (not JWT)** (project profile §4a, spec implicitly): Correct. Full revocation on logout (BR-10) requires a server-side store. JWT would require a blocklist to achieve the same.

- **Session TTL 7 days** (NFR-7): Appropriate for a low-traffic internal dashboard.

- **`API_KEY_SALT` check at request time not module load** (NFR-2): Correct given the Cloudflare Workers constraint that module-level initialization cannot access `getCloudflareContext()`.

- **Password max 1000 chars before hashing** (NFR-3): Correct. PBKDF2 at 100K iterations on unbounded input is a real DoS vector in a V8 isolate.

- **Email lowercased on every write and lookup** (NFR-4): Correct. Consistent normalization prevents phantom duplicate accounts.

- **Unified 401 error message for "email not found" and "wrong password"** (Error Handling table): Correct. Separate messages would leak whether the email is registered.

- **`__Host-session` cookie name** (NFR-6): Correct. The `__Host-` prefix provides browser-enforced security properties (no Domain, Secure, Path=/).

- **D1 transaction for org + user creation** (BR-1): Correct. Prevents orphan users without orgs or orphan orgs without CTOs.

- **UUID v4 validation on `installs.id`** (NFR-8): Correct structural guard against injection.

- **Fire-and-forget `lastSeenAt` update** (BR-9): Correct. Telemetry writes must not fail authenticated requests.

---

## Summary

Two blockers require spec corrections before implementation begins:

1. Replace `crypto.subtle.timingSafeEqual` (non-existent) with `crypto.subtle.verify` (HMAC verify) as the canonical constant-time comparison mechanism.
2. Define `API_KEY_SALT` minimum entropy and import format to prevent a weak-key deployment that passes the empty-string check but provides negligible HMAC security.

The remaining concerns are either low-severity ordering/documentation gaps (CONCERN-3 through CONCERN-6) or structural notes for the implementer (CONCERN-7, CONCERN-8). The core security architecture — opaque session tokens, PBKDF2 with per-hash salt, HMAC machine binding, constant-time comparison intent, full revocation on logout, email normalization — is sound.
