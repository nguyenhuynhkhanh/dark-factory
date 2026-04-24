# Scenario: Architect-agent loads index then only its own domain shards, emits Memory Findings block

## Type
feature

## Priority
critical — the probe IS the enforcement mechanism; shard-selective loading IS the efficiency guarantee

## Preconditions
- `dark-factory/memory/index.md` exists with entries in all three domains
- `dark-factory/memory/invariants-security.md` contains `INV-0002` (domain: security)
- `dark-factory/memory/decisions-security.md` exists
- `dark-factory/memory/invariants-architecture.md` contains `INV-0004` (domain: architecture)
- `dark-factory/memory/decisions-architecture.md` exists
- `dark-factory/memory/invariants-api.md` contains `INV-0006` (domain: api)
- `dark-factory/memory/decisions-api.md` exists
- A spec exists that scopes into `src/auth/` and `src/api/routes/`
- implementation-agent spawns three architect-agents in parallel, each with a `domain` parameter

## Action
Each domain-parameterized architect-agent performs Step 1 Deep Review, including the memory probe:
1. Reads `dark-factory/memory/index.md`.
2. Loads ONLY the shard files for its assigned domain (e.g., security reviewer loads `invariants-security.md` + `decisions-security.md`; does NOT load architecture or api shards).
3. Performs the invariant/decision probe restricted to entries in its domain.
4. Writes its domain review file including the `### Memory Findings (<domain>)` block.

## Expected Outcome
- `dark-factory/specs/features/{name}.review-security.md` contains a `### Memory Findings (Security)` block.
- `dark-factory/specs/features/{name}.review-architecture.md` contains a `### Memory Findings (Architecture)` block.
- `dark-factory/specs/features/{name}.review-api.md` contains a `### Memory Findings (API)` block.
- Each block contains all five categories (even if empty-line "none"):
  - `Preserved`
  - `Modified (declared in spec)`
  - `Potentially violated (BLOCKER)`
  - `New candidates declared`
  - `Orphaned (SUGGESTION only)`
- The security review discusses `INV-0002` only (from `invariants-security.md`). It does NOT discuss `INV-0004` or `INV-0006`.
- The architecture review discusses `INV-0004` only (from `invariants-architecture.md`). It does NOT discuss `INV-0002` or `INV-0006`.
- The api review discusses `INV-0006` only (from `invariants-api.md`). It does NOT discuss `INV-0002` or `INV-0004`.
- No cross-domain duplication.
- The `.claude/agents/architect-agent.md` prompt explicitly states the shard-selective loading rule: load index, then `invariants-{domain}.md` + `decisions-{domain}.md`, and explicitly prohibits loading other domain shards.

## Notes
Validates FR-6, FR-7, AC-4, BR-2, BR-3, BR-9. The shard-selective discipline is tested here both as a structural prompt assertion and as a behavioral outcome (no cross-domain data). The holdout suite will verify that a security reviewer CANNOT emit a finding about an architecture-domain entry (H-NEW-01).
