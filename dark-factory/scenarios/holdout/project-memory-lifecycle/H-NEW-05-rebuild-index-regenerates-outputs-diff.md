# Scenario: `--rebuild-index` regenerates index from shards, outputs diff, does not touch shards

## Type
edge-case

## Priority
high — verifies the complete rebuild-index lifecycle: scan, generate, diff, write (no shard mutation).

## Preconditions
- `dark-factory/memory/invariants-architecture.md` contains:
  - `## INV-0001` (valid entry)
  - `## INV-0007` (orphaned — not in index)
- `dark-factory/memory/invariants-security.md` contains:
  - `## INV-0003` (valid entry)
- `dark-factory/memory/decisions-architecture.md` contains:
  - `## DEC-0001` (valid entry)
- `dark-factory/memory/index.md` currently contains rows for: INV-0001, INV-0003, INV-0009 (phantom — no shard), DEC-0001. Missing: INV-0007. Extra: INV-0009.
- Shard files have their own consistent frontmatter (gitHash matching their last write time).

## Action
Developer runs `/df-cleanup --rebuild-index`.

## Expected Outcome
- df-cleanup scans all shard files and collects all entry headings:
  - INV-0001 (from `invariants-architecture.md`, `[shard:invariants-architecture.md]`)
  - INV-0007 (from `invariants-architecture.md`, `[shard:invariants-architecture.md]`)
  - INV-0003 (from `invariants-security.md`, `[shard:invariants-security.md]`)
  - DEC-0001 (from `decisions-architecture.md`, `[shard:decisions-architecture.md]`)
- df-cleanup generates a new `index.md` from these entries.
- df-cleanup outputs a diff:
  ```
  Added:    INV-0007 [shard:invariants-architecture.md]
  Removed:  INV-0009 (phantom — no shard entry found)
  Unchanged: INV-0001, INV-0003, DEC-0001
  ```
- df-cleanup writes the new `index.md` (or prompts developer to confirm — document behavior).
- `invariants-architecture.md`, `invariants-security.md`, `decisions-architecture.md` are UNTOUCHED.
- `index.md` frontmatter `entryCount` is updated to 4 (INV-0001, INV-0007, INV-0003, DEC-0001).
- The ORPHANED_SHARD for INV-0007 is resolved (it now has an index row).
- The PHANTOM_INDEX for INV-0009 is resolved (its row is removed from the index).

## Failure Mode
If df-cleanup accidentally modifies a shard file during `--rebuild-index`, that is a critical bug (BR-16, FR-29b). The check must verify shard file modification times are unchanged.

## Notes
Covers FR-29b, EC-31. This scenario exercises the full `--rebuild-index` flow against a realistic mixed state (orphan + phantom + valid entries). The diff output is the developer's validation gate before the new index is committed. This scenario is holdout because the code-agent should not see the exact diff format expected — that format should be derived from the spec, not from this scenario.
