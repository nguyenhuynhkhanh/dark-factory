# Scenario: promote-agent tolerates specs without `## Invariants` / `## Decisions` sections

## Type
feature

## Priority
high — backward compatibility during rollout.

## Preconditions
- A feature spec exists that does NOT contain `## Invariants` or `## Decisions` sections (legacy / pre-consumers format).
- promote-agent.md edited.

## Action
Read promote-agent.md's legacy-spec tolerance documentation.

## Expected Outcome
- Agent documents handling missing `## Invariants` / `## Decisions` sections gracefully — no crash, no error.
- No entries materialized in any shard file (`invariants-*.md`, `decisions-*.md`) for that spec.
- `index.md` is NOT updated for that spec (no new entries → no new rows).
- FEAT ledger entry is STILL appended with `introducedInvariants: []` and `introducedDecisions: []` (per FR-7).
- A non-fatal note is emitted: "Spec {name} has no `## Invariants` / `## Decisions` sections — legacy format; ledger appended, no memory entries."

## Notes
Covers FR-10, EC-7. Critical for migration — promotion must not block on this. Updated from original P-10 which said "no entries materialized in invariants.md or decisions.md". Now correctly says "no entries materialized in any shard file" and "index.md is NOT updated".
