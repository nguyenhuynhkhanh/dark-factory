# Scenario: promote-agent handles Supersedes — old entry marked, new entry assigned fresh ID

## Type
feature

## Priority
critical — supersession is the schema-aware replace operation.

## Preconditions
- Spec declares `## Invariants > Supersedes > INV-0003` and also introduces a fresh `INV-TBD-x` replacement with `domain: architecture`.
- INV-0003 exists in `index.md` with `[status:active]` and `[shard:invariants-architecture.md]`.
- INV-0003 exists in `invariants-architecture.md` with `status: active`.
- promote-agent.md edited.

## Action
Read promote-agent.md's Supersedes-handler documentation.

## Expected Outcome
- Assigns the new entry a fresh permanent ID (e.g., INV-0008) and materializes it in `invariants-architecture.md` (Introduces flow).
- Updates INV-0003 in `invariants-architecture.md` in place: `status: superseded`, `supersededBy: INV-0008`, `supersededAt: <ISO now>`, `supersededBySpec: <spec-name>`.
- Updates INV-0003's row in `index.md` in place: changes `[status:active]` to `[status:superseded]`.
- Appends a new row for INV-0008 to `index.md`.
- INV-0003 REMAINS in `invariants-architecture.md` (NOT deleted — locked by foundation BR-3).
- The new INV-0008 is materialized per standard Introduces flow (shard-first, then index row added).

## Notes
Tests assert the phrases "status: superseded", "supersededBy", and "NOT deleted" (or equivalent) appear in promote-agent.md. Updated from original P-05 which referenced the old monolithic `invariants.md`. Now references the domain shard and the in-place index row update for the old entry, plus the new index row for the new entry.
