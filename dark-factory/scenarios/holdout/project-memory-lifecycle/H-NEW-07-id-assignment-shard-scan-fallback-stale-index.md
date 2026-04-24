# Scenario: ID assignment falls back to shard scan when index is stale (ORPHANED_SHARD exists)

## Type
edge-case

## Priority
critical — stale index must not cause ID collision; shard scan is the ground-truth fallback.

## Preconditions
- `dark-factory/memory/index.md` has rows for INV-0001..INV-0005. Max in index = 5.
- `dark-factory/memory/invariants-security.md` contains `## INV-0006` (an ORPHANED_SHARD — a prior promote-agent wrote the shard entry but failed to update the index).
- `dark-factory/memory/invariants-architecture.md` contains INV-0001..INV-0003 (all indexed).
- A new spec introduces one invariant with `domain: architecture`.

## Action
promote-agent reads the index (fast path) and sees max = 5. Before assigning INV-0006, it detects that the index may be stale: it compares index entryCount / max-ID against actual shard content. It finds `## INV-0006` in `invariants-security.md` without a corresponding index row. The fast path would assign INV-0006 (collision). promote-agent triggers the shard-scan fallback.

## Expected Outcome
- promote-agent detects the ORPHANED_SHARD condition during ID assignment (either via explicit stale-index detection logic, or by scanning all shards before assigning any ID).
- promote-agent logs: "Index stale — ORPHANED_SHARD detected: INV-0006 in invariants-security.md not in index. Using shard-scan for ID assignment."
- Shard scan finds max ID = 6 (INV-0006 in `invariants-security.md`).
- promote-agent assigns INV-0007 (max from shard scan + 1), NOT INV-0006.
- The new invariant entry is written as `## INV-0007` to `invariants-architecture.md`.
- A new index row for INV-0007 is added to `index.md` (index is now partially repaired — INV-0007 is indexed, but INV-0006 is still orphaned and requires `--rebuild-index` for full repair).
- promote-agent does NOT attempt to also add the missing INV-0006 row to the index (that is `--rebuild-index`'s job, not promote-agent's job).

## Failure Mode
If promote-agent uses the fast path and assigns INV-0006, two entries (`## INV-0006` in security shard from the orphan + `## INV-0006` in architecture shard from this run) would exist with the same ID in different shards. This is an ID collision — a critical invariant violation.

## Notes
Covers FR-2 (shard-scan fallback), BR-2 (IDs never reused), BR-16 (shard is ground truth), EC-34. This scenario validates the stale-index detection and fallback logic is actually effective — the fast path alone would produce a collision in this state. The fallback must be triggered automatically (not developer-initiated) when an orphan is detected during ID assignment.
