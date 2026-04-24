# Scenario: H-26 — ID assignment scans ALL shard files for global max; no per-shard-local counters

## Type
edge-case

## Priority
high — EC-18, FR-17, BR-12. Correct global ID assignment is critical for cross-shard reference integrity.

## Preconditions
- Phase 3.7 / Phase 7 Memory Sign-Off documents ID assignment.

## Action
Structural test asserts the ID-assignment documentation:
1. Before assigning IDs to new entries, the agent scans ALL existing shard files in `dark-factory/memory/` (not just the target shard) for the highest `INV-NNNN` numeric portion across all of them.
2. The first new entry gets global_max+1 (or 1 if no existing entries found across any shard).
3. This global scan applies to BOTH bootstrap (where any shard may have been pre-seeded by a prior partial run) AND incremental refresh (where previous onboard entries exist across multiple shards).
4. IDs are sequential with zero-padding to 4 digits (`INV-0001`, `INV-0002`, ...).
5. IDs are NEVER reused or per-shard-local — an `INV-0001` in `invariants-security.md` and an `INV-0002` in `invariants-architecture.md` are both valid; an `INV-0001` in both is a collision and must not occur.
6. Rejected candidates do not consume an ID in the final output — they held a session `CANDIDATE-N` ID that is discarded.

## Expected Outcome
- Global max-scan rule documented (scanning all shards, not just the destination shard).
- Zero-padding documented.
- ID non-reuse and no per-shard-local counters documented explicitly.
- Distinction between session-`CANDIDATE-N` IDs and permanent `NNNN` IDs is clear.
- Bootstrap and incremental-refresh both use the global scan.

## Failure Mode (if applicable)
If the documentation describes a per-shard ID counter (each shard starts at 0001 independently), test fails — this would produce duplicate IDs across shards. If the global scan requirement is absent, test fails.

## Notes
TEMPLATE placeholder entries no longer exist in shard files (eliminated by design — shards ship with only YAML frontmatter). The ID collision concern now comes from prior bootstrap runs writing `INV-0001` to `invariants-security.md` and a subsequent run naively starting from 1 again in `invariants-architecture.md`. The global scan is the safeguard. This replaces the original TEMPLATE-collision scenario, which was premised on TEMPLATE placeholder entries that no longer exist in the shard layout.
