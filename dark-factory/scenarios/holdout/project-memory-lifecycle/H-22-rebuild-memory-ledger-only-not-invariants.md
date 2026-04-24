# Scenario: `--rebuild-memory` rebuilds ledger AND index, NEVER invariant/decision shard files

## Type
edge-case

## Priority
high — scope boundary of the flag; shard files are not auto-rebuilt.

## Preconditions
- `dark-factory/memory/invariants-architecture.md` is malformed.
- `dark-factory/memory/invariants-security.md` is valid.
- `dark-factory/memory/decisions-architecture.md` is malformed.
- `dark-factory/memory/ledger.md` is malformed.
- `dark-factory/memory/index.md` is stale (missing rows for entries in valid shards).
- `dark-factory/promoted-tests.json` has 4 entries.

## Action
`/df-cleanup --rebuild-memory` runs.

## Expected Outcome
- `ledger.md` is reconstructed with 4 FEAT entries (one per promoted-tests.json entry).
- After ledger is rebuilt, `index.md` is also rebuilt by scanning all shard files (same logic as `--rebuild-index`).
- `invariants-architecture.md` is NOT rebuilt; still malformed.
- `decisions-architecture.md` is NOT rebuilt; still malformed.
- `invariants-security.md` is NOT touched (it was valid; no changes needed).
- Output: "Ledger rebuilt from promoted-tests.json (4 entries)."
- Output: "Index rebuilt by scanning all shards."
- Output: "Invariants/decisions shard files cannot be auto-rebuilt. Run `/df-onboard` to re-extract."
- Shows the reconstructed ledger and index diff to the developer before writing.

## Notes
Covers FR-29, FR-29b, BR-14, EC-32. The original H-22 tested that only the ledger was rebuilt. This version reflects the new behavior: `--rebuild-memory` now also rebuilds the index as a second step. The invariant/decision SHARD files remain the bounded scope — the flag rebuilds derived artifacts (ledger from promoted-tests.json, index from shard scan) but never regenerates primary shard content.
