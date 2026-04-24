# Scenario: Index file excludes TEMPLATE entries — they must never appear in the index

## Type
edge-case

## Priority
critical — if a TEMPLATE entry were written to the index, every downstream consumer would count it as a real invariant/decision. This would create phantom memory that pollutes the architect probe.

## Preconditions
- `dark-factory/memory/index.md` exists.

## Action
Read `dark-factory/memory/index.md`. Scan every line for:
1. The substring `TEMPLATE` in any `## ` heading line.
2. Any heading whose ID field (text between `## ` and the first ` [`) contains `-TEMPLATE` or `-TBD-`.
3. Any heading whose ID does not match `(INV|DEC|FEAT)-\d{4}`.

Also verify:
- Shard files do NOT contain any heading using `INV-TEMPLATE:`, `DEC-TEMPLATE:`, or `FEAT-TEMPLATE:`.
- The rule or template documents that TEMPLATE entries are schema examples, not index-eligible entries.

## Expected Outcome
- Zero index heading lines contain `TEMPLATE` or `TBD-` in their ID field.
- Zero shard file headings use the `TEMPLATE` form.
- On fresh install with zero entries: zero headings in index and shards — test passes trivially.
- The template file documents the TEMPLATE-exclusion contract (agents MUST NOT write TEMPLATE entries to index or shard files).

## Notes
Validates FR-5, BR-8, DEC-TBD-h. This is the critical purity check for the index. BR-8 exists precisely because TEMPLATE entries in the old design required every consumer to implement its own TEMPLATE-filtering logic — the new design eliminates that requirement by keeping TEMPLATE out of production files entirely.
