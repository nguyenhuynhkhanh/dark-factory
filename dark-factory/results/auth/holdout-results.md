# Auth — Holdout Validation Results

## Date: 2026-04-06T00:00:00Z

## Validation Method
Code review (static analysis) — no automated test framework configured at MVP.

## Summary
- Total: 21 scenarios
- Passed: 19
- Failed: 2

---

## Results

### H-01: Signup transaction rollback — PASS
The signup route wraps both the `orgs` and `users` inserts inside a single `db.transaction()` call. If the `users` insert fails (e.g., duplicate email constraint), the transaction rolls back the `orgs` insert as well. No orphan org rows can be produced.

### H-02: Duplicate email signup returns 409 — PASS
The transaction catch block explicitly checks for `"UNIQUE constraint failed"`, `"unique constraint"`, and `"SQLITE_CONSTRAINT"` in the error message and returns 409 with `{ "error": "email already registered" }`.

### H-03: Login cleanup is fire-and-forget — PASS
After the session insert succeeds, the expired-session DELETE is initiated with `void db.delete(...)` and chained with `.catch()` that only logs server-side. The login response is returned regardless of whether the cleanup completes or fails.

### H-04: Login with unknown email returns 401 — PASS (functional; timing caveat noted)
The login route returns `{ "error": "invalid credentials" }` with status 401 when no user matches the normalised email. The error message is identical to the wrong-password response, satisfying the user-enumeration prevention requirement. Note: the code returns immediately without running a dummy password hash when the user is not found, which could create a measurable timing difference; the spec marks timing mitigation as "best-effort."

### H-05: Double logout is idempotent — PASS
The logout route issues `db.delete(sessions).where(eq(sessions.id, token))` without checking rows-affected. D1 DELETE on a non-existent row succeeds silently, and the route always returns 200 with the cookie cleared regardless.

### H-06: Logout with no cookie returns 200 — PASS
The logout handler reads `request.cookies.get(COOKIE_NAME)?.value`. When the cookie is absent, `token` is `undefined`, the `if (token)` branch is skipped entirely, and the route returns 200 with `{ ok: true }` plus the cleared cookie header.

### H-07: Expired session returns 401 — PASS
`requireCtoSession` queries with `and(eq(sessions.id, token), gt(sessions.expiresAt, now))`. A session row with `expiresAt` in the past does not satisfy the `gt` predicate; the query returns `undefined` and the helper returns 401.

### H-08: Install HMAC with correct field order — FAIL
The installs route constructs the HMAC message as `${id}|${computerName}|${gitUserId}` (pipe-delimited). The spec (BR-5) and scenario H-08 define the canonical message as `userId + computerName + gitUserId` — plain concatenation with no separator. A client computing `HMAC-SHA256(salt, userId + computerName + gitUserId)` will produce a value the server rejects, because the server verifies against a pipe-delimited string. The field order is correct but the delimiter is wrong.

### H-09: Duplicate userId returns 409 — PASS
The INSERT catch block detects `"UNIQUE constraint failed"` or `"SQLITE_CONSTRAINT"` on the `installs` table and returns 409 with `{ "error": "already registered" }`. The existing API key is not included in the response.

### H-10: HMAC comparison is constant-time — PASS
The route uses `crypto.subtle.verify({ name: "HMAC" }, hmacKey, providedHmacBuffer, encoder.encode(message))` which is natively constant-time in the Web Crypto API. No string `===` comparison is performed on the HMAC values.

### H-11: API_KEY_SALT empty string returns 500 — PASS
Both the installs route and `requireApiKey` check `if (salt.length < MIN_SALT_LENGTH)` (where `MIN_SALT_LENGTH = 16`). An empty string has length 0, which is less than 16, so both return 500 with `{ "error": "server misconfiguration" }`. An empty string is treated equivalently to a missing salt.

### H-12: Revoked session returns 401 — PASS
`requireCtoSession` looks up the session by ID with an `expiresAt > now` guard. When the row has been deleted (logout from another tab), the query returns `undefined`, and the helper returns 401. No exception is thrown.

### H-13: lastSeenAt failure does not abort request — PASS
The `lastSeenAt` update in `requireApiKey` is wrapped in `try { await db.update(...) } catch { /* intentionally swallowed */ }`. A D1 write failure on that update does not propagate and does not affect the response returned to the caller.

### H-14: Dashboard gate redirects on expired session — PASS
`(dashboard)/layout.tsx` calls `requireCtoSession()`, which queries D1 with the `expiresAt > now` predicate (not just cookie presence). When the session is expired, `requireCtoSession` returns `{ ok: false }` and the layout calls `redirect("/login")`.

### H-15: All four required indexes present in migration — PASS
`db/migrations/0000_strange_black_bird.sql` contains:
- `CREATE INDEX events_org_id_idx ON events (org_id);`
- `CREATE INDEX events_org_id_created_at_idx ON events (org_id, created_at);`
- `CREATE INDEX events_install_id_idx ON events (install_id);`
- `CREATE INDEX installs_org_id_idx ON installs (org_id);`

All four required indexes are present.

### H-16: PBKDF2 hash format is self-describing — PASS
`hashPassword` generates a 32-byte random salt via `crypto.getRandomValues`, derives a 32-byte key via PBKDF2-SHA256, base64-encodes both, and returns `${saltB64}:${keyB64}`. The format is `<base64salt>:<base64key>` as required. `verifyPassword` decodes both segments and performs constant-time comparison.

### H-17: Password of 1001 characters returns 400 — PASS
Both the signup and login routes check `if (password.length > 1000)` and return 400 with `{ "error": "password too long" }` before any hashing or D1 operation. A 1000-character password passes the check; a 1001-character password is rejected.

### H-18: Email case-insensitivity — PASS
The signup route applies `email.toLowerCase().trim()` before storing the email in D1. The login route applies the same normalisation before the D1 lookup. Signup with an uppercase email stores a lowercase value, and subsequent logins with any case variation succeed.

### H-19: Concurrent signup race — PASS
The D1 `users.email` column has a `UNIQUE` constraint (visible in the schema and migration). The signup handler wraps inserts in a transaction. Under concurrent requests, D1 serialises writes; exactly one transaction commits (201) and the other fails with a unique constraint violation mapped to 409. The losing transaction rolls back both the `orgs` and `users` inserts.

### H-20: Tampered session cookie returns 401 — PASS
`requireCtoSession` passes the cookie value as a Drizzle ORM parameter (parameterised query). Malformed values, injection attempts, or very long strings will simply produce an empty result set, returning 401. No raw SQL interpolation occurs.

### H-21: Signup with empty or whitespace-only orgName returns 400 — PASS
The signup route trims the org name (`orgName.trim()`) and checks `if (!trimmedOrgName ...)`. An empty string or whitespace-only string becomes an empty string after trim, which is falsy, returning 400 with `{ "error": "missing required fields" }`.
