# Scenario: spec-agent with ambiguous scope loads all three invariant shards (conservative fallback)

## Type
edge-case

## Priority
medium — ambiguous scope is common in early feature descriptions; conservative fallback prevents missed constraints

## Preconditions
- `dark-factory/memory/index.md` exists with entries across all three domains
- `dark-factory/memory/invariants-security.md` exists with `INV-0001` (active)
- `dark-factory/memory/invariants-architecture.md` exists with `INV-0004` (active)
- `dark-factory/memory/invariants-api.md` exists with `INV-0006` (active)
- `dark-factory/memory/decisions-security.md`, `decisions-architecture.md`, `decisions-api.md` all exist
- `dark-factory/memory/ledger.md` exists
- A developer submits a feature request: "Improve system performance" — a description that does not clearly map to any specific module, domain, or file path
- spec-agent is spawned

## Action
spec-agent performs Phase 1:
1. Reads `dark-factory/memory/index.md`.
2. Attempts to identify which domains the spec's described scope overlaps.
3. Cannot determine domain from the description alone — no specific modules, endpoints, or entities are mentioned.
4. Applies the conservative fallback rule: ambiguous scope → load all three invariant shards.

## Expected Outcome
- spec-agent loads `invariants-security.md`, `invariants-architecture.md`, AND `invariants-api.md` (all three invariant shards).
- spec-agent optionally loads all three decision shards as well (conservative behavior also applies to decisions).
- spec-agent loads `ledger.md` in full.
- spec-agent does NOT skip any domain's invariant shard on account of the vague description.
- The spec-agent prompt explicitly describes the conservative fallback rule: "If scope is ambiguous (cannot be determined from the description), load all three invariant shards."
- During spec drafting, spec-agent uses the full invariant set to identify which entries may be relevant to the vague "system performance" scope and notes them appropriately under `## Invariants > References` or `## Invariants > Preserves` if any apply.
- The spec-agent asks the developer scoping questions (as required by Phase 2 of the spec-agent process) to narrow the ambiguity — but this DOES NOT prevent it from loading the full invariant set in Phase 1. The full load happens first, before scope discovery concludes.

## Failure Mode
If spec-agent selects NO shards when the scope is ambiguous (because "nothing is clearly in scope"), it operates with an empty constraint set during drafting. If the feature turns out to touch security modules (discovered during scope discovery), the spec will have been drafted without awareness of the relevant security invariants — creating a gap that the architect must catch in Round 1.

The conservative fallback prevents this: the cost of loading all three shards (at most 24,000 additional tokens) is much smaller than the cost of a missed security invariant reaching the architect review as a BLOCKER requiring a full respawn.

## Notes
Validates FR-1 (ambiguous scope fallback), INV-TBD-a. This is the most common case in practice: early feature descriptions are vague by nature. The conservative fallback is a design choice that accepts slightly higher token cost for breadth of coverage in ambiguous cases. Only spec-agent applies this fallback; architect-agents always know their domain parameter and always use shard-selective loading.
