# Scenario: df-cleanup detects ORPHANED_SHARD and reports it without auto-fixing

## Type
feature

## Priority
high — ORPHANED_SHARD is the expected partial-failure state; detection is essential.

## Preconditions
- `.claude/skills/df-cleanup/SKILL.md` edited.

## Action
Read df-cleanup/SKILL.md.

## Expected Outcome
- df-cleanup/SKILL.md documents the `ORPHANED_SHARD` check: scan all shard files for entry headings (`## INV-NNNN`, `## DEC-NNNN`), then verify each heading has a corresponding row in `index.md`.
- Any heading without a corresponding index row is reported as `ORPHANED_SHARD`.
- The report message format is: "ORPHANED_SHARD: {entry-id} found in {shard-filename} but missing from index.md. Run `--rebuild-index` to repair."
- Severity is documented as WARNING.
- The issue is REPORTED — not auto-fixed. The shard file is never touched.
- The prescribed resolution is `--rebuild-index`.

## Notes
Covers FR-28, BR-13, EC-28. The ORPHANED_SHARD condition is the expected result of promote-agent's shard-first, index-last write ordering when the index update fails. df-cleanup's role is detection; `--rebuild-index` is the repair tool. This public scenario validates the documentation structure; H-NEW-02 tests the actual detection behavior against seeded state.
