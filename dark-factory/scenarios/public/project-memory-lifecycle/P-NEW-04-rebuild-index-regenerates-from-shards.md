# Scenario: `--rebuild-index` flag regenerates index.md from shards, outputs diff, does not touch shards

## Type
feature

## Priority
high — primary repair tool for index corruption and ORPHANED_SHARD / PHANTOM_INDEX conditions.

## Preconditions
- `.claude/skills/df-cleanup/SKILL.md` edited.

## Action
Read df-cleanup/SKILL.md's `--rebuild-index` documentation.

## Expected Outcome
- `--rebuild-index` is documented as a standalone flag (separate from `--rebuild-memory`).
- When invoked, it: (a) scans all shard files matching `invariants-*.md`, `decisions-*.md` in `dark-factory/memory/`; (b) reads every entry heading (`## INV-NNNN` or `## DEC-NNNN`) and parses the bracket fields; (c) regenerates `index.md` from scratch.
- The flag outputs a diff of what changed in the index — added rows, removed rows, updated rows — so the developer can validate before the change takes effect.
- Shard files are NEVER touched by `--rebuild-index`.
- df-cleanup is documented as the maintenance exception writer for `index.md` — the only agent other than promote-agent that may write `index.md`, and only via this flag.
- The flag is non-destructive with respect to shard data.

## Notes
Covers FR-29b, BR-14, EC-31. The maintenance exception documentation is load-bearing — it explicitly names df-cleanup as the second permitted writer of `index.md` alongside promote-agent, and restricts this permission to the `--rebuild-index` flag only. Without this documentation, the single-writer rule (INV-TBD-a) appears violated.
