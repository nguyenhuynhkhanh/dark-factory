# Scenario: tests/dark-factory-setup.test.js contains assertions for slim file generation

## Type
feature

## Priority
critical — without tests, any future refactor of agent files can silently remove the slim-generation step.

## Preconditions
- `tests/dark-factory-setup.test.js` has been updated with the new assertions.

## Action
Read `tests/dark-factory-setup.test.js` and check for slim-context assertions.

## Expected Outcome
- The test file contains at least one `describe` block dedicated to slim file generation (e.g., "Slim context generation — token-opt-slim-context").
- Within that block, `it` assertions cover:
  - onboard-agent mentions `project-profile-slim.md`
  - codemap-agent mentions `code-map-slim.md`
  - codemap-agent states slim map carries same git hash as full map
  - codemap-agent excludes out-of-scope sections from slim map
  - onboard-agent references the slim template
  - slim template file exists at `dark-factory/templates/project-profile-slim-template.md`
  - df-cleanup mentions slim file refresh
- `node --test tests/dark-factory-setup.test.js` passes (all new assertions pass).

## Notes
Validates FR-16, AC-10. The test file is the production quality gate for agent definition correctness.
