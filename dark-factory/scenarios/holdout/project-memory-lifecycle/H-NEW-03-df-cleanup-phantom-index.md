# Scenario: df-cleanup reports PHANTOM_INDEX when index row exists but no shard has matching entry

## Type
failure-recovery

## Priority
critical — PHANTOM_INDEX is a data-loss condition; detection prevents compounding the problem.

## Preconditions
- `dark-factory/memory/index.md` contains a row for INV-0009:
  ```
  ## INV-0009 [type:invariant] [domain:architecture] [tags:spec] [status:active] [shard:invariants-architecture.md]
  Some invariant text
  ```
- `dark-factory/memory/invariants-architecture.md` does NOT contain a `## INV-0009` heading.
- No other shard file (`invariants-security.md`, `invariants-api.md`, `decisions-*.md`) contains `## INV-0009`.
- This state could arise if someone manually deleted the shard entry, or if an index-first write (the WRONG ordering) created the row before the shard write failed.

## Action
`/df-cleanup` runs.

## Expected Outcome
- df-cleanup's Memory Health Check reads `index.md` and finds the row for INV-0009.
- df-cleanup scans all shard files and finds no `## INV-0009` heading in any file.
- df-cleanup reports: "PHANTOM_INDEX: INV-0009 referenced in index.md but not found in any shard. This is a data-loss condition. Run `--rebuild-index` to remove the phantom row." Severity: ERROR.
- df-cleanup does NOT auto-fix.
- df-cleanup does NOT attempt to create a new shard entry for INV-0009 (the actual content has been lost; hallucinating it would be worse).

## Recovery Outcome (after developer runs `--rebuild-index`)
- `--rebuild-index` scans all shards, finds no INV-0009, generates a new `index.md` without the INV-0009 row.
- Output diff shows: "Removed phantom row: INV-0009."
- The actual INV-0009 content (the invariant rule, metadata, etc.) is permanently lost and cannot be recovered by df-cleanup. The developer must consult git history or re-onboard to recover it.

## Notes
Covers FR-28, EC-29. PHANTOM_INDEX is the data-loss failure mode that shard-first write ordering is designed to prevent — the whole reason for writing shard first is to ensure that if anything fails, the worst case is ORPHANED_SHARD (detectable, repairable) rather than PHANTOM_INDEX (data loss). This scenario tests df-cleanup's ability to detect the PHANTOM_INDEX condition when it does arise (e.g., manual editing, or a hypothetical index-first write bug).
