# Scenario: index.md ships with correct heading-per-row format (empty on first install)

## Type
feature

## Priority
critical — the index format is the contract that every downstream agent and grep-based probe relies on.

## Preconditions
- `dark-factory/memory/index.md` exists.

## Action
Read `dark-factory/memory/index.md`. Inspect:
1. The frontmatter.
2. The body after the closing `---` delimiter.
3. Any `## ` heading lines present.

## Expected Outcome
- The frontmatter is valid and contains `version`, `lastUpdated`, `generatedBy`, `gitHash`, `entryCount`, `shardCount`.
- On first install: the body contains zero `## ` heading lines. `entryCount: 0` and `shardCount: 0` in frontmatter match this.
- If any heading rows exist (in a future state where entries have been written), each row must match the format:
  ```
  ## {ID} [type:{type}] [domain:{domain}] [tags:{csv}] [status:{status}] [shard:{filename}]
  ```
  where `{ID}` is `INV-\d{4}`, `DEC-\d{4}`, or `FEAT-\d{4}`.
- The file body does NOT contain any heading in the form `## INV-TEMPLATE` or `## DEC-TEMPLATE`.

## Notes
Validates FR-3, FR-5. The index is the "table of contents" for all memory entries. Heading format precision is load-bearing for grep-based probes.
