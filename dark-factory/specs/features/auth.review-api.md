# Auth — API Design & Backward Compatibility Review

## Status: APPROVED WITH NOTES

---

## Blockers (must fix before implementation)

### 1. Route namespace divergence between spec and project-profile

The spec routes all live under `/api/v1/` (e.g., `POST /api/v1/auth/signup`). The project-profile (section 5) lists them under `/api/` with no version segment (e.g., `POST /api/auth/signup`, `POST /api/installs`). The downstream specs (event-ingestion, dashboard-core) reference `/api/v1/` paths consistently. The implementation file tree in the spec also uses `app/api/v1/auth/...` paths.

This is a conflict between the project-profile and the spec. Since this is a greenfield deployment (no existing routes) there is no backward-compatibility risk, but the discrepancy will cause confusion during implementation and for the project-profile readers. The spec must clarify which namespace is authoritative — the spec's own routes table (`/api/v1/`) is internally consistent and consistent with downstream specs, so the spec is likely correct. The project-profile section 5 (route map) and file structure (section 6) must be updated to reflect `/api/v1/` prefixes. This is a documentation blocker — if left unresolved, an implementer reading the project-profile will build to the wrong paths.

**Resolution**: Update the project-profile's section 5 route map and section 6 file structure to use `app/api/v1/` consistently. The spec itself needs no change.

---

## Concerns (should address)

### 2. HMAC field concatenation order is underspecified

BR-5 specifies: `HMAC-SHA256(API_KEY_SALT, userId + computerName + gitUserId)`. The `+` operator is used without a separator. If any of these fields contain variable-length strings (which they do — `computerName` is free-text), the concatenation `"abcde" + "fg"` is identical to `"abc" + "defg"`. A separator (e.g., `":"`) is needed to make the construction canonical and prevent accidental collisions.

The CLI is the source of truth for how this HMAC is computed. The spec must state explicitly:
- The exact byte-level construction (e.g., `userId + ":" + computerName + ":" + gitUserId` encoded as UTF-8)
- Or confirm the CLI joins without a separator and the server must replicate that exactly

If the CLI already has a defined format and this spec is mismatched to it, the HMAC will never verify.

### 3. `POST /api/v1/auth/signup` response body not fully specified

FR-1 and AC-1 state the response includes `{ inviteLink }`. But the spec does not document:
- What the HTTP status code is on success (201 is referenced in AC-1, but it should be in the endpoint table)
- Whether the response also includes the user `id` or session (it does not set a cookie on signup — the user must then log in separately)
- Whether `inviteLink` is the only field in the response body

The endpoint table column "Description" is the only documentation. Downstream UI code (`app/(auth)/signup/page.tsx`) needs a precise contract for what to render after the fetch. Minimally, document: `201 { inviteLink: string }`.

### 4. `POST /api/v1/auth/login` response body not specified

The endpoint table says "set session cookie" but the response body on success is not documented anywhere. The project-profile (section 4a) says `{ ok: true }` but the spec's error handling table and acceptance criteria only reference the cookie. The implementation will need a canonical answer: `200 { ok: true }` or `200 {}` or just `200` with no body. The UI login page needs to know what to check.

### 5. `POST /api/v1/auth/logout` response body not specified

Same issue: 200 is stated in the endpoint table and BR-4, but the response body is not documented. `200 { ok: true }` vs `200 {}` vs `204` are all different contracts. Downstream logout handlers need to know.

### 6. `__Host-` cookie prefix: `Domain` attribute omission not explicit enough

NFR-6 states the cookie name is `__Host-session` with `HttpOnly; Secure; SameSite=Lax; Path=/`. The implementation note correctly says "do not set `domain`". However, the spec does not state this as a requirement — it is buried in a comment. The `__Host-` prefix is enforced by the browser to reject cookies that have a `Domain` attribute. This constraint should be elevated to NFR-6 itself as a stated requirement, not just an implementation note, so an implementer reading only the requirements section cannot accidentally add a `Domain` attribute.

Add to NFR-6: "The `Domain` attribute MUST NOT be set."

### 7. Session token format is not specified

The spec states sessions are opaque tokens but does not specify the format of `sessions.id`. The project-profile suggests `crypto.randomUUID()` (a UUID v4). The implementation note and schema show `id: text("id").primaryKey()`. Downstream code that reads the `__Host-session` cookie (e.g., EC-10 describes "not a UUID" as a tampered cookie case) assumes UUID format. The spec should state explicitly: "The session token is a UUID v4 generated via `crypto.randomUUID()`."

