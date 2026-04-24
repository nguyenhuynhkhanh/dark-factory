# Scenario: H-NEW-07 — IDs are sequential globally across shards; per-shard-local counters are forbidden

## Type
edge-case

## Priority
critical — FR-17, BR-12, DEC-TBD-b, EC-22. Cross-shard ID collision would break all cross-references in consumer agents and cause index lookup failures.

## Preconditions
- Phase 3.7 / Phase 7 Memory Sign-Off documents ID assignment.

## Action
Structural test asserts the ID assignment documentation describes a GLOBAL counter across all shards:

**Scenario setup (via structural assertion):**
Simulate a two-invariant bootstrap where:
- INV-CANDIDATE-1 has `domain: security` → routes to `invariants-security.md`
- INV-CANDIDATE-2 has `domain: architecture` → routes to `invariants-architecture.md`
Both are accepted.

The documentation must state that the first accepted entry gets `INV-0001` and the second gets `INV-0002`, regardless of which shard each lands in. Specifically:
- `invariants-security.md` contains `INV-0001`
- `invariants-architecture.md` contains `INV-0002`
- NOT: both shards each containing `INV-0001` (per-shard-local counter bug)

**Structural assertions on the documentation:**
1. The ID counter is described as global — shared across all invariant shard files (or all decision shard files, respectively).
2. The counter increments with each ACCEPTED entry in sign-off order, regardless of which domain shard receives the entry.
3. The documentation explicitly states IDs are NOT per-shard-local (or words to equivalent effect: "global sequence", "cross-shard counter", "not reset per shard").
4. The cross-shard global scan (from H-26) is the mechanism that prevents collisions on incremental refresh — not a per-shard counter.

## Expected Outcome
- Global counter described (not per-shard).
- Sign-off-order incrementing documented.
- "Not per-shard-local" language (or equivalent) present.
- Global scan as the anti-collision mechanism is referenced.
- Index lists `INV-0001` (in security shard) and `INV-0002` (in architecture shard) in ID-ascending order.

## Failure Mode (if applicable)
If the documentation describes per-shard-local counters (each shard starts at 0001 independently), test fails. If the global scan is absent, test flags it. If the example in the documentation shows both shards receiving `INV-0001`, test fails.

## Notes
This is the hardest invariant to enforce in documentation — implementations naturally reach for per-shard local counters. The test must specifically assert that the counter is global and that sign-off order (not shard destination) determines the ID. The global scan from H-26 is the incremental-refresh complement to this scenario: on refresh, the starting point for new IDs is the max across ALL shards, not the max within the target shard.
