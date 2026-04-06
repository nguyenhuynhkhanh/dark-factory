# Auth — Architecture & Performance Review

## Status: APPROVED WITH NOTES

---

## Blockers (must fix before implementation)

**None.**

---

## Concerns (should address)

### 1. PBKDF2 at 100,000 iterations vs. Cloudflare Workers CPU wall

The spec (NFR-3, Implementation Notes) specifies PBKDF2-SHA256 with 100,000 iterations. Cloudflare Workers free tier enforces a 10 ms CPU wall per request. PBKDF2 at 100 K iterations over a ~64-byte input runs 30–80 ms of CPU time in V8. This will hit the wall clock limit and cause a 503/1101 on every login and signup request under the free tier.

The spec acknowledges (project-profile §4c) that this is "fine at MVP scale" — but that statement was made in a context that likely did not account for the Workers CPU wall. The 10 ms wall is a hard runtime limit, not a soft guideline.

Mitigation options (pick one):
- Reduce to 10,000 iterations, which typically stays within 5–8 ms in V8. This is below OWASP's 2023 recommendation (210,000 for PBKDF2-SHA256) but acceptable for a handful of CTOs at MVP.
- Use PBKDF2-SHA1 at 10,000 iterations (less CPU per round); same tradeoff.
- Accept the limit risk and document a Cloudflare paid-tier upgrade path in the spec, noting that signups and logins will fail on the free tier if iteration count stays at 100 K.

The spec must make an explicit choice and document the chosen iteration count. At minimum it must acknowledge the CPU wall risk and the chosen mitigation.

### 2. Route path divergence between spec and project profile

The spec consistently uses `/api/v1/auth/…` and `/api/v1/installs` (e.g., FR-1 through FR-5, the API endpoint table, the Scope section, and the file structure section). The project profile §5 lists the same routes without the `/v1` prefix: `/api/auth/signup`, `/api/installs`, etc.

The file structure in §6 of the project profile also omits `/v1/` — `app/api/auth/`, `app/api/installs/`. The spec's Implementation Size Estimate calls for `app/api/v1/auth/signup/route.ts`.

This is an unresolved discrepancy. Future specs (event-ingestion.spec.md, dashboard-core.spec.md, etc.) reference routes — a mismatch now will require renaming route files later. The spec should align with the profile (no `/v1/`) or explicitly state that the spec overrides the profile for all future routes and that the profile will be updated.

### 3. `lib/` and `app/api/` directories do not yet exist

Both `lib/` and `app/api/` are absent from the repository. The spec's Track 0 creates them from scratch. This is not a blocker — it is correct to create them during implementation — but the implementation notes should confirm the implementer must `mkdir -p lib/auth/ app/api/v1/auth/` (or the non-`v1` variant once the path discrepancy in concern #2 is resolved). The spec currently says only "stale empty dirs `app/api/v1/orgs/` and `app/api/v1/register/` must be deleted," but those dirs do not exist in the repo either. The deletion note is pre-emptive (not an actual cleanup needed now) and should be clarified to say "do not create these directories."

### 4. `db/schema.ts` index syntax for Drizzle ORM 0.45

The spec (Data Model section) shows:

```ts
(t) => [
  index("events_org_id_idx").on(t.orgId),
  ...
]
```

In Drizzle ORM 0.45 the second argument to `sqliteTable` expects a function returning an object (record), not an array. The array-returning form was introduced in later Drizzle versions. With drizzle-orm@0.45.2 (the pinned version in package.json), the correct syntax is:

```ts
(t) => ({
  eventsOrgIdIdx: index("events_org_id_idx").on(t.orgId),
  eventsOrgIdCreatedAtIdx: index("events_org_id_created_at_idx").on(t.orgId, t.createdAt),
  eventsInstallIdIdx: index("events_install_id_idx").on(t.installId),
})
```

If the array form is used, `drizzle-kit generate` will silently produce a migration with no indexes. The spec must update the example to use the object form, or the implementer will produce a migration that appears to succeed but contains no `CREATE INDEX` statements.

(AC-15 verifies the indexes are in the migration SQL — this concern would cause that criterion to fail silently at implementation time.)

### 5. `(dashboard)/layout.tsx` makes a D1 query on every page navigation

BR-10 requires that the dashboard layout query D1 to confirm session existence, not just read the cookie. This is architecturally correct for revocation support. However, it means every navigation within the `(dashboard)` group fires a D1 read from a Server Component. At MVP scale (a handful of CTOs) this is fully acceptable. The concern to document: if the dashboard layout is ever wrapped in a Suspense boundary or used with partial prerendering, the D1 read must not be cached (Next.js 15+ does not cache dynamic reads by default — project-profile §10 confirms this). No action needed now, but the implementation note should explicitly call `{ cache: 'no-store' }` is not applicable here (Server Component D1 reads are already dynamic) and remind the implementer not to add `use cache` to the layout.

### 6. Session cleanup query on every login (BR-3) — unbounded at scale