### 8. `GET /api/v1/auth/me` response shape: `id` field naming ambiguity

FR-4 and AC-4 state the response is `{ id, email, role, orgId }`. In the schema, `users.id` is the user's UUID. Dashboard-core's `requireCtoSession` returns `{ userId, orgId }`. The `me` endpoint response uses `id` (not `userId`) — this is fine, but the spec should confirm whether `id` refers to `users.id`. Given dashboard-core's FR-9 expects `recentEvents[].installId` joined from `installs`, there is no conflict, but the field name choice (`id` vs `userId`) should be stated explicitly to avoid an implementer guessing.

### 9. Invite link URL format: host is not specified

FR-1 states the invite link is `https://<host>/join?org=<orgId>`. In a Cloudflare Pages deployment, the host could be the custom domain, the `*.pages.dev` subdomain, or localhost in dev. The spec does not say how the handler determines `<host>`. Options are:
- Read the `Host` or `X-Forwarded-Host` header from the incoming request
- Use a hardcoded `APP_URL` environment variable

Neither is specified. An implementer will make a choice here that may not match expectations. Recommend specifying: "The invite link host MUST be derived from the `request.headers.get('host')` value (which Cloudflare populates correctly in production)." Or if an env var approach is preferred, add `APP_URL` to the env/bindings section.

### 10. `POST /api/v1/installs` success status code inconsistency

The endpoint table has no status code column. AC-7 states a successful registration returns 201. FR-5 does not specify a status code. The error table documents only error cases. 201 is the right choice and it is confirmed in AC-7, but it should be in the endpoint table or in FR-5 itself so it is unambiguous without reading acceptance criteria.

### 11. `requireApiKey` — 401 vs 403 for invalid/missing Bearer token

The spec specifies `requireApiKey` returns the caller's `{ installId, orgId }` or responds 401. However, `POST /api/v1/installs` itself uses HMAC (not a Bearer token) and is not protected by `requireApiKey`. The auth table in the spec lists `POST /api/v1/installs` as "None (HMAC-protected)". This is clear for that route. However, downstream routes protected by `requireApiKey` (e.g., `POST /api/v1/events`) should expect 401 for a missing/invalid API key. The spec should clarify the specific error body: is it `{ error: "unauthorized" }` (matching the `me` endpoint) or `{ error: "invalid api key" }`? This matters for CLI error messaging. The spec says "responds 401" but does not give the body.

---

## Key Decisions Validated

- **`/api/v1/` versioning prefix**: Correct and consistent across all downstream specs (event-ingestion, dashboard-core). Good forward-compatibility decision.
- **`{ error: string }` error shape universally**: Consistently applied across all documented error cases. NFR-5 is well-stated and the error table is thorough.
- **HTTP status codes are correct**: 400 for validation, 401 for auth failures, 403 for HMAC mismatch, 404 for missing org, 409 for duplicates, 500 for server errors. All are semantically correct.
- **`__Host-session` cookie name**: Correct choice. The `__Host-` prefix is a browser-enforced security constraint that prevents subdomain cookie hijacking. Attributes `HttpOnly; Secure; SameSite=Lax; Path=/` are correct for this use case.
- **Session TTL of 7 days**: Reasonable for a low-traffic internal dashboard. The cleanup-on-login approach (BR-3) is appropriate for D1 free tier scale.
- **`GET /api/v1/auth/me` response `{ id, email, role, orgId }`**: Sufficient for dashboard hydration. Dashboard-core's `requireCtoSession` resolves `orgId` independently, so this endpoint is purely informational for the UI.
- **`POST /api/v1/installs` returning only `{ apiKey }`**: Correct minimal contract. The CLI only needs the key; no session or org data needs to be returned.
- **Stale directories `app/api/v1/orgs/` and `app/api/v1/register/` deletion**: Correctly noted. These do not exist yet in the scaffold, so no backward-compat concern — the note is for post-implementation hygiene.
- **No `GET /api/v1/installs`**: Correct deferral. Dashboard reads installs via Server Component directly, avoiding an unnecessary API surface.
- **`requireApiKey` updating `lastSeenAt` as best-effort side-effect**: Correct approach. The side-effect is documented and fire-and-forget so it cannot block the caller.
- **NFR-2 (API_KEY_SALT check at request time)**: Correct for the Cloudflare Workers constraint. Module-level evaluation would throw outside a request context.
- **Existing route conflicts**: None. The codebase has no `app/api/` directory yet — all routes are greenfield.
