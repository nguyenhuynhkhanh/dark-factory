# Scenario: Context rule references index.md only — not individual shard files

## Type
feature

## Priority
critical — the context rule controls what every agent loads. Loading shards from the rule would burn tokens on every invocation.

## Preconditions
- `.claude/rules/dark-factory-context.md` exists with the memory update applied.

## Action
Read `.claude/rules/dark-factory-context.md`. Search for references to memory files.

## Expected Outcome
- The rule references `dark-factory/memory/index.md` as the memory context source.
- The rule does NOT mention any shard filename: not `invariants-security.md`, not `invariants-architecture.md`, not `invariants-api.md`, not `decisions-security.md`, not `decisions-architecture.md`, not `decisions-api.md`.
- The rule does NOT reference the old monolithic filenames `invariants.md` or `decisions.md`.
- The rule explicitly or implicitly establishes that shard loading is the responsibility of each consumer agent's own instructions.

## Notes
Validates FR-14, BR-9, DEC-TBD-g. This is the token-efficiency guarantee: always-loading only the index (≤ 4,000 tokens) vs. loading all shards (up to 6 × 8,000 = 48,000 tokens) is a critical design decision. The rule must not accidentally include shard references.
