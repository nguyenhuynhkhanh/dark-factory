# Scenario: Plugin mirrors match source for all new/changed templates and rule

## Type
feature

## Priority
critical — plugin mirror is the distribution target; any drift breaks the installed framework in user projects.

## Preconditions
- Source files exist at `dark-factory/templates/project-memory-template.md`, `dark-factory/templates/project-profile-template.md`, `.claude/rules/dark-factory-context.md`.
- Plugin mirror files exist at `plugins/dark-factory/templates/project-memory-template.md`, `plugins/dark-factory/templates/project-profile-template.md`, `plugins/dark-factory/rules/dark-factory-context.md`.

## Action
For each source file, read its content. Read the corresponding plugin file. Compare byte-for-byte.

1. `dark-factory/templates/project-memory-template.md` == `plugins/dark-factory/templates/project-memory-template.md`
2. `dark-factory/templates/project-profile-template.md` == `plugins/dark-factory/templates/project-profile-template.md`
3. `.claude/rules/dark-factory-context.md` == `plugins/dark-factory/rules/dark-factory-context.md`

## Expected Outcome
- All three byte-for-byte comparisons match exactly.
- `tests/dark-factory-contracts.test.js` contains an assertion referencing `project-memory-template.md` mirror parity.
- `node --test tests/` passes.

## Notes
Validates FR-16, FR-20, BR-7. The plugin mirror path for the context rule is `plugins/dark-factory/rules/dark-factory-context.md` (note: no `.claude/` prefix — this is the established layout for the plugin mirror). Contract tests already run literal byte comparison for agents and skills; this scenario extends the same pattern to the new memory template and rule change.
