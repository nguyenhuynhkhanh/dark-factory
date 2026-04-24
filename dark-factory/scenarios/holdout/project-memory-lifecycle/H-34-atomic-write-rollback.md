# Scenario: promote-agent shard write failure → clean rollback; no partial state

## Type
failure-recovery

## Priority
high — atomicity of multi-shard writes.

## Preconditions
- promote-agent.md edited.
- Hypothetical: a spec introduces two invariants across different domains (one `architecture`, one `security`), requiring writes to both `invariants-architecture.md` and `invariants-security.md`.
- promote-agent begins the write sequence: writes `## INV-0008` to `invariants-architecture.md` (succeeds), then attempts to write `## INV-0009` to `invariants-security.md` (fails — simulated permission error).
- index.md has NOT yet been updated for either entry (shard-first ordering).

## Action
promote-agent attempts the multi-shard memory write and encounters a failure on the second shard write.

## Expected Outcome
- promote-agent kept an in-memory snapshot of all files' pre-write state.
- `invariants-architecture.md` is restored to its pre-write state (INV-0008 entry removed).
- `invariants-security.md` is NOT partially written.
- `index.md` is NOT written at all (index update had not started when the second shard write failed).
- promote-agent reports failure to implementation-agent: "Memory write failed mid-sequence — rolled back. Promotion aborted."
- Manifest stays at `passed` (not `promoted`).
- No partial state on disk.

## Failure Mode
If rollback itself fails (e.g., `invariants-architecture.md` cannot be restored), promote-agent logs: "CRITICAL: Rollback failed for invariants-architecture.md. Manual inspection required." and fails promotion. This is a last-resort scenario beyond normal error handling.

## Notes
Covers NFR-1, EC-24. This scenario tests multi-shard rollback (two shards, one fails). Distinct from H-NEW-01 (single-shard write succeeds, index fails → ORPHANED_SHARD) and H-NEW-02 (ORPHANED_SHARD detection). The key invariant here is: if a SHARD WRITE FAILS, the system rolls back cleanly — no orphaned entries, no partial index update. ORPHANED_SHARD only applies when the shard write SUCCEEDS but the index update fails (which is NFR-1's chosen recovery path).
