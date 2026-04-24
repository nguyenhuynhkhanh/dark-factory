# Scenario: Out-of-scope files are not touched by this spec; old monolithic files are not created

## Type
regression

## Priority
critical — scope discipline. The other three sub-specs (`project-memory-onboard`, `project-memory-consumers`, `project-memory-lifecycle`) must land on clean ground. If this spec bleeds into their territory, the wave plan breaks.

## Preconditions
- The branch that lands this spec is checked out.
- A git baseline ref (e.g., `main` or the commit before this spec) is available.

## Action
Run `git diff --name-only <baseline>..HEAD` on the branch that lands this spec. Inspect the list of changed files.

## Expected Outcome
- NO file under `.claude/agents/` is modified or added.
- NO file under `plugins/dark-factory/agents/` is modified or added.
- NO file under `.claude/skills/` is modified or added.
- NO file under `plugins/dark-factory/skills/` is modified or added.
- `dark-factory/templates/spec-template.md` is NOT modified.
- `dark-factory/templates/debug-report-template.md` is NOT modified.
- `plugins/dark-factory/templates/spec-template.md` is NOT modified.
- `plugins/dark-factory/templates/debug-report-template.md` is NOT modified.
- `dark-factory/manifest.json` is NOT modified beyond standard manifest bookkeeping if any.
- `dark-factory/promoted-tests.json` is NOT modified.
- `.claude/rules/dark-factory.md` is NOT modified.
- `plugins/dark-factory/.claude/rules/dark-factory.md` MAY only be modified to mirror the source `.claude/rules/dark-factory-context.md` change.
- **OLD monolithic filenames must NOT be created**: `dark-factory/memory/invariants.md` and `dark-factory/memory/decisions.md` MUST NOT exist in the changed file list. The new layout uses sharded files only.

## Notes
Validates AC-12, AC-13, AC-14, AC-15 and the "Files you MUST NOT touch" directive. The final bullet guards against an implementation that creates the old monolithic files alongside the new sharded files — a hybrid that would confuse downstream sub-specs.
