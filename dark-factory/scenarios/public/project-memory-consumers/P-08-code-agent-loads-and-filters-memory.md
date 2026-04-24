# Scenario: code-agent loads index then selects domain shards, treats overlapping entries as hard constraints

## Type
feature

## Priority
critical — constraint-awareness is the read-side enforcement; shard selection bounds token cost

## Preconditions
- `dark-factory/memory/index.md` exists; the index entry for `INV-0011` shows `[domain:security]` and `[shard:invariants-security.md]`
- `dark-factory/memory/invariants-security.md` contains `INV-0011` (scope.modules includes `src/auth/tokens.js`, rule: "tokens must be signed with the production secret; never use static strings for JWT secrets")
- `dark-factory/memory/invariants-architecture.md` exists but does NOT contain entries that overlap with `src/auth/tokens.js`
- A spec (already architect-approved) tasks code-agent with modifying `src/auth/tokens.js`
- code-agent is spawned

## Action
Inspect the code-agent prompt `.claude/agents/code-agent.md` and verify:
1. Phase 1 / General Patterns load step references `dark-factory/memory/index.md` as the first memory read.
2. The load step describes shard selection: use index to identify entries whose `scope.modules` overlap with files being modified; load ONLY those domain shards.
3. The constraint-filtering rule is present: entries whose `scope.modules` overlap with files being modified are treated as HARD CONSTRAINTS.
4. The spec is the only authoritative override: code-agent may violate an invariant ONLY IF the spec explicitly declares `Modifies` or `Supersedes` of that entry.
5. The old monolithic paths `dark-factory/memory/invariants.md` and `dark-factory/memory/decisions.md` do NOT appear in the Phase 1 load instructions.

## Expected Outcome
- The code-agent prompt contains a passage directing it to read `dark-factory/memory/index.md` first in Phase 1, then select and load only the domain shards whose entries overlap with files being modified.
- The prompt contains the shard-selection logic: "From the index, identify entries whose domain/scope overlaps with the files you will modify. Load only the corresponding shard files."
- The prompt contains the constraint rule: "For each memory entry whose `scope.modules` overlaps with files you will modify, treat the entry's `rule` and `rationale` as a HARD CONSTRAINT. Do not violate the rule unless the spec explicitly declares supersession or modification of the entry."
- During implementation, if code-agent is asked to hardcode a JWT secret string into `src/auth/tokens.js`, the code-agent recognizes this violates `INV-0011` and either (a) refuses and reports back to implementation-agent, or (b) uses the production-secret loader.
- EC-9: code-agent does not care that `INV-0011.domain == security` for the purpose of constraint enforcement — constraint applicability is determined by scope overlap only. Domain is used for shard routing; the loaded entry's rule is binding regardless of domain label.
- Graceful-degradation language is present in the Phase 1 load step: missing index → warn + load all shards; missing shard → warn + treat domain as empty.

## Notes
Validates FR-10, FR-11, AC-6, AC-7, EC-9, BR-10. The holdout suite covers adversarial cases (H-09, H-NEW-02, H-NEW-05). The negative assertion on old monolithic paths is load-bearing for the migration correctness guarantee.
