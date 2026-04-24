# Scenario: Retired IDs are NEVER reused, even when superseded entries are rare

## Type
edge-case

## Priority
critical — ID monotonicity is a foundation invariant.

## Preconditions
- `dark-factory/memory/index.md` contains rows for: INV-0001 (active), INV-0002 (superseded), INV-0003 (active), INV-0004 (active), INV-0005 (deprecated). Max index ID = 5.
- The corresponding shard files contain the matching `## INV-NNNN` headings.
- A spec introduces one new `INV-TBD-a` with `domain: architecture`.

## Action
promote-agent processes the spec. It reads the index (fast path) to determine max ID = 5.

## Expected Outcome
- The new entry is assigned INV-0006 (max + 1).
- INV-0006 is written as a new heading to `invariants-architecture.md`.
- A new index row for INV-0006 is appended to `index.md`.
- INV-0002's slot (superseded) is NOT reused.
- INV-0005's slot (deprecated) is NOT reused.
- Gaps in the middle of the sequence (if any existed) are NOT backfilled.
- Documentation of this behavior is asserted in promote-agent.md.

## Notes
This covers the "what about deprecated/superseded slots?" edge. The scenario now includes the index as the primary ID source (fast path). Tests should include a snippet of `index.md` with a mix of statuses and assert that the computed next ID is `max + 1`, not `smallest gap`. The shard files must also contain matching headings to confirm no reuse in the actual shard scan fallback path.
