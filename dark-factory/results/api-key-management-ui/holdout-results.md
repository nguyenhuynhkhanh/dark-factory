# Holdout Test Results — api-key-management-ui

Analysis method: static code analysis of implementation files.
Date: 2026-04-07

---

## H-01-modal-close-without-copying-requires-confirmation: Modal close without copying requires confirmation

Status: PARTIAL PASS / PARTIAL FAIL

Evidence:

**Scenario A — Escape Key:**
`GenerateKeyModal` renders a plain `<div>` overlay, not a `<dialog>` element. There is no `onKeyDown` handler, no `useEffect` listening for `keydown`, and no `onKeyDown`/`onKeyUp` suppression at any level in the component or its parent (`InstallsPageClient`). The browser default behaviour for a plain `<div>` does not fire an Escape dismissal, so there is no native Escape-closes-dialog behaviour to block. However, the implementation does not explicitly suppress Escape either. Since no `<dialog>` or third-party dialog primitive (e.g. Radix Dialog) is used, Escape has no effect in practice — the modal stays open. **PASS by construction** (no mechanism for Escape to close it).

**Scenario B — Backdrop Click:**
The outer overlay `<div>` has no `onClick` handler. Clicking the backdrop does nothing. **PASS.**

**Scenario C — No X Button:**
Neither the `form` phase nor the `revealed` phase of `GenerateKeyModal` renders any X/close button. The only exit in the revealed phase is the "I've copied it" button (`handleConfirmedCopy`). **PASS.**

**Scenario D — Parent Refresh While Modal Open:**
`handleModalSuccess` in `InstallsPageClient` calls `setIsModalOpen(false)` synchronously and THEN calls `router.refresh()`. The modal is unmounted **before** the refresh, not after. However, `handleModalSuccess` is the `onSuccess` prop — it is only invoked when `GenerateKeyModal` calls `onSuccess(label.trim())`, which happens inside `handleConfirmedCopy`, which is wired to the "I've copied it" button. The `router.refresh()` call in the parent is NOT triggered by the POST response or any event during the generation phase — it only runs after the admin has confirmed copy. Therefore the parent refresh does NOT occur while the key is still visible. **PASS.**

Overall H-01: PASS

---

## H-02-revoked-install-events-still-in-feed: Revoked install's historical events still appear in the event feed

Status: PASS

Evidence:

**Schema-level:** `db/schema.ts` defines `events.installId` as `text("install_id").notNull()` — a bare foreign key with no `references()` constraint and no `onDelete` clause in Drizzle. The migration SQL (`0001_api_key_management.sql`) likewise defines no `FOREIGN KEY ... ON DELETE CASCADE` on `events`. Revoking an install sets `installs.revoked_at` only; it never touches the `events` table.

**Revoke route:** `PATCH /api/v1/installs/[id]/revoke/route.ts` performs a single `UPDATE installs SET revoked_at = now WHERE id = ? AND org_id = ?`. There is no `DELETE FROM events` or equivalent operation.

**Events query:** `GET /api/v1/dashboard/events/route.ts` queries `events INNER JOIN installs ON events.install_id = installs.id` filtered only by `events.org_id = orgId` and optional user-supplied params. There is no `WHERE installs.revoked_at IS NULL` filter. Revoked install rows survive in `installs` and the join succeeds; their events are returned normally.

**Events page UI:** `app/(dashboard)/events/page.tsx` renders every row from the API response without any conditional hiding or "revoked" labelling on individual event rows.

**Conclusion:** Revoking an install does not delete or hide historical events in either the API or the UI. **PASS.**

---

## H-03-revoked-badge-overrides-active-pending: Revoked badge overrides Active and Pending states

Status: PASS

Evidence:

`getStatus()` in `InstallsPageClient.tsx` (lines 50–67):

```
function getStatus(install, locallyRevoked) {
  if (install.revokedAt !== null || locallyRevoked) return "revoked";  // ← checked FIRST
  if (!install.isActivated) return "pending";
  // ... active/inactive check follows
}
```

**Row A (isActivated=true, revokedAt set, recent lastSeenAt):** First branch fires — returns `"revoked"`. The `isActivated` check and 30-day window check are never reached. `StatusBadge` renders `bg-red-100 text-red-700` "Revoked". Actions column: `isRevoked = true`, so renders `<span className="text-gray-400">—</span>` — no enabled Revoke button. **PASS.**

**Row B (isActivated=false, revokedAt set, lastSeenAt null):** Same first branch fires — `revokedAt !== null` → `"revoked"`. The `!isActivated` check that would produce "pending" is not reached. Same badge and actions rendering as Row A. **PASS.**

---

## H-04-pending-install-null-fields-render-dashes: Pending install row with null computerName and gitUserId renders dashes

Status: PASS

Evidence:

**Badge:** With `isActivated=false`, `revokedAt=null`, `getStatus` returns `"pending"` (first branch skipped — `revokedAt` is null; second branch `!install.isActivated` is true). `StatusBadge` renders `bg-amber-100 text-amber-700` "Pending". **PASS.**

**computerName null rendering (line 250):**
```tsx
{install.computerName ?? "—"}
```
Null → em dash `"—"`. Not an empty cell, not the string "null". **PASS.**

**gitUserId null rendering (line 260):**
```tsx
{install.gitUserId ?? "—"}
```
Same pattern. **PASS.**

**Revoke button:** `isRevoked = (install.revokedAt !== null || locallyRevoked)` — both false, so the initial Revoke button branch renders. Button is present and enabled. **PASS.**

**XSS variant:** React JSX renders string values as text nodes, escaping `<`, `>`, `"` automatically. `install.computerName` and `install.gitUserId` are rendered inside JSX expression positions (not `dangerouslySetInnerHTML`), so `<script>alert(1)</script>` would appear as literal escaped text in the DOM. **PASS.**

---

## Summary

Total: 4 passed, 0 failed
