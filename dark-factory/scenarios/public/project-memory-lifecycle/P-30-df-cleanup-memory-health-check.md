# Scenario: df-cleanup adds a Memory Health Check with all seven detection categories

## Type
feature

## Priority
high — mirrors existing STALE GUARD check for promoted tests; shard-aware categories are new.

## Preconditions
- `.claude/skills/df-cleanup/SKILL.md` edited.

## Action
Read df-cleanup/SKILL.md.

## Expected Outcome
- A new "Memory Health Check" step exists (suggested position: step 2.5, between Promoted Test Health Check and Identify Issues).
- The step detects and reports all seven categories:

  **Original four:**
  - `MALFORMED_MEMORY` — memory file unparseable; suggest `--rebuild-memory` for ledger or `--rebuild-index` for index.
  - `STALE_ENFORCEMENT` — an invariant's `enforced_by` test path no longer exists.
  - `STALE_SOURCE` — an entry's `sourceRef` file no longer exists.
  - `STALE_LEDGER` — a FEAT entry's `promotedTests` path doesn't match `promoted-tests.json`.

  **Three new shard-aware categories:**
  - `ORPHANED_SHARD` — an entry heading (`## INV-NNNN`) exists in a shard file but has no corresponding row in the index. Severity: WARNING. Resolution: `--rebuild-index`.
  - `PHANTOM_INDEX` — the index references an entry ID for which no shard file contains a matching heading. Severity: ERROR (data-loss condition). Resolution: `--rebuild-index`.
  - `INDEX_HASH_MISMATCH` — the index frontmatter's `gitHash` differs from the `gitHash` of one or more shard files it references. Severity: WARNING. Indicates interrupted write.

  **Token budget observability:**
  - If `entryCount` in `index.md` exceeds 500, emit WARNING: "Memory index has grown large (N entries). Consider archiving stale entries." Advisory only — does not block.

- All issues are REPORTED — never auto-fixed.
- The developer resolves manually (via `--rebuild-index` for shard/index issues, or developer intervention for malformed files).

## Notes
Covers FR-28, BR-13, EC-28, EC-29, EC-30, EC-33. Follows existing Promoted Test Health Check structure. The three new shard-aware categories are the primary addition relative to the original P-30.
