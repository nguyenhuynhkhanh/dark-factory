# Scenario: spec-agent loads index then selects domain shards based on spec scope

## Type
feature

## Priority
critical — validates the core index-first protocol for spec-agent

## Preconditions
- `dark-factory/memory/index.md` exists with entries in all three domains, including:
  - `INV-0001` `[domain:security]` `[shard:invariants-security.md]` — scope: `src/auth/`
  - `INV-0004` `[domain:architecture]` `[shard:invariants-architecture.md]` — scope: `src/services/`
  - `INV-0006` `[domain:api]` `[shard:invariants-api.md]` — scope: `src/api/`
- `dark-factory/memory/invariants-security.md` exists, populated
- `dark-factory/memory/invariants-architecture.md` exists, populated
- `dark-factory/memory/invariants-api.md` exists, populated
- `dark-factory/memory/decisions-security.md` exists
- `dark-factory/memory/decisions-architecture.md` exists
- `dark-factory/memory/ledger.md` exists
- A developer requests a feature that clearly touches `src/auth/` (security domain) and `src/services/` (architecture domain), but NOT `src/api/`
- spec-agent is spawned

## Action
spec-agent executes Phase 1:
1. Reads `dark-factory/memory/index.md`.
2. Identifies from the index that the spec scope overlaps with the security domain (`src/auth/`) and architecture domain (`src/services/`), but NOT the api domain.
3. Loads `invariants-security.md` and `decisions-security.md`.
4. Loads `invariants-architecture.md` and `decisions-architecture.md`.
5. Does NOT load `invariants-api.md` or `decisions-api.md` (no scope overlap).
6. Loads `ledger.md` in full.

## Expected Outcome
- spec-agent reads the index first (single read of `index.md`).
- spec-agent loads exactly four shard files: security invariants + decisions, architecture invariants + decisions. The api shards are not loaded.
- spec-agent loads `ledger.md` in full.
- The output spec file `dark-factory/specs/features/{name}.spec.md` populates `## Invariants > Preserves` or `References` with any `INV-0001` or `INV-0004` entries that are relevant.
- `INV-0006` does not appear in the spec's memory sections (not loaded).
- The spec-agent prompt references `dark-factory/memory/index.md` as the first memory read in Phase 1; the shard selection logic is described explicitly.
- EC-17 (all domains in scope): if the spec had touched all three domains, spec-agent would have loaded all six shard files — the maximum load case is index + 6 shards ≤ 52,000 tokens from memory (within NFR-4 budget).

## Notes
Validates FR-1, AC-1, EC-17, NFR-4. This scenario demonstrates the core efficiency gain: a two-domain spec loads 4 shards instead of 6, saving up to 16,000 tokens. The test-agent should verify both the positive assertion (security and architecture shards loaded) and the negative assertion (api shards not loaded) in the prompt's Phase 1 instruction.
