# Scenario: index.md frontmatter has entryCount and shardCount fields

## Type
feature

## Priority
high — entryCount and shardCount allow consumers to validate index integrity without parsing the full body.

## Preconditions
- `dark-factory/memory/index.md` exists.

## Action
Parse the YAML frontmatter of `dark-factory/memory/index.md`. Check for the `entryCount` and `shardCount` keys.

## Expected Outcome
- `entryCount` key exists and has a non-negative integer value.
- `shardCount` key exists and has a non-negative integer value.
- On first install, both values are `0`.
- Both values are present in addition to the base required keys (`version`, `lastUpdated`, `generatedBy`, `gitHash`).

## Notes
Validates FR-2, FR-4. These two fields are unique to `index.md` — the six shard files and `ledger.md` do NOT include them. They are the integrity checksum that allows a quick sanity-check without parsing the full body.
