# Scenario: Index entryCount frontmatter value matches actual heading row count

## Type
edge-case

## Priority
high — entryCount is the integrity checksum for the index. A mismatch means the index was partially written (crash mid-write) or manually edited without updating the counter.

## Preconditions
- `dark-factory/memory/index.md` exists.

## Action
1. Parse the YAML frontmatter of `index.md`. Read the `entryCount` and `shardCount` values.
2. Read the body of `index.md`. Count every line starting with `## ` (each is one entry row).
3. Read the shard filename values from all `[shard:...]` brackets in body heading rows. Count the distinct shard filenames referenced.
4. Compare: declared `entryCount` must equal the actual heading count; declared `shardCount` must equal the distinct shard count.

For the mutation test (simulates a mismatch):
5. Temporarily write `entryCount: 99` to `index.md` frontmatter (while body has 0 entries).
6. Run the structural test.
7. Restore the file.

## Expected Outcome
- On fresh install: `entryCount: 0` matches zero body headings; `shardCount: 0` matches zero distinct shards referenced. Test passes.
- With the mutation (entryCount: 99 but zero body headings): the structural test fails with a diagnostic message like "entryCount declared 99 but found 0 heading rows".
- The mismatch is caught at build time, not silently accepted.

## Notes
Validates FR-4, EC-7. This is a test-the-tests scenario for the integrity checksum fields. On fresh install the check trivially passes (0 == 0); the mutation test confirms the checker actually validates the relationship.
