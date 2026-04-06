# Auth — Synthesized Architect Review

> Domains reviewed: Security & Data Integrity · Architecture & Performance · API Design & Backward Compatibility
> Overall status: **APPROVED WITH NOTES**

---

## Key Decisions Made

1. **Use `crypto.subtle.verify` for HMAC comparison, NOT `crypto.subtle.timingSafeEqual`** — the latter does not exist on SubtleCrypto. `crypto.subtle.verify` is the only correct constant-time approach. (Flagged by: Security, API)

2. **Lower PBKDF2 iterations to ~10,000** — 100K iterations will exceed Cloudflare Workers free-tier 10ms CPU wall on every login/signup, causing 503s. 10K iterations runs in 5–8ms and is acceptable at MVP scale with a handful of CTOs. (Flagged by: Architecture)

3. **Drizzle 0.45 index syntax requires object-returning lambda**: `index('name').on(table.col)` at top level — NOT the deprecated `(t) => [...]` array form, which silently produces no `CREATE INDEX` statements. (Flagged by: Architecture)

4. **HMAC field concatenation must use a separator** — `userId|computerName|gitUserId` (pipe-delimited) to prevent collision between variable-length fields. Must match exactly what the CLI computes. (Flagged by: API)

5. **`API_KEY_SALT` minimum entropy**: must be at least 32 bytes; document generation with `openssl rand -hex 32`. The empty-string check alone is insufficient. (Flagged by: Security)

6. **Input length limits**: `email` ≤ 254, `password` ≤ 1000, `orgName` ≤ 100, `computerName` ≤ 255, `gitUserId` ≤ 255. Validate at route handler before touching D1. (Flagged by: Security)

7. **HMAC check before org existence check** in `POST /api/v1/installs` — prevents org ID enumeration via timing/status differences. (Flagged by: Security)

8. **`__Host-` cookie requires `Path=/` and no `Domain` attribute** — state this as a requirement in NFR, not just in implementation notes. (Flagged by: API)

9. **Invite link host**: derive from `APP_URL` environment variable (not the `Host` request header, which can be spoofed). Add `APP_URL` to the required env vars list. (Flagged by: API)

10. **Update project-profile.md** to use `/api/v1/` route prefix consistently — it currently shows `/api/` paths which will confuse future agents. (Flagged by: API)

---

## Remaining Notes

- `requireCtoSession` must handle the case where session row exists but user row is missing (FK not enforced in D1) — return 401, don't crash.
- Session cleanup side-effect must run AFTER the new session is inserted, not before.
- No caching on `(dashboard)/layout.tsx` session check — always live D1 lookup.
- Signup response: `201 { ok: true, inviteLink: string }`. Login: `200 { ok: true }`. Logout: `200 { ok: true }`. Installs: `201 { apiKey: string }`.
- Session ID is `crypto.randomUUID()` — state this explicitly in implementation.
- `GET /api/v1/auth/me` `id` field = `users.id` (UUID).
- The empty shell directories `app/api/v1/orgs/` and `app/api/v1/register/` do NOT exist in the repo — do not create them.
