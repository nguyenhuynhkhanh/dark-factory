# Scenario: df-cleanup reports INDEX_HASH_MISMATCH when index and shard gitHash values diverge

## Type
failure-recovery

## Priority
high — indicates an interrupted write sequence; surfaces silently without this check.

## Preconditions
- `dark-factory/memory/index.md` has frontmatter:
  ```yaml
  gitHash: "abc123def456"
  lastUpdated: "2026-04-20T10:00:00Z"
  entryCount: 12
  ```
- `dark-factory/memory/invariants-security.md` has frontmatter:
  ```yaml
  gitHash: "def456abc789"
  lastUpdated: "2026-04-20T10:00:05Z"
  ```
- The gitHash values differ, indicating that `invariants-security.md` was written (updating its own frontmatter) but the subsequent index.md frontmatter update failed (or vice versa).
- No ORPHANED_SHARD or PHANTOM_INDEX condition exists — all entries are consistently present in both shard and index.

## Action
`/df-cleanup` runs.

## Expected Outcome
- df-cleanup's Memory Health Check reads `index.md` frontmatter gitHash (`abc123def456`).
- df-cleanup reads `invariants-security.md` frontmatter gitHash (`def456abc789`).
- The values differ.
- df-cleanup reports: "INDEX_HASH_MISMATCH: index.md gitHash `abc123def456` differs from invariants-security.md gitHash `def456abc789`. A write may have been interrupted mid-operation. Run `--rebuild-index` to resync frontmatter." Severity: WARNING.
- df-cleanup does NOT auto-fix.
- df-cleanup continues checking remaining files — this warning does not halt the health check.

## Notes
Covers FR-28, EC-30. INDEX_HASH_MISMATCH is a softer signal than ORPHANED_SHARD or PHANTOM_INDEX — it indicates potential write interruption but does not by itself prove data inconsistency (the entries themselves may be correctly present in both shard and index). `--rebuild-index` resolves it by regenerating the index from scratch, which also updates the frontmatter gitHash to match the current HEAD. This check catches the case where a write sequence was interrupted at the frontmatter-update step rather than the entry-write step.
