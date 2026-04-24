# Scenario: Graceful degradation — index missing, agent warns and loads all available shards

## Type
feature

## Priority
high — validates that index-missing does not silently drop coverage (opposite of registry-missing)

## Preconditions
- `dark-factory/memory/` directory exists (foundation has deployed)
- `dark-factory/memory/index.md` does NOT exist
- `dark-factory/memory/invariants-security.md` exists, populated
- `dark-factory/memory/invariants-architecture.md` exists, populated
- `dark-factory/memory/invariants-api.md` exists, populated
- `dark-factory/memory/decisions-security.md`, `decisions-architecture.md`, `decisions-api.md` all exist
- `dark-factory/memory/ledger.md` exists
- spec-agent is spawned for a new feature

## Action
spec-agent performs Phase 1 memory load. The index is missing.

## Expected Outcome
- spec-agent logs: `"Memory index not found — loading all shards for broad coverage"`.
- spec-agent loads ALL six shard files: `invariants-security.md`, `invariants-architecture.md`, `invariants-api.md`, `decisions-security.md`, `decisions-architecture.md`, `decisions-api.md`.
- spec-agent loads `ledger.md`.
- spec-agent proceeds with spec drafting using the full entry set from all shards.
- spec-agent does NOT treat the missing index as "memory is empty" — the shards exist and contain real data.
- spec-agent does NOT crash or block.
- The spec output correctly populates `## Invariants > Preserves` or `References` with any entries relevant to the spec scope, sourced from the loaded shards.
- The architect-agent prompt includes the same fallback rule: when the index is missing, load all shards.

## Notes
Validates FR-17, INV-TBD-a. This scenario documents the KEY DISTINCTION between two degradation cases:
- **Index missing, shards present** (this scenario): fallback is "load all shards" — broad coverage, higher tokens, correct behavior.
- **Registry missing** (P-13): fallback is "empty set" — no files exist to load.

A consumer that treats index-missing the same as registry-missing will silently drop all constraint coverage when the index is temporarily unavailable. The two cases must produce different log messages AND different behavior (load-all vs. empty-set). Test-agent should verify the log message string distinguishes them.
