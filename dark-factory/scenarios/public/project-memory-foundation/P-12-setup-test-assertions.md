# Scenario: tests/dark-factory-setup.test.js asserts memory foundation structure

## Type
feature

## Priority
critical — without structural tests, regressions in later sub-specs can silently delete or corrupt memory without being caught.

## Preconditions
- `tests/dark-factory-setup.test.js` exists.

## Action
Read the setup test file and verify that it contains new assertions related to the memory foundation.

## Expected Outcome
- At least one `describe` block (or equivalent grouping) covers the memory foundation.
- Assertions exist that check:
  (a) `dark-factory/memory/` directory exists,
  (b) all eight memory files exist (`index.md`, six shards, `ledger.md`),
  (c) each file has parseable YAML frontmatter with required keys (`version`, `lastUpdated`, `generatedBy`, `gitHash`),
  (d) `index.md` frontmatter additionally contains `entryCount` and `shardCount` fields,
  (e) each shard file contains zero entries (no `## ` headings in body),
  (f) `ledger.md` contains a prominent append-only note,
  (g) `dark-factory/templates/project-memory-template.md` exists and documents every field in FR-8 / FR-9 / FR-10 including `tags` and `shard` fields,
  (h) `.claude/rules/dark-factory-context.md` references `dark-factory/memory/index.md` and does NOT reference `invariants.md` or `decisions.md` as load targets,
  (i) `dark-factory/memory/` is NOT listed in `.gitignore`,
  (j) a token-budget note is documented somewhere referencing the index soft-limit (~4,000 tokens) and per-shard soft-limit (~8,000 tokens).
- Running `node --test tests/` passes.

## Notes
Validates FR-19. The test file grows; existing tests unrelated to memory are not modified. The setup test is the structural enforcement gate for the new eight-file layout.
