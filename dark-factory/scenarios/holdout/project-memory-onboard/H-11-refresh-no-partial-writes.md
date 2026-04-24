# Scenario: H-11 — Incremental refresh: no partial batch writes to shards or index

## Type
concurrency

## Priority
high — BR-8. Partial writes would leave memory in an inconsistent state, and a stale index would mislead consumers.

## Preconditions
- onboard-agent incremental-refresh section present.

## Action
Structural test asserts the refresh section documents:
1. Writes to each shard file occur **after** the entire batch for that shard's domain has completed sign-off (no per-entry write mid-batch).
2. If the developer aborts partway through a batch (e.g., Ctrl-C or explicit cancel), the agent does NOT write any partial batch to any shard file — the shard stays as it was on entry to the session.
3. If the developer completes one batch (e.g., invariants) and aborts another (e.g., decisions), the completed batch IS written to its shard files — batches are independent commit units.
4. `index.md` is ONLY regenerated after ALL shard writes for the completed batches are done. If the developer aborts after completing the invariants batch but before completing decisions, `index.md` is regenerated to reflect only the committed invariant changes — it is not left in a pre-refresh state.
5. The documentation must state that index regeneration is performed once after all completed-batch shard writes, not incrementally per shard.

## Expected Outcome
- Per-batch atomicity for shard writes is explicit.
- Abort behavior is documented for both mid-batch and inter-batch cases.
- Batches are independent commit units.
- Index regeneration timing is explicit: after all committed-batch writes, once.
- Per-shard-incremental index updates are not described (the index is always regenerated in full from all shards).

## Failure Mode (if applicable)
If the documentation is silent on abort behavior for shard writes, test fails. If per-entry writes to shards are documented, test flags the atomicity violation. If the index is described as being updated per-shard rather than regenerated once after all writes, test flags it.

## Notes
The six shard files are independent from each other, but within a single domain (e.g., invariants-security.md), all additions and status flips for the current session must be applied as one atomic write after the batch. The index always reflects the complete, consistent committed state of all shards at regeneration time.
