# Scenario: Index missing — agent warns and falls back to loading all available shards

## Type
failure-recovery

## Priority
high — index failure must not silently drop constraint coverage

## Preconditions
- `dark-factory/memory/` directory EXISTS (foundation has deployed)
- `dark-factory/memory/index.md` does NOT exist (removed, corrupted, or never created)
- `dark-factory/memory/invariants-security.md` exists with `INV-0011` (active)
- `dark-factory/memory/invariants-architecture.md` exists with `INV-0020` (active)
- `dark-factory/memory/invariants-api.md` exists (may be empty)
- `dark-factory/memory/decisions-security.md` exists
- `dark-factory/memory/decisions-architecture.md` exists
- `dark-factory/memory/decisions-api.md` exists
- `dark-factory/memory/ledger.md` exists
- A feature pipeline runs

## Action
Spawn spec-agent, architect-agent (security domain), code-agent, and debug-agent. Each agent attempts Phase 1 memory load.

## Expected Outcome
- Every consumer attempts to read `dark-factory/memory/index.md` and fails (file not found).
- Every consumer logs: `"Memory index not found — loading all shards for broad coverage"`.
- Every consumer falls back to loading ALL shard files it can find: `invariants-security.md`, `invariants-architecture.md`, `invariants-api.md`, `decisions-security.md`, `decisions-architecture.md`, `decisions-api.md`.
- Every consumer continues with the full set of entries from all shards.
- No consumer crashes, blocks, or produces an incomplete output.
- **spec-agent**: still identifies invariants relevant to its scope and populates memory sections.
- **architect-agent (security domain)**: loads all shards in fallback mode, but still restricts findings emission to security-domain entries in the `### Memory Findings (Security)` block. The fallback does not break domain discipline in the OUTPUT — it only expands what data is available to read.
- **code-agent**: loads all shards, then applies constraint filtering based on `scope.modules` overlap as normal. The absence of the index for routing does not mean all entries become constraints — scope-module overlap is still the determinant.
- **debug-agent**: loads all shards, performs cross-reference as normal.
- This is a DEGRADED state (more tokens consumed), not a broken state. The pipeline completes correctly.

## Failure Mode
If the agent silently proceeds with an empty memory set when the index is missing (instead of falling back to all shards), constraints that would have been enforced are silently dropped — an invariant violation that should be caught during architect review will not be. The fallback is mandatory.

## Notes
Validates FR-17, INV-TBD-a. This is distinct from the registry-missing case (P-13/P-NEW-03) where NO files exist. Here the shards exist but the routing layer is gone — the correct response is broad coverage, not empty set. The degraded-state note is important: operational teams should know that index-missing is a higher-token operating mode that should be fixed promptly (via `/df-cleanup` or by regenerating the index).
