# Scenario: df-cleanup `--rebuild-memory` flag rebuilds ledger AND index from promoted-tests.json and shards

## Type
feature

## Priority
medium — recovery path when memory is malformed.

## Preconditions
- df-cleanup/SKILL.md edited.

## Action
Read df-cleanup/SKILL.md.

## Expected Outcome
- `--rebuild-memory` is documented as an optional flag (parallel to existing `--rebuild` for promoted-tests).
- When invoked, it reconstructs `dark-factory/memory/ledger.md` from `dark-factory/promoted-tests.json` entries (each promoted test entry becomes a FEAT row).
- After rebuilding the ledger, `--rebuild-memory` also rebuilds `index.md` by scanning all shard files (`invariants-*.md`, `decisions-*.md`) — this is the same logic as `--rebuild-index` invoked standalone.
- It does NOT rebuild invariant/decision shard files.
- If invoked when shard files are malformed, the flag emits: "Invariants/decisions cannot be auto-rebuilt. Run `/df-onboard` to re-extract." The index rebuild still proceeds based on whatever valid headings exist in the shards.
- The flag shows the rebuilt ledger and index diff to the developer before writing (consistent with `--rebuild`).
- `--rebuild-index` is documented as a SEPARATE flag that ONLY rebuilds the index (without rebuilding the ledger first). The two flags are independent; `--rebuild-memory` is a superset that does both.

## Notes
Covers FR-29, FR-29b, BR-14, EC-32. The index rebuild step is new compared to the original P-31. Single invocation of `--rebuild-memory` covers both ledger and index — the developer does not need to run both flags separately after a catastrophic failure.
