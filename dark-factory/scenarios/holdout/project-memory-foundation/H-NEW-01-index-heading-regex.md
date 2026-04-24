# Scenario: Index heading rows match the exact bracket-metadata regex

## Type
edge-case

## Priority
critical — every grep-based probe in later sub-specs relies on the precision of the index heading format. A single malformed row silently poisons all domain-filtered lookups.

## Preconditions
- `dark-factory/memory/index.md` exists.
- For this scenario's deep validation: either (a) the index ships with entries (from a future state simulation), or (b) the structural test asserts the regex for any entries that exist.

## Action
Read `dark-factory/memory/index.md`. For every line starting with `## `, apply the strict regex:
```
^## (INV|DEC|FEAT)-\d{4} \[type:(invariant|decision|feature)\] \[domain:[a-z—-]+\] \[tags:[^\]]*\] \[status:(active|superseded|deprecated|—)\] \[shard:[a-z0-9._-]+\.md\]$
```

Also verify:
- `[domain:—]` and `[status:—]` are used ONLY for FEAT entries.
- `[domain:security]`, `[domain:architecture]`, `[domain:api]` are used only for INV and DEC entries.
- `[tags:]` (empty tags) is valid.
- `[tags:auth,schema]` (comma-separated, no spaces, all lowercase) is valid.
- `[tags:AUTH,Schema]` (mixed case) is INVALID — must flag.
- Each `[shard:...]` value references a file that actually exists under `dark-factory/memory/`.

## Expected Outcome
- Every existing `## ` heading in the index body matches the regex precisely.
- FEAT entries use `[domain:—]` and `[status:—]`.
- INV/DEC entries do NOT use `—` for domain or status.
- Tag values are lowercase only.
- Every shard reference in the index points to a file that exists.
- On fresh install (zero entries): zero headings to validate — test passes trivially.

## Notes
Validates FR-3, FR-5, NFR-4, EC-11. The regex is stricter than what P-NEW-01 checks (which is the happy-path format) — this holdout tests the rejection of edge cases like mixed-case tags, unknown domain values, and shard references to non-existent files.
