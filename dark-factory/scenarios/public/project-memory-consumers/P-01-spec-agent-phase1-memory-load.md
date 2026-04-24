# Scenario: spec-agent loads index first, then selects domain shards in Phase 1

## Type
feature

## Priority
critical — foundational; without this, no downstream memory logic in spec-agent can function

## Preconditions
- `dark-factory/memory/index.md` exists with entries in security and architecture domains
- `dark-factory/memory/invariants-security.md` exists with at least one active entry (e.g., `INV-0001`)
- `dark-factory/memory/invariants-architecture.md` exists with at least one active entry (e.g., `INV-0004`)
- `dark-factory/memory/decisions-architecture.md` exists
- `dark-factory/memory/ledger.md` exists
- `dark-factory/project-profile.md` exists
- `dark-factory/code-map.md` exists
- spec-agent is spawned by df-intake for a new feature whose described scope touches `src/auth/` (security) and `src/services/` (architecture)

## Action
Inspect the spec-agent prompt file `.claude/agents/spec-agent.md` for its Phase 1 load instructions. The agent's Phase 1 MUST direct it to:
1. Read `dark-factory/memory/index.md` first.
2. From the index, identify which domains overlap with the spec's described scope.
3. Load ONLY the domain shard files for those identified domains.
4. Always load `ledger.md` in full.

## Expected Outcome
- `.claude/agents/spec-agent.md` content includes a reference to `dark-factory/memory/index.md` as the first memory read in Phase 1 (Understand the Request).
- The Phase 1 section describes the shard selection logic: identify domains from the index, then load only the matching shards (e.g., `invariants-security.md`, `decisions-security.md`, `invariants-architecture.md`, `decisions-architecture.md`).
- The section explicitly states that `ledger.md` is always loaded in full.
- Graceful-degradation language is present:
  - Index missing: `"Memory index not found — loading all shards for broad coverage"` + load all available shards.
  - Specific shard missing: `"Shard {filename} not found — treating as empty domain"` + continue.
- The old monolithic paths `dark-factory/memory/invariants.md` and `dark-factory/memory/decisions.md` do NOT appear in the Phase 1 load instructions.
- The plugin mirror `plugins/dark-factory/agents/spec-agent.md` contains byte-identical content.

## Notes
Validates FR-1 and AC-1. This is a structural (string-matching) check on the agent prompt; no runtime execution needed. The negative assertion (old monolithic paths absent) is as important as the positive assertion (index + shards present). Test-agent will also verify the plugin mirror parity.
