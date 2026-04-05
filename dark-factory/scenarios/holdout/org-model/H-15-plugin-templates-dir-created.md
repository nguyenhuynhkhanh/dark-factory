# Scenario: Plugin directory includes template files for distribution

## Type
feature

## Priority
medium — plugins are the distribution mechanism; templates must be included

## Preconditions
- Phase 1 implementation is complete
- Plugin structure at `plugins/dark-factory/` exists

## Action
Check whether `plugins/dark-factory/templates/` directory exists and contains the 3 template files:
- `plugins/dark-factory/templates/spec-template.md`
- `plugins/dark-factory/templates/debug-report-template.md`
- `plugins/dark-factory/templates/project-profile-template.md`

## Expected Outcome
- The templates directory exists under the plugin structure
- All 3 template files are present and identical to their source counterparts in `dark-factory/templates/`

## Notes
If the plugin structure does not support a `templates/` directory, this should be documented as a known gap.