BR-3 fires `DELETE FROM sessions WHERE expires_at < now AND user_id = ?` on every login. This is scoped to a single user (`user_id = ?`), so in the current model (one CTO per org, handful of total CTOs) the row count is negligible. The concern is that `sessions` has no index on `(user_id, expires_at)`. Without this index, the cleanup DELETE is a full table scan on the sessions table. At MVP size this doesn't matter. The spec should note that if multi-CTO or high-login-frequency scenarios arise, an index on `sessions(user_id)` or `sessions(user_id, expires_at)` should be added. This is a suggestion, not a blocker.

### 7. Parallel track feasibility — Track 1 and Track 2

The spec's Track 1 (web auth routes) and Track 2 (CLI install route) are stated to have zero file overlap after Track 0. This is correct: Track 1 touches `app/api/v1/auth/*/route.ts` + `app/(auth)/` + `app/(dashboard)/layout.tsx`; Track 2 touches `app/api/v1/installs/route.ts` only. Both import from `lib/auth/` and `lib/db.ts` (read-only after Track 0). The parallel track design is sound.

One subtle risk: Track 1 modifies `db/schema.ts` to add the comment fix ("CTO JWT sessions" → "CTO sessions"), and Track 2 may also read schema. If both tracks are implemented as separate git branches and merged independently, the comment change is a trivial merge. No concern.

### 8. `installs` table stores `hmac` column permanently

The spec notes `installs.hmac` stores the HMAC of `(userId + computerName + gitUserId)`. FR-5 verifies the HMAC at registration time. After that, the stored `hmac` column has no runtime use — it is not checked again by `requireApiKey` (which uses `apiKey`, not `hmac`). Storing it is fine as an audit trail, but the spec does not explicitly say whether `requireApiKey` should re-verify the HMAC on every CLI request (it should not — that would require `API_KEY_SALT` on every API call and adds latency). The spec correctly defers to `apiKey` lookup for CLI auth. This is confirmed as the right architecture — noting it here to validate the decision is intentional.

---

## Key Decisions Validated

- **`lib/db.ts` as single `getCloudflareContext()` call site** (FR-8, NFR-10, Implementation Notes): Correct. Centralises the binding access, prevents module-scope invocation, aligns with the OpenNext constraint documented in project-profile §10.

- **`getCloudflareContext()` inside handlers only** (NFR-10): Spec is explicit and correct. The existing `next.config.ts` correctly calls `initOpenNextCloudflareForDev()` at module scope (which is correct for that function) without prematurely calling `getCloudflareContext()`.

- **Drizzle D1 transaction for signup** (BR-1, Implementation Notes): `db.transaction(async (tx) => { ... })` is the correct pattern. D1 supports transactions via Drizzle. This prevents the orphan-org / orphan-user split-brain scenario.

- **Opaque session token in D1, not JWT** (project-profile §4a, BR-10): Correct for this scale. Revocation is instant (delete the row), no token rotation needed, D1 row count stays tiny.

- **UNIQUE constraint on `users.email` as duplicate guard** (BR-2): Correct. D1 enforces the constraint atomically; catching the constraint error and mapping to 409 is the right pattern and handles the concurrent-signup race (EC-7) without a SELECT-then-INSERT.

- **`__Host-` cookie prefix** (NFR-6): Correct. The prefix enforces `Secure; Path=/; no Domain` at the browser level without any application-side enforcement. Spec correctly prohibits setting `domain` in cookie options.

- **`params` as Promise** (project-profile §10): Noted in the profile and respected in the spec. No route handler in this spec uses dynamic segments (all auth routes are non-parameterised), so this constraint does not apply to any file in this spec. Validated as N/A for this feature.

- **Web Crypto only, no Node.js `crypto`** (NFR-9): Spec correctly uses `globalThis.crypto.subtle` throughout. The `wrangler.jsonc` includes `nodejs_compat` flag, but that compatibility layer does not expose Node.js's `crypto.pbkdf2` — Web Crypto is still required for PBKDF2. Spec is correct.

- **Fire-and-forget `lastSeenAt` update** (BR-9): `requireApiKey` wraps the update in try/catch and does not fail the request. Correct for a best-effort telemetry side-effect.

- **No stale empty directories to clean up**: Confirmed — `app/api/v1/orgs/` and `app/api/v1/register/` do not exist in the current repo. The spec's "removal note" should be rephrased as "do not create these directories."

- **`db/client.ts` → `lib/db.ts` layering**: `db/client.ts` takes `D1Database` as a parameter (dependency injection, testable). `lib/db.ts` is the thin caller that resolves the binding. This two-layer design is architecturally clean and matches project-profile §6.

- **Four indexes in FR-11**: `events(org_id)`, `events(org_id, created_at)`, `events(install_id)`, `installs(org_id)` — all justified by the dashboard query patterns described in the profile. The composite index on `(org_id, created_at)` correctly supports the date-range-filtered event feed.

