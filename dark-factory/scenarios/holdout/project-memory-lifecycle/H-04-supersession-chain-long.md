# Scenario: Supersession chain over multiple generations preserves all prior entries

## Type
edge-case

## Priority
high — chain integrity under repeated supersession.

## Preconditions
- INV-0001 was superseded by INV-0003 previously:
  - `index.md` has rows: INV-0001 (`[status:superseded]`, `[shard:invariants-architecture.md]`), INV-0003 (`[status:active]`, `[shard:invariants-architecture.md]`).
  - `invariants-architecture.md` contains both `## INV-0001` (with `supersededBy: INV-0003`) and `## INV-0003` (with `status: active`).
- spec-x declares `## Invariants > Supersedes > INV-0003` and introduces `INV-TBD-y` replacement with `domain: architecture`.

## Action
promote-agent processes spec-x.

## Expected Outcome
- `INV-TBD-y` gets a new permanent ID (e.g., INV-0008) materialized in `invariants-architecture.md`.
- INV-0003's entry in `invariants-architecture.md` now has `status: superseded`, `supersededBy: INV-0008`.
- INV-0003's index row in `index.md` is updated in place: `[status:superseded]`.
- A new index row is added for INV-0008: `[status:active]`, `[shard:invariants-architecture.md]`.
- INV-0001 REMAINS unchanged in both the shard and the index row (no supersession cascade per shared-context decision).
- INV-0008 is materialized fresh with full fields.
- Three entries co-exist in `invariants-architecture.md`: INV-0001 (superseded), INV-0003 (superseded), INV-0008 (active).
- Three rows co-exist in `index.md`: INV-0001, INV-0003 (updated to superseded), INV-0008 (new).

## Notes
Covers EC-2 + explicit "no supersession cascade" rule. Reader walking backwards from INV-0008 sees INV-0003, then INV-0001 — full chain visible. Updated from original H-04 which referenced the old monolithic `invariants.md`; now references domain-sharded shard files and index row updates.
