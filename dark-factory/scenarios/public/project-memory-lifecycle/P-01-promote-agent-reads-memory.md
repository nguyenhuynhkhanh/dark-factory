# Scenario: promote-agent reads index and relevant shard files at start of promotion

## Type
feature

## Priority
critical — foundational write-protocol requirement; every promotion begins with a read.

## Preconditions
- `dark-factory/memory/index.md` exists with valid frontmatter and heading rows.
- Shard files (`invariants-architecture.md`, `invariants-security.md`, `invariants-api.md`, `decisions-architecture.md`, `decisions-security.md`, `decisions-api.md`, `ledger.md`) exist.
- A feature spec has been implemented and holdout validation has passed.
- `.claude/agents/promote-agent.md` has been edited per this spec.

## Action
Read `.claude/agents/promote-agent.md` (the edited version).

## Expected Outcome
- The agent's documented process includes an explicit step (named "Read Memory" or equivalent) that reads `dark-factory/memory/index.md` to determine existing IDs.
- For any shard that will be written (determined by the spec's domain declarations), the agent reads the relevant shard file(s) before writing.
- The step is placed BEFORE the ID-assignment step.
- The agent documents that both index AND relevant shard files are re-read at commit time (BR-11 — not cached from start of run).

## Notes
Structural/documentation assertion. No runtime execution needed — validates the agent's prompt describes the correct behavior. Previously this scenario referenced the old monolithic `invariants.md` and `decisions.md`. Those files no longer exist; the index + shard layout is now the source of truth.
