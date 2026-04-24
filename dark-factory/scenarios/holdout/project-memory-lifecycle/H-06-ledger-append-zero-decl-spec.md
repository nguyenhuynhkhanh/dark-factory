# Scenario: Spec with zero invariants AND zero decisions still appends FEAT entry

## Type
edge-case

## Priority
high — silent gaps in the ledger undermine its forensic value.

## Preconditions
- Spec contains `## Invariants` section but both `Introduces`, `Modifies`, `Supersedes`, `References` are empty (or entire section absent).
- Same for `## Decisions`.
- Spec is being promoted.

## Action
promote-agent runs.

## Expected Outcome
- `ledger.md` gains a FEAT-NNNN entry.
- `introducedInvariants: []`, `introducedDecisions: []`.
- `name`, `summary`, `promotedAt`, `promotedTests`, `gitSha` all populated.
- No entries written to any shard file (`invariants-*.md`, `decisions-*.md`).
- `index.md` is NOT updated (no new entries to add; `entryCount` and `shardCount` remain the same).
- Zero-decl is not treated as a no-op — the ledger records the promotion.

## Notes
Covers FR-7, BR-3, EC-6. The invariant is "ledger grows by exactly one row per successful promotion, always". Updated from original H-06 which said "no entries written to invariants.md or decisions.md" — now correctly states "no entries written to any shard file" and "index.md is NOT updated" since the shard layout replaces the old monolithic files.
