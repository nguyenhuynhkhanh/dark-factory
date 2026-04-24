# Scenario: H-NEW-02 — Index is generated after all shard writes; index row count matches total entry count

## Type
feature

## Priority
critical — FR-17b, BR-13. An index with mismatched row count would cause consumers to miss entries or process phantom rows.

## Preconditions
- Phase 3.7 / Phase 7 Memory Sign-Off documents index generation.
- Bootstrap write exception references index.md.

## Action
Structural test asserts the index generation documentation:
1. States that index generation occurs AFTER all shard files and ledger.md have been written (BR-13 — index is last).
2. Describes the index scan: scan ALL written shard files (all six domain shards) AND `ledger.md` to collect all entries.
3. Documents the entry count relationship: `entryCount` in the index frontmatter equals the total number of entries across all scanned files.
4. Documents that the index has exactly one heading row per entry — no entries are omitted from the index, and no phantom entries are added.
5. Documents the index frontmatter fields: at minimum `version`, `lastUpdated`, `generatedBy: onboard-agent`, `gitHash`, `entryCount`, `shardCount`.
6. Documents that `shardCount` reflects the number of non-empty shard files (not the total number of shard files).
7. If any shard write fails before index generation, the index is NOT written (BR-13 consistency invariant).

## Expected Outcome
- Post-write ordering is explicit.
- Full-scan coverage (all six shards + ledger) is documented.
- `entryCount` field documented as matching total entries.
- One-row-per-entry rule documented.
- All six frontmatter fields named.
- `shardCount` semantics (non-empty shards) documented.
- Conditional non-write on shard failure documented.

## Failure Mode (if applicable)
If the ordering invariant (index last) is absent, test fails. If the scan is described as covering only a subset of shards, test names the gap. If `entryCount` is absent from the frontmatter spec, test flags it.

## Notes
This scenario is the main correctness gate for the index. The row count match is the primary invariant — an index that reports `entryCount: 5` but contains 4 or 6 rows would be a consumer-breaking bug. `shardCount` counts non-empty shards specifically because a shard file always exists even if empty (on greenfield), and consumers use `shardCount` to understand how much data is in the registry, not how many files were created.
