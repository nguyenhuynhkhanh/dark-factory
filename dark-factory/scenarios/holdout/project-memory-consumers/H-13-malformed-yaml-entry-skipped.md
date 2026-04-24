# Scenario: Malformed YAML frontmatter in a shard — consumers skip that entry, proceed with the rest

## Type
failure-recovery

## Priority
high — partial-shard corruption must not crash the pipeline

## Preconditions
- `dark-factory/memory/index.md` exists with 5 entries listed, all claiming `[shard:invariants-architecture.md]`
- `dark-factory/memory/invariants-architecture.md` contains 5 entries
- Entry 3 in `invariants-architecture.md` has malformed YAML frontmatter (missing closing `---`, or unquoted special character)
- Entries 1, 2, 4, 5 are well-formed
- A feature pipeline runs whose spec scope maps to the architecture domain

## Action
spec-agent, architect-agents, code-agent, and debug-agent each load `dark-factory/memory/index.md` and then load `invariants-architecture.md` during Phase 1 / Phase 2 (because the scope maps to the architecture domain).

## Expected Outcome
- Each consumer logs: `"Memory file parse error: dark-factory/memory/invariants-architecture.md:<line> — skipping malformed entry, proceeding with remaining entries"`.
- Each consumer processes entries 1, 2, 4, 5 from the shard normally.
- Entry 3 is treated as non-existent — not referenced, not probed, not cross-referenced.
- The architecture-domain architect reviewer emits a SUGGESTION in its review: `"Memory file contains malformed entry at dark-factory/memory/invariants-architecture.md:<line>; recommend /df-cleanup or manual fix."`
- No consumer crashes or blocks.
- Review Status is NOT BLOCKED on the malformed entry alone.
- The index entry for the malformed entry (if present in the index) is read as normal — the index itself is not malformed. The skip applies only to the shard detail.

## Failure Mode
If a consumer crashes on malformed YAML in a shard, a single bad entry in any shard file brings down the entire pipeline for every future feature that touches that domain. The skip-and-continue pattern is the safety net — it applies at the shard level, not the whole-registry level.

## Notes
Validates EC-3 and the error handling table entry (shard context). The robustness here is important because shard files are manually editable; typos happen. The behavior is unchanged from the old monolithic-file behavior — only the file path in the log message changes from `invariants.md` to `invariants-architecture.md`.
