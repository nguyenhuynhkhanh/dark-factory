# Scenario: promote-agent shard write fails → no index update, no orphan entry

## Type
failure-recovery

## Priority
critical — shard-first ordering guarantees clean failure when the shard write itself fails.

## Preconditions
- promote-agent.md edited per shard-first, index-last protocol.
- Spec introduces one invariant with `domain: security`.
- `dark-factory/memory/invariants-security.md` exists but simulated to fail on write (permission error injected).
- `dark-factory/memory/index.md` is valid and does NOT contain a row for the new INV-NNNN being assigned.

## Action
promote-agent attempts to write the new entry to `invariants-security.md`. The write fails.

## Expected Outcome
- The shard write to `invariants-security.md` fails.
- No attempt is made to update `index.md` (because the shard write did not succeed; shard-first ordering means the index update is never initiated).
- `index.md` does NOT contain any row for the new INV-NNNN.
- `invariants-security.md` is NOT partially written (promote-agent had a pre-write snapshot; failure leaves the file unchanged from its pre-write state).
- No ORPHANED_SHARD condition exists (the entry is in neither the shard nor the index).
- promote-agent reports failure: "Memory write failed — shard write error on invariants-security.md. No changes made. Promotion aborted."
- Manifest stays at `passed` (not `promoted`).

## Failure Mode
If this scenario incorrectly produces an ORPHANED_SHARD (entry in shard, not in index), it means the write succeeded despite the injected error — check the failure injection. This scenario's success condition is a clean no-op failure, NOT an ORPHANED_SHARD.

## Notes
Covers NFR-1 (shard-first ordering guarantees; clean failure path), BR-15 (ORPHANED_SHARD only arises when shard write SUCCEEDS but index update FAILS — not when shard write itself fails). Contrasts with H-NEW-02, where the shard write SUCCEEDS and the index update FAILS, producing an ORPHANED_SHARD condition. The two failure modes are distinct and must be handled differently.
