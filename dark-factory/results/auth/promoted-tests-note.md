# Auth — Promoted Tests Note

## Date: 2026-04-06

## Status: Deferred — No Test Framework at MVP

Per `dark-factory/project-profile.md` section 8 ("No tests required at MVP"), this project has no
configured test framework (no `jest.config.js`, no `vitest.config.ts`, no `__tests__/` directory).

Formal test promotion into an automated test suite is deferred until a test framework is added.

## Holdout Scenarios Preserved in Git

All 21 holdout scenario files are preserved at:

```
dark-factory/scenarios/holdout/auth/
```

When a test framework is added to this project, these scenarios should be converted to automated
regression tests. Each scenario file contains the precise behavior being guarded, the relevant
source locations, and the expected outcome.

## Validation Summary (2026-04-06)

Validation was performed by static code review. Results: **19 passed, 2 failed**.

- **H-08** failed: The installs route uses pipe-delimited HMAC message (`id|computerName|gitUserId`)
  but the spec (BR-5) requires plain concatenation (`userId + computerName + gitUserId`). This is
  a known defect to fix before the HMAC behavior is promoted as a passing regression test.
- All other 20 scenarios either passed or are noted with caveats below.

---

## Scenario Index

| ID | File | Validates | Status |
|----|------|-----------|--------|
| H-01 | `H-01-signup-transaction-rollback.md` | Signup wraps `orgs` + `users` inserts in a single D1 transaction; failure rolls back both — no orphan org rows | PASS |
| H-02 | `H-02-duplicate-email-signup.md` | Duplicate email on signup returns 409 with `{ "error": "email already registered" }` | PASS |
| H-03 | `H-03-login-cleanup-fire-and-forget.md` | Expired-session cleanup after login is fire-and-forget (`void db.delete(...).catch(...)`); login response is not blocked by cleanup | PASS |
| H-04 | `H-04-login-unknown-email.md` | Login with unknown email returns 401 `{ "error": "invalid credentials" }` — same message as wrong-password (prevents user enumeration); timing mitigation is best-effort only | PASS (timing caveat) |
| H-05 | `H-05-double-logout-idempotent.md` | Logging out twice is idempotent — second logout returns 200 even though the session row is already gone | PASS |
| H-06 | `H-06-logout-no-cookie.md` | Logout with no session cookie present returns 200 with cleared cookie header | PASS |
| H-07 | `H-07-expired-session-returns-401.md` | Expired session token returns 401; `requireCtoSession` queries with `expiresAt > now` predicate | PASS |
| H-08 | `H-08-install-hmac-correct-field-order.md` | Install HMAC is computed as plain concatenation `userId + computerName + gitUserId` with no separator (BR-5) | **FAIL** — server uses pipe delimiter instead; defect to fix |
| H-09 | `H-09-install-duplicate-userid.md` | Duplicate `userId` on install registration returns 409 `{ "error": "already registered" }`; existing API key is not disclosed | PASS |
| H-10 | `H-10-hmac-constant-time.md` | HMAC comparison uses `crypto.subtle.verify` (natively constant-time); no string `===` comparison on HMAC values | PASS |
| H-11 | `H-11-api-key-salt-empty-string.md` | Empty or too-short `API_KEY_SALT` returns 500 `{ "error": "server misconfiguration" }` from both the installs route and `requireApiKey` | PASS |
| H-12 | `H-12-revoked-session-returns-401.md` | Session row deleted by logout from another tab returns 401; no exception thrown | PASS |
| H-13 | `H-13-api-key-last-seen-failure.md` | D1 write failure on `lastSeenAt` update in `requireApiKey` is silently swallowed and does not abort the request | PASS |
| H-14 | `H-14-dashboard-gate-expired-session.md` | Dashboard layout redirects to `/login` when session is expired (not just missing); `requireCtoSession` enforces `expiresAt > now` | PASS |
| H-15 | `H-15-migration-indexes-present.md` | Migration `0000_strange_black_bird.sql` contains all four required indexes: `events_org_id_idx`, `events_org_id_created_at_idx`, `events_install_id_idx`, `installs_org_id_idx` | PASS |
| H-16 | `H-16-pbkdf2-hash-format.md` | `hashPassword` produces a self-describing `<base64salt>:<base64key>` format using PBKDF2-SHA256 via Web Crypto API; `verifyPassword` decodes both segments and performs constant-time comparison | PASS |
| H-17 | `H-17-password-too-long.md` | Password longer than 1000 characters returns 400 `{ "error": "password too long" }` before any hashing or D1 operation; applies to both signup and login routes | PASS |
| H-18 | `H-18-email-case-insensitive.md` | Emails are normalised with `toLowerCase().trim()` at signup and login; mixed-case logins succeed against a lowercase-stored email | PASS |
| H-19 | `H-19-concurrent-signup-race.md` | Concurrent signup for the same email: exactly one request commits (201), the other hits the `UNIQUE` constraint and returns 409; the losing transaction rolls back both `orgs` and `users` inserts | PASS |
| H-20 | `H-20-tampered-session-cookie.md` | Tampered or malformed session cookie returns 401; `requireCtoSession` uses parameterised Drizzle queries — no raw SQL interpolation | PASS |
| H-21 | `H-21-empty-org-name.md` | Signup with empty or whitespace-only `orgName` returns 400 `{ "error": "missing required fields" }` after `orgName.trim()` check | PASS |

---

## Known Defect: H-08 (HMAC Delimiter Mismatch)

**File to fix:** `app/api/installs/route.ts`

The server constructs the HMAC message as `${id}|${computerName}|${gitUserId}` (pipe-delimited).
The spec (BR-5) and the canonical client expectation is `userId + computerName + gitUserId`
(plain concatenation, no separator). A client following the spec will produce an HMAC the server
rejects.

This defect must be corrected and H-08 re-validated before promoting it as a passing regression test.

---

## Conversion Guidance (for when a test framework is added)

Recommended framework: **Vitest** (compatible with TypeScript, no Node.js native dependencies,
works well with Cloudflare Workers-style code via `@cloudflare/vitest-pool-workers`).

Priority order for first-pass automation:

1. `lib/auth/password.ts` — `hashPassword` / `verifyPassword` (H-16, H-17): pure functions, no D1 needed.
2. HMAC construction helper (H-08, H-10): pure crypto, no D1 needed — fix H-08 defect first.
3. `lib/auth/requireCtoSession.ts` and `lib/auth/requireApiKey.ts` (H-07, H-11, H-12, H-13): mock D1 client.
4. Route handlers (H-01 through H-06, H-09, H-17, H-18, H-19, H-20, H-21): use `fetch` against a local Wrangler dev instance or mock the route handler directly.
